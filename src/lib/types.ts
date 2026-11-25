export type ViewMode = "chat" | "compare" | "analyzer" | "library";

export type ConnectionStatus = "connecting" | "ready" | "working" | "error";

export type ReasoningEffort = "low" | "medium" | "high";

export interface RunSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  reasoningEffort: ReasoningEffort;
  jsonMode: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxCompletionTokens: number;
  supportsReasoning: boolean;
  speedTag: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  createdAt: number;
  model?: string;
  stats?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
    tokensPerSecond?: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  systemPrompt: string;
  messages: ChatMessage[];
  settings: RunSettings;
  createdAt: number;
  updatedAt: number;
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export interface AnalysisIssue {
  title: string;
  severity: "low" | "medium" | "high";
  detail: string;
  mitigation?: string;
}

export interface PromptAnalysisResult {
  overallScore: number;
  clarityScore: number;
  safetyScore: number;
  summary: string;
  clarityFindings: string[];
  risks: AnalysisIssue[];
  injectionIssues: AnalysisIssue[];
  suggestedRewrite: {
    systemPrompt: string;
    userPrompt: string;
    rationale: string;
  };
}

export interface StreamUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  tokensPerSecond: number;
}
