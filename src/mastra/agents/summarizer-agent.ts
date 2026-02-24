import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { bedrock, MODELS } from "../bedrock.js";

// ── Tool: 読了時間推定 ───────────────────────────────────────────────────
const estimateReadingTimeTool = createTool({
  id: "estimateReadingTime",
  description:
    "テキストの読了時間を推定する。日本語は1分あたり約500文字、英語は1分あたり約200単語で計算。",
  inputSchema: z.object({
    text: z.string().describe("読了時間を推定するテキスト"),
    language: z
      .enum(["ja", "en"])
      .default("ja")
      .describe("テキストの言語 (ja: 日本語, en: 英語)"),
  }),
  outputSchema: z.object({
    estimatedMinutes: z.number().describe("推定読了時間（分）"),
    characterCount: z.number().describe("文字数"),
    summary: z.string().describe("読了時間の説明"),
  }),
  execute: async (context) => {
    const { text, language } = context;
    const characterCount = text.length;

    let estimatedMinutes: number;
    if (language === "ja") {
      // 日本語: 約500文字/分
      estimatedMinutes = Math.ceil(characterCount / 500);
    } else {
      // 英語: 約200単語/分
      const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
      estimatedMinutes = Math.ceil(wordCount / 200);
    }

    const summary =
      estimatedMinutes <= 1
        ? "1分以内で読めます"
        : `約${estimatedMinutes}分で読めます`;

    return { estimatedMinutes, characterCount, summary };
  },
});

// ── Tool: キーワード抽出 ─────────────────────────────────────────────────
const extractKeywordsTool = createTool({
  id: "extractKeywords",
  description:
    "テキストから頻出する単語を抽出してキーワード候補として返す。日本語はスペースおよび句読点で分割。",
  inputSchema: z.object({
    text: z.string().describe("キーワードを抽出するテキスト"),
    topN: z
      .number()
      .default(10)
      .describe("上位何件のキーワードを返すか (デフォルト: 10)"),
  }),
  outputSchema: z.object({
    keywords: z
      .array(z.object({ word: z.string(), count: z.number() }))
      .describe("キーワードと出現回数のリスト"),
  }),
  execute: async (context) => {
    const { text, topN } = context;
    // 簡易的な頻度カウント（スペース・句読点・改行で分割）
    const words = text
      .split(/[\s、。！？,.!?\n\r\t]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 1);

    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }

    const keywords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word, count]) => ({ word, count }));

    return { keywords };
  },
});

// ── エージェント定義 ──────────────────────────────────────────────────────
export const summarizerAgent = new Agent({
  id: "summarizerAgent",
  name: "summarizerAgent",
  instructions: `あなたは優秀なテキスト要約スペシャリストです。
与えられたテキストを簡潔かつ正確に要約してください。

要約のガイドライン:
- 元のテキストの主要なポイントを漏らさない
- 冗長な表現を避け、簡潔にまとめる
- 必要に応じて箇条書きを使用する
- estimateReadingTime ツールで元テキストの読了時間を計算できる
- extractKeywords ツールでキーワードを抽出できる

出力フォーマット:
1. 一行要約（1〜2文）
2. 詳細要約（箇条書き3〜5項目）
3. キーワード（あれば）`,
  model: bedrock(MODELS.haikuJP),
  tools: {
    estimateReadingTimeTool,
    extractKeywordsTool,
  },
});
