import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { bedrock, MODELS } from "../bedrock.js";

// ── Step 1: カテゴリ分類 ─────────────────────────────────────────────────
const classifyStep = createStep({
  id: "classify",
  description: "入力テキストをカテゴリに分類する",
  inputSchema: z.object({
    text: z.string().describe("分類対象のテキスト"),
  }),
  outputSchema: z.object({
    category: z.string().describe("分類されたカテゴリ"),
    confidence: z.number().describe("分類の確信度 (0-1)"),
    text: z.string().describe("元のテキスト"),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("classifierAgent");
    const result = await agent.generate(
      `以下のテキストを最も適切なカテゴリに分類してください。
カテゴリ: テクノロジー, ビジネス, 科学, エンタメ, スポーツ, 政治, ライフスタイル, その他

必ず以下のJSON形式で回答してください（他の文章は不要）:
{"category": "カテゴリ名", "confidence": 0.95}

テキスト:
${inputData.text}`,
    );

    try {
      const parsed = JSON.parse(result.text) as {
        category: string;
        confidence: number;
      };
      return {
        category: parsed.category,
        confidence: parsed.confidence,
        text: inputData.text,
      };
    } catch {
      return {
        category: "その他",
        confidence: 0.5,
        text: inputData.text,
      };
    }
  },
});

// ── Step 2: 感情分析 ─────────────────────────────────────────────────────
const sentimentStep = createStep({
  id: "sentiment",
  description: "テキストの感情（ポジティブ/ネガティブ/ニュートラル）を分析する",
  inputSchema: z.object({
    category: z.string(),
    confidence: z.number(),
    text: z.string(),
  }),
  outputSchema: z.object({
    category: z.string().describe("分類カテゴリ"),
    categoryConfidence: z.number().describe("カテゴリ分類の確信度"),
    sentiment: z.string().describe("感情 (positive/negative/neutral)"),
    sentimentScore: z.number().describe("感情スコア (-1.0〜1.0)"),
    summary: z.string().describe("分析結果のまとめ"),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("sentimentAgent");
    const result = await agent.generate(
      `以下のテキストの感情を分析してください。

必ず以下のJSON形式で回答してください（他の文章は不要）:
{"sentiment": "positive|negative|neutral", "score": 0.8}

scoreは -1.0（非常にネガティブ）〜 1.0（非常にポジティブ）の範囲で指定してください。

テキスト:
${inputData.text}`,
    );

    try {
      const parsed = JSON.parse(result.text) as {
        sentiment: string;
        score: number;
      };
      return {
        category: inputData.category,
        categoryConfidence: inputData.confidence,
        sentiment: parsed.sentiment,
        sentimentScore: parsed.score,
        summary: `カテゴリ: ${inputData.category} (確信度: ${(inputData.confidence * 100).toFixed(0)}%) | 感情: ${parsed.sentiment} (スコア: ${parsed.score})`,
      };
    } catch {
      return {
        category: inputData.category,
        categoryConfidence: inputData.confidence,
        sentiment: "neutral",
        sentimentScore: 0,
        summary: `カテゴリ: ${inputData.category} (確信度: ${(inputData.confidence * 100).toFixed(0)}%) | 感情: 分析不能`,
      };
    }
  },
});

// ── ワークフロー定義 ──────────────────────────────────────────────────────
// テキストをカテゴリ分類した後、感情分析を行うパイプライン
export const contentAnalysisWorkflow = createWorkflow({
  id: "contentAnalysis",
  description:
    "テキストのカテゴリ分類と感情分析を順次実行するコンテンツ分析パイプライン。",
  inputSchema: z.object({
    text: z.string().describe("分析対象のテキスト"),
  }),
  outputSchema: z.object({
    category: z.string(),
    categoryConfidence: z.number(),
    sentiment: z.string(),
    sentimentScore: z.number(),
    summary: z.string(),
  }),
  steps: [classifyStep, sentimentStep],
})
  .then(classifyStep)
  .then(sentimentStep)
  .commit();
