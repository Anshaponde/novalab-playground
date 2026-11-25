import type { RunSettings, StreamUsageStats } from "./types";

export interface StreamChatOptions {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string;
  settings: RunSettings;
  signal?: AbortSignal;
  onDelta: (delta: { content: string; reasoning: string }) => void;
  onLiveTps?: (tps: number) => void;
}

export async function streamChatCompletion(
  options: StreamChatOptions
): Promise<StreamUsageStats> {
  const { messages, systemPrompt, settings, signal, onDelta, onLiveTps } = options;
  const startTime = performance.now();
  let approxChars = 0;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, systemPrompt, settings }),
    signal,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.error) message = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Response stream was empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalUsage: StreamUsageStats | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const block of events) {
        const lines = block.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payloadStr = line.slice(5).trim();
          if (!payloadStr) continue;

          const parsed = JSON.parse(payloadStr);
          if (parsed.type === "delta") {
            const content = typeof parsed.content === "string" ? parsed.content : "";
            const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";
            if (content || reasoning) {
              approxChars += content.length + reasoning.length;
              onDelta({ content, reasoning });
              if (onLiveTps) {
                const elapsedSec = Math.max(0.05, (performance.now() - startTime) / 1000);
                const estTokens = Math.max(1, approxChars / 4);
                onLiveTps(Number((estTokens / elapsedSec).toFixed(1)));
              }
            }
          } else if (parsed.type === "done" && parsed.usage) {
            finalUsage = parsed.usage as StreamUsageStats;
          } else if (parsed.type === "error") {
            throw new Error(parsed.error || "Streaming error occurred.");
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const elapsedMs = Math.max(1, Math.round(performance.now() - startTime));
  if (finalUsage) {
    return finalUsage;
  }
  const fallbackCompletion = Math.max(1, Math.round(approxChars / 4));
  return {
    promptTokens: 0,
    completionTokens: fallbackCompletion,
    totalTokens: fallbackCompletion,
    latencyMs: elapsedMs,
    tokensPerSecond: Number((fallbackCompletion / (elapsedMs / 1000)).toFixed(1)),
  };
}
