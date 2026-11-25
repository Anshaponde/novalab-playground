import { DEFAULT_RUN_SETTINGS, DEFAULT_SYSTEM_PROMPT } from "./models";
import type { ChatSession, PromptTemplate } from "./types";

const CHATS_STORAGE_KEY = "novalab_playground_chats_v1";
const ACTIVE_CHAT_STORAGE_KEY = "novalab_playground_active_chat_v1";
const TEMPLATES_STORAGE_KEY = "novalab_playground_templates_v1";
const TEMPLATES_SEEDED_KEY = "novalab_playground_templates_seeded_v1";
const THEME_STORAGE_KEY = "novalab_playground_theme_v1";

export const STARTER_TEMPLATES: PromptTemplate[] = [
  {
    id: "tpl-api-spec",
    title: "REST API Contract Reviewer",
    category: "Engineering",
    description: "Audits an endpoint schema for edge cases, idempotency, and error semantics.",
    systemPrompt:
      "You are a principal backend architect. Review API specifications strictly for REST semantics, validation edge cases, pagination, idempotency, and HTTP status accuracy. Output concise bullet points grouped by Critical, Warning, and Suggestion.",
    userPrompt:
      "Review this endpoint proposal:\nPOST /v1/orders/{id}/refund\nBody: { amount?: number, reason: string }\nReturns: 200 OK { refunded: true }",
    createdAt: 1730000000000,
    updatedAt: 1730000000000,
  },
  {
    id: "tpl-json-extractor",
    title: "Strict JSON Entity Extractor",
    category: "Data",
    description: "Transforms unstructured incident notes into clean JSON records.",
    systemPrompt:
      "You extract structured incident metadata as valid JSON only. Never invent fields. Return keys: service (string), severity (sev1|sev2|sev3|sev4), rootCause (string|null), actionItems (string[]).",
    userPrompt:
      "Incident note: Checkout latency spiked to 4.2s on eu-west-1 around 14:20 UTC after deploying redis-pool v2.4. Rollback restored p99 latency. Need load test before re-deploy.",
    createdAt: 1730000001000,
    updatedAt: 1730000001000,
  },
  {
    id: "tpl-sql-optimizer",
    title: "Postgres Query & Index Advisor",
    category: "Database",
    description: "Identifies sequential scan bottlenecks and proposes composite indexes.",
    systemPrompt:
      "You are a PostgreSQL performance specialist. Given a query and table shape, pinpoint why scans slow down and propose minimal covering or composite indexes with brief trade-off notes.",
    userPrompt:
      "Table events(id, org_id, event_type, created_at, payload).\nQuery: SELECT id, event_type FROM events WHERE org_id = $1 AND created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 50;",
    createdAt: 1730000002000,
    updatedAt: 1730000002000,
  },
];

export function createNewChatSession(partial?: Partial<ChatSession>): ChatSession {
  const now = Date.now();
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `chat-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: "Untitled Session",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    messages: [],
    settings: { ...DEFAULT_RUN_SETTINGS },
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function loadChats(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHATS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChats(chats: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadActiveChatId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveChatId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, id);
  } catch {
    // Ignore
  }
}

export function loadTemplates(): PromptTemplate[] {
  if (typeof window === "undefined") return STARTER_TEMPLATES;
  try {
    const seeded = window.localStorage.getItem(TEMPLATES_SEEDED_KEY);
    const raw = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!seeded && !raw) {
      window.localStorage.setItem(TEMPLATES_SEEDED_KEY, "1");
      window.localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(STARTER_TEMPLATES));
      return STARTER_TEMPLATES;
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return STARTER_TEMPLATES;
  }
}

export function saveTemplates(templates: PromptTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEMPLATES_SEEDED_KEY, "1");
    window.localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Ignore
  }
}

export function loadThemePreference(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveThemePreference(theme: "dark" | "light"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore
  }
}
