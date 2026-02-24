import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { translatorAgent } from "../agents/translator-agent.js";
import { summarizerAgent } from "../agents/summarizer-agent.js";

// ── Step 1: 翻訳ステップ ─────────────────────────────────────────────────
const translateStep = createStep(translatorAgent);

// ── Step 2: 要約ステップ ─────────────────────────────────────────────────
const summarizeStep = createStep(summarizerAgent);

// ── ワークフロー定義 ──────────────────────────────────────────────────────
// テキストを翻訳した後、翻訳結果を要約するパイプライン
export const translateAndSummarizeWorkflow = createWorkflow({
  id: "translateAndSummarize",
  description:
    "テキストを英語に翻訳し、その翻訳結果を要約するパイプライン。長文の多言語コンテンツを素早く把握するのに便利。",
  inputSchema: z.object({
    prompt: z.string().describe("翻訳対象のテキスト"),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
  steps: [translateStep, summarizeStep],
})
  .then(translateStep)
  .map({
    prompt: {
      step: translateStep,
      path: "text",
    },
  })
  .then(summarizeStep)
  .commit();
