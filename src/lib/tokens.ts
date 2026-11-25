import type { ChatMessage } from "./types";

/**
 * Fast, deterministic client-side token estimator (~4 chars per token + per-message overhead)
 * used for live input token estimation and context-window usage visualization.
 */
export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Blend character count and word/punctuation heuristics for closer BPE approximation
  const charEstimate = Math.ceil(trimmed.length / 3.8);
  const words = trimmed.split(/\s+/).length;
  const wordEstimate = Math.ceil(words * 1.33);
  return Math.max(1, Math.round((charEstimate + wordEstimate) / 2));
}

export function estimateRequestInputTokens(
  systemPrompt: string,
  messages: Pick<ChatMessage, "role" | "content">[],
  draftUserPrompt: string
): number {
  let total = 3; // base priming overhead
  if (systemPrompt.trim()) {
    total += 4 + estimateTextTokens(systemPrompt);
  }
  for (const msg of messages) {
    total += 4 + estimateTextTokens(msg.content);
  }
  if (draftUserPrompt.trim()) {
    total += 4 + estimateTextTokens(draftUserPrompt);
  }
  return total;
}

export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }
  return String(count);
}
