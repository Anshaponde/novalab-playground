import type { ModelInfo, RunSettings } from "./types";

export const GROQ_MODELS: ModelInfo[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    provider: "Meta",
    contextWindow: 131072,
    maxCompletionTokens: 32768,
    supportsReasoning: false,
    speedTag: "Balanced",
    description: "Flagship general-purpose model for complex reasoning, coding, and structured output.",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: "Meta",
    contextWindow: 131072,
    maxCompletionTokens: 131072,
    supportsReasoning: false,
    speedTag: "Ultra-fast",
    description: "Sub-second low-latency model built for real-time UX and rapid iteration.",
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "OpenAI",
    contextWindow: 131072,
    maxCompletionTokens: 65536,
    supportsReasoning: true,
    speedTag: "Reasoning",
    description: "High-capacity open-weight reasoning model supporting adjustable reasoning effort.",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    provider: "OpenAI",
    contextWindow: 131072,
    maxCompletionTokens: 65536,
    supportsReasoning: true,
    speedTag: "Fast Reasoning",
    description: "Compact open-weight reasoning model with configurable reasoning effort.",
  },
  {
    id: "qwen/qwen3-32b",
    name: "Qwen 3 32B",
    provider: "Alibaba",
    contextWindow: 131072,
    maxCompletionTokens: 40960,
    supportsReasoning: true,
    speedTag: "Reasoning",
    description: "Strong multilingual, analytical, and coding performance with reasoning support.",
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B",
    provider: "Meta",
    contextWindow: 131072,
    maxCompletionTokens: 8192,
    supportsReasoning: false,
    speedTag: "MoE Fast",
    description: "Mixture-of-experts instruction model tuned for crisp formatting and speed.",
  },
];

export const DEFAULT_MODEL_ID = "llama-3.3-70b-versatile";

export const DEFAULT_RUN_SETTINGS: RunSettings = {
  model: DEFAULT_MODEL_ID,
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
  reasoningEffort: "medium",
  jsonMode: false,
};

export const DEFAULT_SYSTEM_PROMPT =
  "You are NovaLab Assistant, a concise, precise, and helpful engineering AI. Format code blocks clearly and explain reasoning step by step when helpful.";

export function getModelInfo(modelId: string): ModelInfo {
  return (
    GROQ_MODELS.find((m) => m.id === modelId) ?? {
      id: modelId,
      name: modelId,
      provider: "Groq",
      contextWindow: 32768,
      maxCompletionTokens: 8192,
      supportsReasoning: false,
      speedTag: "Custom",
      description: "Custom Groq model endpoint.",
    }
  );
}
