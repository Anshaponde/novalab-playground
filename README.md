# NovaLab Playground

An original, cyberpunk-neon LLM prompt engineering workbench built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**, powered server-side by the **Groq OpenAI-compatible API**.

## Features

- **Chat Workspace**
  - Editable system prompt and user prompt with `JetBrains Mono` formatting.
  - Real-time Server-Sent Events (SSE) token streaming.
  - Keyboard-first ergonomics: `Enter` sends, `Shift+Enter` adds a new line, `Esc` aborts active generation.
  - Live connection status indicator (`Connecting` / `Ready` / `Working`) and real-time `tok/s` throughput readout.
  - Persistent chat history sidebar with instant search, new session, inline rename, and delete.
- **Side-by-Side Compare**
  - Benchmark two models or sampling configurations simultaneously against the same system and user prompt.
  - Live streaming output panes with latency, throughput (`tok/s`), prompt tokens, completion tokens, and fastest-lane highlighting.
- **Prompt Security & Clarity Analyzer**
  - Paste any system/user prompt pair to receive a structured LLM audit covering clarity, operational risks, prompt-injection vectors, and a hardened rewrite.
  - Includes a **Load risky sample** button and one-click **Load into Chat** for the suggested rewrite.
- **Prompt Template Library**
  - Create, search, filter by category, edit, and delete reusable prompt templates persisted in `localStorage`.
  - One-click **Load into chat** workflow.
- **Run Settings Panel**
  - Model picker, `temperature`, `max_tokens`, `top_p`, reasoning effort (`low` / `medium` / `high`), JSON mode toggle, and a **Reset** button.
  - Live estimated input token counter and context-window usage progress bar.
- **Cyberpunk Neon Theme**
  - Near-black dark canvas with electric purple (`#8B5CF6`), hot pink (`#EC4899`), and cyan (`#22D3EE`) accents, glassmorphism cards, gradient borders, `Space Grotesk` + `JetBrains Mono`, dark/light theme toggle, and full mobile responsiveness.

## Screenshots

> _Placeholder: add screenshots of the Chat, Compare, Analyzer, and Library views here._
>
> - `docs/screenshots/chat-view.png`
> - `docs/screenshots/compare-view.png`
> - `docs/screenshots/analyzer-view.png`
> - `docs/screenshots/library-view.png`

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and set your Groq API key:
   ```env
   GROQ_API_KEY=gsk_your_api_key_here
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Server-side API key for `https://api.groq.com/openai/v1/chat/completions`. Never exposed to the browser. |

## Deploy to Vercel

NovaLab Playground requires zero extra configuration for Vercel:

1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com/new).
3. Add `GROQ_API_KEY` under **Project Settings → Environment Variables**.
4. Click **Deploy**.
