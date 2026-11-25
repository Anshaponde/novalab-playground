"use client";

import React from "react";
import { Braces, Cpu, RotateCcw, Sparkles } from "lucide-react";
import { DEFAULT_RUN_SETTINGS, GROQ_MODELS, getModelInfo } from "@/lib/models";
import { formatTokenCount } from "@/lib/tokens";
import type { ReasoningEffort, RunSettings } from "@/lib/types";

interface RunSettingsPanelProps {
  settings: RunSettings;
  onChange: (next: RunSettings) => void;
  estimatedInputTokens: number;
}

export function RunSettingsPanel({
  settings,
  onChange,
  estimatedInputTokens,
}: RunSettingsPanelProps) {
  const modelInfo = getModelInfo(settings.model);
  const contextPercent = Math.min(
    100,
    Math.round((estimatedInputTokens / modelInfo.contextWindow) * 1000) / 10
  );

  const barColor =
    contextPercent > 80
      ? "from-[#EC4899] to-rose-500"
      : contextPercent > 50
        ? "from-[#8B5CF6] to-[#EC4899]"
        : "from-[#22D3EE] to-[#8B5CF6]";

  const update = <K extends keyof RunSettings>(key: K, value: RunSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const handleModelChange = (modelId: string) => {
    const nextModel = getModelInfo(modelId);
    const clampedMax = Math.min(settings.maxTokens, nextModel.maxCompletionTokens);
    onChange({ ...settings, model: modelId, maxTokens: clampedMax });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[#22D3EE]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--nl-text)]">
            Run Settings
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_RUN_SETTINGS })}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--nl-border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--nl-text-muted)] hover:border-[#EC4899]/50 hover:text-[var(--nl-text)] transition-colors"
          title="Reset all settings to defaults"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Model Picker */}
      <div className="space-y-1.5">
        <label htmlFor="model-picker" className="text-xs font-medium text-[var(--nl-text-muted)]">
          Model
        </label>
        <select
          id="model-picker"
          value={settings.model}
          onChange={(e) => handleModelChange(e.target.value)}
          className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-3 py-2 text-xs font-medium text-[var(--nl-text)]"
        >
          {GROQ_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.speedTag})
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between text-[11px] text-[var(--nl-text-muted)] pt-0.5">
          <span>{modelInfo.provider}</span>
          <span className="font-mono text-[#22D3EE]">
            {formatTokenCount(modelInfo.contextWindow)} ctx
          </span>
        </div>
        <p className="text-[11px] leading-snug text-[var(--nl-text-muted)]">
          {modelInfo.description}
        </p>
      </div>

      {/* Temperature */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="temp-slider" className="font-medium text-[var(--nl-text-muted)]">
            Temperature
          </label>
          <span className="rounded-md bg-[#8B5CF6]/15 px-2 py-0.5 font-mono text-[11px] text-[#22D3EE] border border-[#8B5CF6]/30">
            {settings.temperature.toFixed(2)}
          </span>
        </div>
        <input
          id="temp-slider"
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={settings.temperature}
          onChange={(e) => update("temperature", parseFloat(e.target.value))}
          className="w-full accent-[#8B5CF6] cursor-pointer"
        />
      </div>

      {/* Max Tokens */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="max-tokens-slider" className="font-medium text-[var(--nl-text-muted)]">
            Max Tokens
          </label>
          <span className="rounded-md bg-[#8B5CF6]/15 px-2 py-0.5 font-mono text-[11px] text-[#22D3EE] border border-[#8B5CF6]/30">
            {settings.maxTokens}
          </span>
        </div>
        <input
          id="max-tokens-slider"
          type="range"
          min={128}
          max={Math.min(16384, modelInfo.maxCompletionTokens)}
          step={128}
          value={Math.min(settings.maxTokens, Math.min(16384, modelInfo.maxCompletionTokens))}
          onChange={(e) => update("maxTokens", parseInt(e.target.value, 10))}
          className="w-full accent-[#EC4899] cursor-pointer"
        />
      </div>

      {/* Top P */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="top-p-slider" className="font-medium text-[var(--nl-text-muted)]">
            Top P
          </label>
          <span className="rounded-md bg-[#8B5CF6]/15 px-2 py-0.5 font-mono text-[11px] text-[#22D3EE] border border-[#8B5CF6]/30">
            {settings.topP.toFixed(2)}
          </span>
        </div>
        <input
          id="top-p-slider"
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={settings.topP}
          onChange={(e) => update("topP", parseFloat(e.target.value))}
          className="w-full accent-[#22D3EE] cursor-pointer"
        />
      </div>

      {/* Reasoning Effort */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-[var(--nl-text-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6]" />
            Reasoning Effort
          </span>
          <span className="font-mono text-[10px] text-[var(--nl-text-muted)]">
            {modelInfo.supportsReasoning ? "Active" : "Reasoning models"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-1">
          {(["low", "medium", "high"] as ReasoningEffort[]).map((level) => {
            const active = settings.reasoningEffort === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => update("reasoningEffort", level)}
                className={`rounded-lg py-1.5 text-xs font-medium capitalize transition-all ${
                  active
                    ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-[0_0_14px_-4px_rgba(236,72,153,0.8)]"
                    : "text-[var(--nl-text-muted)] hover:text-[var(--nl-text)]"
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* JSON Mode */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-[#EC4899]" />
          <div>
            <div className="text-xs font-medium text-[var(--nl-text)]">JSON Mode</div>
            <div className="text-[10px] text-[var(--nl-text-muted)]">
              Enforce valid JSON object output
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.jsonMode}
          onClick={() => update("jsonMode", !settings.jsonMode)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
            settings.jsonMode
              ? "bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE]"
              : "bg-slate-600/50"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              settings.jsonMode ? "translate-x-4.5" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Token & Context Window Usage */}
      <div className="mt-auto space-y-2 rounded-xl border border-[#8B5CF6]/25 bg-[var(--nl-bg-input)] p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--nl-text-muted)]">Est. Input Tokens</span>
          <span className="font-mono font-semibold text-[#22D3EE]">
            ~{estimatedInputTokens.toLocaleString()}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--nl-text-muted)]">
            <span>Context Window</span>
            <span className="font-mono">
              {contextPercent}% of {formatTokenCount(modelInfo.contextWindow)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-300`}
              style={{ width: `${Math.max(contextPercent > 0 ? 2 : 0, contextPercent)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
