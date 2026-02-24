import { Agent } from "@mastra/core/agent";
import { bedrock, MODELS } from "../bedrock.js";

// ── 分類エージェント (contentAnalysis ワークフロー用) ─────────────────────
export const classifierAgent = new Agent({
  id: "classifierAgent",
  name: "classifierAgent",
  instructions: `あなたはテキスト分類の専門家です。
与えられたテキストを以下のカテゴリのいずれかに分類してください:
テクノロジー, ビジネス, 科学, エンタメ, スポーツ, 政治, ライフスタイル, その他

必ず指定されたJSON形式のみで回答してください。余計な説明は不要です。`,
  model: bedrock(MODELS.haikuJP),
  tools: {},
});

// ── 感情分析エージェント (contentAnalysis ワークフロー用) ─────────────────
export const sentimentAgent = new Agent({
  id: "sentimentAgent",
  name: "sentimentAgent",
  instructions: `あなたは感情分析の専門家です。
与えられたテキストの感情（positive / negative / neutral）を分析してください。

必ず指定されたJSON形式のみで回答してください。余計な説明は不要です。`,
  model: bedrock(MODELS.haikuJP),
  tools: {},
});
