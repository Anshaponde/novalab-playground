"use client";

import React, { useEffect, useRef, useState } from "react";
import { Award, Check, Copy, Play, Square, Zap } from "lucide-react";
import { DEFAULT_RUN_SETTINGS, DEFAULT_SYSTEM_PROMPT, GROQ_MODELS, getModelInfo } from "@/lib/models";
import { streamChatCompletion } from "@/lib/stream";
import type { ConnectionStatus, ReasoningEffort, RunSettings, StreamUsageStats } from "@/lib/types";
import { MarkdownLite } from "./MarkdownLite";

interface CompareViewProps {
  onStatusChange: (status: ConnectionStatus) => void;
  onLiveTpsChange: (tps: number | null) => void;
}

interface CompareLaneState {
  settings: RunSettings;
  output: string;
  reasoning: string;
  running: boolean;
  error: string | null;
  stats: StreamUsageStats | null;
  liveTps: number;
}

function createInitialLane(modelId: string, temperature = 0.7): CompareLaneState {
  return {
    settings: { ...DEFAULT_RUN_SETTINGS, model: modelId, temperature },
    output: "",
    reasoning: "",
    running: false,
    error: null,
    stats: null,
    liveTps: 0,
  };
}

export function CompareView({ onStatusChange, onLiveTpsChange }: CompareViewProps) {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [userPrompt, setUserPrompt] = useState(
    "Compare event-driven microservices vs a modular monolith for a 10-person engineering team launching a SaaS analytics platform. Be concise and structured."
  );

  const [laneA, setLaneA] = useState<CompareLaneState>(() =>
    createInitialLane("llama-3.3-70b-versatile", 0.7)
  );
  const [laneB, setLaneB] = useState<CompareLaneState>(() =>
    createInitialLane("llama-3.1-8b-instant", 0.3)
  );
  const [copiedLane, setCopiedLane] = useState<"A" | "B" | null>(null);

  const abortARef = useRef<AbortController | null>(null);
  const abortBRef = useRef<AbortController | null>(null);

  const isRunning = laneA.running || laneB.running;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRunning) {
        e.preventDefault();
        abortARef.current?.abort();
        abortBRef.current?.abort();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRunning]);

  const runComparison = async () => {
    if (!userPrompt.trim() || isRunning) return;

    const controllerA = new AbortController();
    const controllerB = new AbortController();
    abortARef.current = controllerA;
    abortBRef.current = controllerB;

    onStatusChange("working");
    onLiveTpsChange(0);

    setLaneA((prev) => ({
      ...prev,
      output: "",
      reasoning: "",
      running: true,
      error: null,
      stats: null,
      liveTps: 0,
    }));
    setLaneB((prev) => ({
      ...prev,
      output: "",
      reasoning: "",
      running: true,
      error: null,
      stats: null,
      liveTps: 0,
    }));

    const runLane = async (
      laneSettings: RunSettings,
      controller: AbortController,
      setLane: React.Dispatch<React.SetStateAction<CompareLaneState>>
    ) => {
      try {
        const usage = await streamChatCompletion({
          messages: [{ role: "user", content: userPrompt.trim() }],
          systemPrompt,
          settings: laneSettings,
          signal: controller.signal,
          onLiveTps: (tps) => {
            setLane((prev) => ({ ...prev, liveTps: tps }));
            onLiveTpsChange(tps);
          },
          onDelta: ({ content, reasoning }) => {
            setLane((prev) => ({
              ...prev,
              output: prev.output + content,
              reasoning: prev.reasoning + reasoning,
            }));
          },
        });
        setLane((prev) => ({
          ...prev,
          running: false,
          stats: usage,
          liveTps: usage.tokensPerSecond,
        }));
      } catch (err) {
        if (controller.signal.aborted) {
          setLane((prev) => ({ ...prev, running: false }));
        } else {
          const message = err instanceof Error ? err.message : "Failed to run model.";
          setLane((prev) => ({ ...prev, running: false, error: message }));
        }
      }
    };

    await Promise.all([
      runLane(laneA.settings, controllerA, setLaneA),
      runLane(laneB.settings, controllerB, setLaneB),
    ]);

    abortARef.current = null;
    abortBRef.current = null;
    onStatusChange("ready");
  };

  const stopComparison = () => {
    abortARef.current?.abort();
    abortBRef.current?.abort();
  };

  const fasterLane =
    laneA.stats && laneB.stats
      ? laneA.stats.latencyMs <= laneB.stats.latencyMs
        ? "A"
        : "B"
      : null;

  const copyOutput = async (which: "A" | "B", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLane(which);
      setTimeout(() => setCopiedLane(null), 1500);
    } catch {
      // ignore
    }
  };

  const renderLane = (
    label: "A" | "B",
    lane: CompareLaneState,
    setLane: React.Dispatch<React.SetStateAction<CompareLaneState>>
  ) => {
    const modelInfo = getModelInfo(lane.settings.model);
    const isFaster = fasterLane === label;

    return (
      <div className="neon-gradient-border flex flex-col rounded-2xl p-4 min-h-[420px]">
        {/* Lane Config Header */}
        <div className="space-y-3 border-b border-[var(--nl-border-subtle)] pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-lg font-mono text-xs font-bold text-white ${
                  label === "A"
                    ? "bg-gradient-to-br from-[#8B5CF6] to-[#EC4899]"
                    : "bg-gradient-to-br from-[#22D3EE] to-[#8B5CF6]"
                }`}
              >
                {label}
              </span>
              <span className="text-sm font-semibold text-[var(--nl-text)]">
                Model {label}
              </span>
              {isFaster && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#22D3EE]/50 bg-[#22D3EE]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#22D3EE]">
                  <Award className="h-3 w-3" /> Fastest
                </span>
              )}
            </div>

            {lane.output && (
              <button
                type="button"
                onClick={() => copyOutput(label, lane.output)}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--nl-border-subtle)] px-2 py-1 text-[11px] text-[var(--nl-text-muted)] hover:text-[var(--nl-text)]"
              >
                {copiedLane === label ? (
                  <Check className="h-3 w-3 text-[#22D3EE]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copy
              </button>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={lane.settings.model}
              onChange={(e) =>
                setLane((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, model: e.target.value },
                }))
              }
              className="neon-focus rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-2.5 py-2 text-xs text-[var(--nl-text)]"
            >
              {GROQ_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col justify-center rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-2.5 py-1">
                <span className="text-[10px] text-[var(--nl-text-muted)]">
                  Temp: <strong className="font-mono text-[#22D3EE]">{lane.settings.temperature.toFixed(1)}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={lane.settings.temperature}
                  onChange={(e) =>
                    setLane((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        temperature: parseFloat(e.target.value),
                      },
                    }))
                  }
                  className="w-full accent-[#8B5CF6]"
                />
              </label>

              <label className="flex flex-col justify-center rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-2.5 py-1">
                <span className="text-[10px] text-[var(--nl-text-muted)]">
                  Max: <strong className="font-mono text-[#EC4899]">{lane.settings.maxTokens}</strong>
                </span>
                <input
                  type="range"
                  min={256}
                  max={4096}
                  step={256}
                  value={Math.min(4096, lane.settings.maxTokens)}
                  onChange={(e) =>
                    setLane((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        maxTokens: parseInt(e.target.value, 10),
                      },
                    }))
                  }
                  className="w-full accent-[#EC4899]"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--nl-text-muted)]">Reasoning:</span>
              {(["low", "medium", "high"] as ReasoningEffort[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() =>
                    setLane((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, reasoningEffort: lvl },
                    }))
                  }
                  className={`rounded-md px-2 py-0.5 capitalize transition-colors ${
                    lane.settings.reasoningEffort === lvl
                      ? "bg-[#8B5CF6]/30 text-[#22D3EE] border border-[#8B5CF6]/50"
                      : "text-[var(--nl-text-muted)] hover:text-[var(--nl-text)]"
                  }`}
                >
                  {lvl}
                </button>
              ))}
              {!modelInfo.supportsReasoning && (
                <span className="text-[10px] text-[var(--nl-text-muted)]">(std)</span>
              )}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--nl-text-muted)]">
              <input
                type="checkbox"
                checked={lane.settings.jsonMode}
                onChange={(e) =>
                  setLane((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, jsonMode: e.target.checked },
                  }))
                }
                className="accent-[#22D3EE]"
              />
              JSON mode
            </label>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="my-2.5 grid grid-cols-4 gap-2 rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-2 font-mono text-[11px]">
          <div>
            <div className="text-[10px] text-[var(--nl-text-muted)]">Latency</div>
            <div className="font-semibold text-[#22D3EE]">
              {lane.stats ? `${(lane.stats.latencyMs / 1000).toFixed(2)}s` : lane.running ? "..." : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--nl-text-muted)]">Speed</div>
            <div className="font-semibold text-[#EC4899]">
              {lane.stats
                ? `${lane.stats.tokensPerSecond} t/s`
                : lane.running
                  ? `${lane.liveTps} t/s`
                  : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--nl-text-muted)]">Input</div>
            <div className="font-semibold text-[var(--nl-text)]">
              {lane.stats ? lane.stats.promptTokens : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--nl-text-muted)]">Output</div>
            <div className="font-semibold text-[var(--nl-text)]">
              {lane.stats ? lane.stats.completionTokens : "—"}
            </div>
          </div>
        </div>

        {/* Output Pane */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-3.5">
          {lane.error ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {lane.error}
            </div>
          ) : lane.output ? (
            <MarkdownLite content={lane.output} />
          ) : lane.running ? (
            <div className="flex items-center gap-2 text-xs font-mono text-[#22D3EE]">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#22D3EE]" />
              Generating output...
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[var(--nl-text-muted)]">
              Run a comparison to inspect Model {label}&apos;s output and telemetry.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-view-enter mx-auto max-w-[1680px] space-y-4 p-3 sm:p-5">
      {/* Shared Prompt Panel */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-[var(--nl-text)] flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#EC4899]" />
              Side-by-Side Prompt Comparison
            </h1>
            <p className="text-xs text-[var(--nl-text-muted)]">
              Benchmark two models or sampling configurations simultaneously against the exact same prompt.
            </p>
          </div>

          {isRunning ? (
            <button
              type="button"
              onClick={stopComparison}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_-4px_rgba(236,72,153,0.8)]"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop Both (Esc)
            </button>
          ) : (
            <button
              type="button"
              onClick={runComparison}
              disabled={!userPrompt.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#22D3EE] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.75)] hover:brightness-110 disabled:opacity-40 transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Run Comparison
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--nl-text-muted)]">
              Shared System Prompt
            </label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-2.5 font-mono text-xs text-[var(--nl-text)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--nl-text-muted)]">
              Shared User Prompt
            </label>
            <textarea
              rows={3}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  runComparison();
                }
              }}
              placeholder="Enter prompt to test across both models..."
              className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-2.5 font-mono text-xs text-[var(--nl-text)]"
            />
          </div>
        </div>
      </div>

      {/* Side-by-Side Lanes */}
      <div className="grid gap-4 lg:grid-cols-2">
        {renderLane("A", laneA, setLaneA)}
        {renderLane("B", laneB, setLaneB)}
      </div>
    </div>
  );
}
