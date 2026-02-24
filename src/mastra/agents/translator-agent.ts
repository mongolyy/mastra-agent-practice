import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { bedrock, MODELS } from "../bedrock.js";

// ── Tool: 文字数カウント ─────────────────────────────────────────────────
const countCharactersTool = createTool({
  id: "countCharacters",
  description:
    "テキストの文字数・単語数・行数をカウントする。翻訳前後の長さ比較に便利。",
  inputSchema: z.object({
    text: z.string().describe("カウント対象のテキスト"),
  }),
  outputSchema: z.object({
    characters: z.number().describe("文字数"),
    words: z.number().describe("単語数 (スペース区切り)"),
    lines: z.number().describe("行数"),
  }),
  execute: async (context) => {
    const { text } = context;
    const characters = text.length;
    const words = text
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const lines = text.split("\n").length;
    return { characters, words, lines };
  },
});

// ── エージェント定義 ──────────────────────────────────────────────────────
export const translatorAgent = new Agent({
  id: "translatorAgent",
  name: "translatorAgent",
  instructions: `あなたはプロフェッショナルな多言語翻訳者です。
ユーザーから与えられたテキストを指定された言語に正確に翻訳してください。

翻訳のガイドライン:
- 原文のニュアンスと文脈を正確に保つ
- 専門用語は適切に翻訳し、必要に応じて原語を括弧内に併記する
- 言語が指定されない場合は、日本語↔英語の翻訳を行う（入力が日本語なら英語へ、それ以外なら日本語へ）
- countCharacters ツールを使って翻訳前後の文字数を比較できる

対応言語: 日本語、英語、中国語、韓国語、フランス語、ドイツ語、スペイン語 等

出力フォーマット:
1. 翻訳結果
2. 翻訳メモ（意訳した箇所や注意点があれば）`,
  model: bedrock(MODELS.haikuJP),
  tools: {
    countCharactersTool,
  },
});
