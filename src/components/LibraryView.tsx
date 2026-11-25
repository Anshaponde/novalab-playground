"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BookMarked,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { PromptTemplate } from "@/lib/types";

interface LibraryViewProps {
  templates: PromptTemplate[];
  onCreateTemplate: (template: Omit<PromptTemplate, "id" | "createdAt" | "updatedAt">) => void;
  onUpdateTemplate: (
    id: string,
    patch: Omit<PromptTemplate, "id" | "createdAt" | "updatedAt">
  ) => void;
  onDeleteTemplate: (id: string) => void;
  onLoadIntoChat: (systemPrompt: string, userPrompt: string, title?: string) => void;
}

interface EditorState {
  id: string | null;
  title: string;
  category: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
}

const EMPTY_EDITOR: EditorState = {
  id: null,
  title: "",
  category: "General",
  description: "",
  systemPrompt: "",
  userPrompt: "",
};

export function LibraryView({
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onLoadIntoChat,
}: LibraryViewProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    for (const t of templates) {
      if (t.category.trim()) set.add(t.category.trim());
    }
    return Array.from(set);
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      const catMatch = selectedCategory === "All" || t.category === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.systemPrompt.toLowerCase().includes(q) ||
        t.userPrompt.toLowerCase().includes(q)
      );
    });
  }, [templates, query, selectedCategory]);

  const openCreate = () => {
    setEditor(EMPTY_EDITOR);
    setEditorOpen(true);
  };

  const openEdit = (tpl: PromptTemplate) => {
    setEditor({
      id: tpl.id,
      title: tpl.title,
      category: tpl.category,
      description: tpl.description,
      systemPrompt: tpl.systemPrompt,
      userPrompt: tpl.userPrompt,
    });
    setEditorOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor.title.trim()) return;
    const payload = {
      title: editor.title.trim(),
      category: editor.category.trim() || "General",
      description: editor.description.trim(),
      systemPrompt: editor.systemPrompt,
      userPrompt: editor.userPrompt,
    };
    if (editor.id) {
      onUpdateTemplate(editor.id, payload);
    } else {
      onCreateTemplate(payload);
    }
    setEditorOpen(false);
    setEditor(EMPTY_EDITOR);
  };

  return (
    <div className="animate-view-enter mx-auto max-w-[1680px] space-y-4 p-3 sm:p-5">
      {/* Header & Search */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-base font-bold text-[var(--nl-text)]">
              <BookMarked className="h-4 w-4 text-[#8B5CF6]" />
              Prompt Template Library
            </h1>
            <p className="text-xs text-[var(--nl-text-muted)]">
              Save reusable system and user prompt pairs locally in your browser and load them into Chat with one click.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#22D3EE] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.75)] hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--nl-text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates by title, tag, or prompt content..."
              className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] py-2 pl-8 pr-3 text-xs text-[var(--nl-text)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-[#8B5CF6]/25 border border-[#8B5CF6]/50 text-[#22D3EE]"
                    : "border border-[var(--nl-border-subtle)] text-[var(--nl-text-muted)] hover:text-[var(--nl-text)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Modal / Panel */}
      {editorOpen && (
        <form
          onSubmit={handleSave}
          className="neon-gradient-border rounded-2xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#22D3EE]">
              {editor.id ? "Edit Prompt Template" : "Create Prompt Template"}
            </h2>
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="rounded-lg p-1 text-[var(--nl-text-muted)] hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-medium text-[var(--nl-text-muted)]">
                Title *
              </label>
              <input
                type="text"
                required
                value={editor.title}
                onChange={(e) => setEditor((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Strict JSON Extractor"
                className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-3 py-2 text-xs text-[var(--nl-text)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--nl-text-muted)]">
                Category
              </label>
              <input
                type="text"
                value={editor.category}
                onChange={(e) => setEditor((p) => ({ ...p, category: e.target.value }))}
                placeholder="Engineering, Data, Security..."
                className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-3 py-2 text-xs text-[var(--nl-text)]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[var(--nl-text-muted)]">
              Description
            </label>
            <input
              type="text"
              value={editor.description}
              onChange={(e) => setEditor((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short note on when to use this template"
              className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-3 py-2 text-xs text-[var(--nl-text)]"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--nl-text-muted)]">
                System Prompt
              </label>
              <textarea
                rows={4}
                value={editor.systemPrompt}
                onChange={(e) => setEditor((p) => ({ ...p, systemPrompt: e.target.value }))}
                className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-2.5 font-mono text-xs text-[var(--nl-text)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--nl-text-muted)]">
                User Prompt
              </label>
              <textarea
                rows={4}
                value={editor.userPrompt}
                onChange={(e) => setEditor((p) => ({ ...p, userPrompt: e.target.value }))}
                className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-2.5 font-mono text-xs text-[var(--nl-text)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="rounded-xl border border-[var(--nl-border-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--nl-text-muted)] hover:text-[var(--nl-text)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
            >
              <Save className="h-3.5 w-3.5" />
              Save Template
            </button>
          </div>
        </form>
      )}

      {/* Templates Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-xs text-[var(--nl-text-muted)]">
          No templates match your filter. Create a new template or clear your search.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tpl) => (
            <article
              key={tpl.id}
              className="neon-gradient-border flex flex-col justify-between rounded-2xl p-4 space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-md border border-[#8B5CF6]/35 bg-[#8B5CF6]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#22D3EE]">
                      {tpl.category}
                    </span>
                    <h3 className="mt-1.5 text-sm font-bold text-[var(--nl-text)]">
                      {tpl.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(tpl)}
                      className="rounded-lg p-1.5 text-[var(--nl-text-muted)] hover:bg-white/10 hover:text-[#22D3EE]"
                      title="Edit template"
                      aria-label="Edit template"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(tpl.id)}
                      className="rounded-lg p-1.5 text-[var(--nl-text-muted)] hover:bg-rose-500/15 hover:text-rose-400"
                      title="Delete template"
                      aria-label="Delete template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {tpl.description && (
                  <p className="text-xs text-[var(--nl-text-muted)]">{tpl.description}</p>
                )}

                {tpl.systemPrompt && (
                  <div className="rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-2.5">
                    <div className="mb-1 font-mono text-[10px] uppercase text-[#8B5CF6]">
                      System
                    </div>
                    <p className="line-clamp-3 font-mono text-[11px] leading-relaxed text-[var(--nl-text-muted)]">
                      {tpl.systemPrompt}
                    </p>
                  </div>
                )}

                {tpl.userPrompt && (
                  <div className="rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-2.5">
                    <div className="mb-1 font-mono text-[10px] uppercase text-[#EC4899]">
                      User
                    </div>
                    <p className="line-clamp-3 font-mono text-[11px] leading-relaxed text-[var(--nl-text)]">
                      {tpl.userPrompt}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--nl-border-subtle)] pt-3">
                <span className="font-mono text-[10px] text-[var(--nl-text-muted)]">
                  Updated {new Date(tpl.updatedAt).toLocaleDateString()}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onLoadIntoChat(tpl.systemPrompt, tpl.userPrompt, tpl.title)
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6]/25 to-[#EC4899]/25 border border-[#8B5CF6]/45 px-3 py-1.5 text-xs font-semibold text-[#22D3EE] hover:brightness-125 transition-all"
                >
                  Load into chat
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
