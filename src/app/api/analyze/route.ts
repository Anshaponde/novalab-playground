import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import type { PromptAnalysisResult } from "@/lib/types";

export const runtime = "nodejs";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

const ANALYZER_SYSTEM_PROMPT = `You are NovaLab Prompt Auditor, a senior LLM security and prompt engineering specialist.
Evaluate the supplied system prompt (if any) and user prompt for:
1. Clarity & specificity (ambiguities, missing constraints, output format gaps, conflicting instructions).
2. Operational & reliability risks (hallucination triggers, unbounded output, fragile assumptions, PII/secret leakage risk).
3. Prompt-injection vulnerabilities (untrusted input interpolation, role override susceptibility, delimiter weakness, instruction hierarchy gaps).
4. A concrete, hardened rewrite of both systemPrompt and userPrompt.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "overallScore": number (0-100),
  "clarityScore": number (0-100),
  "safetyScore": number (0-100),
  "summary": string,
  "clarityFindings": string[],
  "risks": [
    { "title": string, "severity": "low" | "medium" | "high", "detail": string, "mitigation": string }
  ],
  "injectionIssues": [
    { "title": string, "severity": "low" | "medium" | "high", "detail": string, "mitigation": string }
  ],
  "suggestedRewrite": {
    "systemPrompt": string,
    "userPrompt": string,
    "rationale": string
  }
}`;

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

  let body: { prompt?: string; systemPrompt?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const systemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";

  if (!prompt && !systemPrompt) {
    return NextResponse.json(
      { error: "Provide a prompt or system prompt to analyze." },
      { status: 400 }
    );
  }

  const model =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : DEFAULT_MODEL_ID;

  const targetPayload = [
    systemPrompt ? `### SYSTEM PROMPT TO AUDIT\n${systemPrompt}` : null,
    prompt ? `### USER PROMPT TO AUDIT\n${prompt}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const startTime = Date.now();

  try {
    const upstreamResponse = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: ANALYZER_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze the following prompt specification and return JSON:\n\n${targetPayload}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
      signal: req.signal,
    });

    if (!upstreamResponse.ok) {
      let errorDetail = `Groq API returned HTTP ${upstreamResponse.status}`;
      try {
        const errJson = await upstreamResponse.json();
        if (errJson?.error?.message) {
          errorDetail = errJson.error.message;
        }
      } catch {
        // ignore
      }
      return NextResponse.json(
        { error: errorDetail },
        { status: upstreamResponse.status >= 400 ? upstreamResponse.status : 502 }
      );
    }

    const data = await upstreamResponse.json();
    const rawContent = data?.choices?.[0]?.message?.content ?? "{}";
    let analysis: PromptAnalysisResult;

    try {
      analysis = JSON.parse(rawContent) as PromptAnalysisResult;
    } catch {
      return NextResponse.json(
        { error: "Model returned non-JSON analysis payload." },
        { status: 502 }
      );
    }

    const latencyMs = Math.max(1, Date.now() - startTime);
    const usage = data?.usage ?? {};

    return NextResponse.json({
      analysis,
      usage: {
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
        latencyMs,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze prompt.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
