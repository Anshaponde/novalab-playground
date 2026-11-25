"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-[#8B5CF6]/30 bg-black/50">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-mono text-[var(--nl-text-muted)]">
        <span className="uppercase tracking-wider text-[#22D3EE]">{lang || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] hover:bg-white/10 hover:text-[var(--nl-text)] transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-[#22D3EE]" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed font-mono text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="rounded bg-[#8B5CF6]/15 px-1.5 py-0.5 font-mono text-[0.85em] text-[#22D3EE] border border-[#8B5CF6]/25"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-[var(--nl-text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function MarkdownLite({ content }: { content: string }) {
  if (!content) return null;

  // Split by fenced code blocks ```lang ... ```
  const segments: Array<{ type: "text" | "code"; lang?: string; value: string }> = [];
  const regex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", lang: match[1], value: match[2].replace(/\n$/, "") });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed break-words">
      {segments.map((seg, i) => {
        if (seg.type === "code") {
          return <CodeBlock key={i} lang={seg.lang ?? ""} code={seg.value} />;
        }

        const lines = seg.value.split("\n");
        return (
          <div key={i} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lineIdx} className="h-1.5" />;
              }
              if (trimmed.startsWith("### ")) {
                return (
                  <h4 key={lineIdx} className="pt-1 text-sm font-semibold text-[#22D3EE]">
                    {renderInline(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h3 key={lineIdx} className="pt-1 text-base font-semibold text-[#EC4899]">
                    {renderInline(trimmed.slice(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <h2 key={lineIdx} className="pt-1 text-lg font-bold text-[#8B5CF6]">
                    {renderInline(trimmed.slice(2))}
                  </h2>
                );
              }
              if (/^[-*]\s+/.test(trimmed)) {
                return (
                  <div key={lineIdx} className="flex gap-2 pl-1">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EC4899]" />
                    <span>{renderInline(trimmed.replace(/^[-*]\s+/, ""))}</span>
                  </div>
                );
              }
              return <p key={lineIdx}>{renderInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}
