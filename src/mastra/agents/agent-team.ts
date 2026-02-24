import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { bedrock, MODELS } from "../bedrock.js";

// ── 共通モデル設定 ────────────────────────────────────────────────────────
// コスト効率のよい Haiku を使用 (学習用途)。必要に応じて sonnetJP に変更可
const MODEL = MODELS.haikuJP;

// ── 専門エージェント 1: 開発担当 ─────────────────────────────────────────
export const devAgent = new Agent({
  id: "devAgent",
  name: "devAgent",
  instructions: `あなたは経験豊富なソフトウェア開発者です。実装の観点から問題を分析してください。

以下に焦点を当てて回答してください：
- 具体的なコード実装アプローチ
- コード品質・可読性・保守性のベストプラクティス
- パフォーマンス最適化
- TypeScript / Node.js のエコシステムでの実践的な実装方法

簡潔かつ実践的に答えてください。`,
  model: bedrock(MODEL),
  tools: {},
});

// ── 専門エージェント 2: 技術アーキテクチャ担当 ───────────────────────────
export const architectAgent = new Agent({
  id: "architectAgent",
  name: "architectAgent",
  instructions: `あなたはシニアテクニカルアーキテクトです。システム設計の観点から問題を分析してください。

以下に焦点を当てて回答してください：
- アーキテクチャパターンと設計原則
- スケーラビリティ・可用性・信頼性の設計
- コンポーネント間の依存関係と結合度
- 技術的トレードオフ（複雑性 vs 柔軟性 等）
- AWS / クラウドネイティブのベストプラクティス

全体最適の視点で答えてください。`,
  model: bedrock(MODEL),
  tools: {},
});

// ── 専門エージェント 3: デバッグ担当 ─────────────────────────────────────
export const debugAgent = new Agent({
  id: "debugAgent",
  name: "debugAgent",
  instructions: `あなたは熟練したデバッグエンジニアです。問題の根本原因と潜在的な障害を特定してください。

以下に焦点を当てて回答してください：
- 潜在的なバグ・エラーの原因
- エッジケースと境界値
- エラーハンドリング戦略
- デバッグ手順とログ戦略
- テスト方法（ユニット・統合・E2E）

「何が壊れるか」を先読みして答えてください。`,
  model: bedrock(MODEL),
  tools: {},
});

// ── 専門エージェント 4: 悪魔の代弁者 ────────────────────────────────────
export const devilAdvocateAgent = new Agent({
  id: "devilAdvocateAgent",
  name: "devilAdvocateAgent",
  instructions: `あなたは批判的思考の専門家として「悪魔の代弁者」を演じます。提案や設計に対して建設的に反論してください。

以下に焦点を当てて回答してください：
- 前提への疑問と見落とされた仮定
- 見えていないリスクと潜在的な失敗モード
- 「本当にこれが正しいアプローチか？」という問い
- 代替アプローチや見落とされた選択肢
- 過剰設計・過小設計の指摘

建設的な批判で思考を深めてください。感情的にならず、論理的に反論してください。`,
  model: bedrock(MODEL),
  tools: {},
});

// ── チーム相談ツール (4エージェントを並行実行) ────────────────────────────
const consultTeamTool = createTool({
  id: "consultTeam",
  description:
    "開発・アーキテクチャ・デバッグ・批判的視点の4専門家チームに並行して相談し、多角的な分析を収集する",
  inputSchema: z.object({
    question: z.string().describe("チームに相談する質問・課題・設計案"),
  }),
  outputSchema: z.object({
    developer: z.string().describe("開発担当の回答"),
    architect: z.string().describe("アーキテクチャ担当の回答"),
    debugger: z.string().describe("デバッグ担当の回答"),
    devilAdvocate: z.string().describe("悪魔の代弁者の回答"),
  }),
  execute: async (context) => {
    console.log(
      `[Team] 4エージェントに並行相談中: "${context.question.slice(0, 60)}..."`,
    );

    const [devResult, archResult, debugResult, devilResult] = await Promise.all(
      [
        devAgent.generate(context.question),
        architectAgent.generate(context.question),
        debugAgent.generate(context.question),
        devilAdvocateAgent.generate(context.question),
      ],
    );

    console.log("[Team] 全エージェントの回答収集完了");

    return {
      developer: devResult.text,
      architect: archResult.text,
      debugger: debugResult.text,
      devilAdvocate: devilResult.text,
    };
  },
});

// ── コーディネーターエージェント ──────────────────────────────────────────
export const coordinatorAgent = new Agent({
  id: "coordinatorAgent",
  name: "coordinatorAgent",
  instructions: `あなたはエージェントチームのコーディネーターです。
ユーザーの質問・課題に対して、4人の専門家チームに相談し、多角的な分析を提供します。

必ず以下の手順で対応してください：
1. consultTeam ツールを使用して4人全員の意見を収集する
2. 収集した意見を以下のフォーマットで整理して提示する：

---
## 👨‍💻 開発担当の視点
{開発者の回答}

## 🏗️ アーキテクチャ担当の視点
{アーキテクトの回答}

## 🔍 デバッグ担当の視点
{デバッガーの回答}

## 😈 悪魔の代弁者の視点
{批判的視点からの回答}

## 💡 チームの総括
{4つの視点を統合した結論・推奨事項・次のアクション}
---`,
  model: bedrock(MODEL),
  tools: { consultTeamTool },
});
