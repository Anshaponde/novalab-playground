import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MODEL_ID, getModelInfo } from "@/lib/models";
import type { RunSettings } from "@/lib/types";

export const runtime = "nodejs";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

interface IncomingMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages?: IncomingMessage[];
  systemPrompt?: string;
  settings?: Partial<RunSettings>;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY is not configured on the server. Add GROQ_API_KEY to .env.local (or Vercel Environment Variables) and restart.",
      },
      { status: 503 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
  if (incomingMessages.length === 0) {
    return NextResponse.json(
      { error: "At least one message is required." },
      { status: 400 }
    );
  }

  const settings = body.settings ?? {};
  const model = typeof settings.model === "string" && settings.model.trim()
    ? settings.model.trim()
    : DEFAULT_MODEL_ID;
  const modelInfo = getModelInfo(model);

  const temperature =
    typeof settings.temperature === "number"
      ? Math.min(2, Math.max(0, settings.temperature))
      : 0.7;
  const maxTokens =
    typeof settings.maxTokens === "number"
      ? Math.min(modelInfo.maxCompletionTokens, Math.max(1, Math.round(settings.maxTokens)))
      : 2048;
  const topP =
    typeof settings.topP === "number"
      ? Math.min(1, Math.max(0.01, settings.topP))
      : 0.95;
  const jsonMode = Boolean(settings.jsonMode);
  const reasoningEffort =
    settings.reasoningEffort === "low" ||
    settings.reasoningEffort === "medium" ||
    settings.reasoningEffort === "high"
      ? settings.reasoningEffort
      : "medium";

  const apiMessages: IncomingMessage[] = [];
  let systemContent = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";

  const hasJsonKeyword =
    /json/i.test(systemContent) ||
    incomingMessages.some((m) => /json/i.test(m.content));

  if (jsonMode && !hasJsonKeyword) {
    systemContent = systemContent
      ? `${systemContent}\n\nRespond with valid JSON.`
      : "Respond with valid JSON.";
  }

  if (systemContent) {
    apiMessages.push({ role: "system", content: systemContent });
  }

  for (const msg of incomingMessages) {
    if (
      (msg.role === "user" || msg.role === "assistant") &&
      typeof msg.content === "string"
    ) {
      apiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const payload: Record<string, unknown> = {
    model,
    messages: apiMessages,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (modelInfo.supportsReasoning) {
    payload.reasoning_effort = reasoningEffort;
  }

  if (jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const startTime = Date.now();

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: req.signal,
    });
  } catch (err) {
    if (req.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    const message = err instanceof Error ? err.message : "Failed to reach Groq API.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    let errorDetail = `Groq API returned HTTP ${upstreamResponse.status}`;
    try {
      const errJson = await upstreamResponse.json();
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {
      // ignore non-json error body
    }
    return NextResponse.json(
      { error: errorDetail },
      { status: upstreamResponse.status >= 400 ? upstreamResponse.status : 502 }
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamResponse.body!.getReader();
      let buffer = "";
      let completionChars = 0;
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;

      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || !line.startsWith("data:")) continue;
            const dataStr = line.slice(5).trim();
            if (dataStr === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const choice = parsed?.choices?.[0];
              const deltaContent = choice?.delta?.content ?? "";
              const deltaReasoning =
                choice?.delta?.reasoning ?? choice?.delta?.reasoning_content ?? "";

              if (deltaContent || deltaReasoning) {
                completionChars += deltaContent.length + deltaReasoning.length;
                sendEvent({
                  type: "delta",
                  content: deltaContent,
                  reasoning: deltaReasoning,
                });
              }

              const usage = parsed?.usage ?? parsed?.x_groq?.usage;
              if (usage) {
                promptTokens = usage.prompt_tokens ?? promptTokens;
                completionTokens = usage.completion_tokens ?? completionTokens;
                totalTokens = usage.total_tokens ?? totalTokens;
              }
            } catch {
              // skip malformed SSE chunks
            }
          }
        }

        const latencyMs = Math.max(1, Date.now() - startTime);
        const effectiveCompletionTokens =
          completionTokens > 0 ? completionTokens : Math.max(1, Math.round(completionChars / 4));
        const tokensPerSecond = Number(
          (effectiveCompletionTokens / (latencyMs / 1000)).toFixed(1)
        );

        sendEvent({
          type: "done",
          usage: {
            promptTokens,
            completionTokens: effectiveCompletionTokens,
            totalTokens: totalTokens || promptTokens + effectiveCompletionTokens,
            latencyMs,
            tokensPerSecond,
          },
        });
      } catch (err) {
        if (!req.signal.aborted) {
          const message = err instanceof Error ? err.message : "Stream interrupted";
          sendEvent({ type: "error", error: message });
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
