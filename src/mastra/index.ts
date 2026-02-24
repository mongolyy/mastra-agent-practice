import { Mastra } from "@mastra/core";
import { utilityAgent } from "./agents/utility-agent.js";
import {
  coordinatorAgent,
  devAgent,
  architectAgent,
  debugAgent,
  devilAdvocateAgent,
} from "./agents/agent-team.js";
import { translatorAgent } from "./agents/translator-agent.js";
import { summarizerAgent } from "./agents/summarizer-agent.js";
import {
  classifierAgent,
  sentimentAgent,
} from "./agents/analysis-agents.js";
import { translateAndSummarizeWorkflow } from "./workflows/translate-and-summarize.js";
import { contentAnalysisWorkflow } from "./workflows/content-analysis.js";

export const mastra = new Mastra({
  agents: {
    // ユーティリティエージェント (ツール利用の基本デモ)
    utilityAgent,
    // エージェントチーム (多角的分析)
    coordinatorAgent,
    devAgent,
    architectAgent,
    debugAgent,
    devilAdvocateAgent,
    // 翻訳エージェント
    translatorAgent,
    // 要約エージェント
    summarizerAgent,
    // 分析用エージェント (ワークフロー内部で使用)
    classifierAgent,
    sentimentAgent,
  },
  workflows: {
    // 翻訳→要約パイプライン
    translateAndSummarizeWorkflow,
    // コンテンツ分析パイプライン
    contentAnalysisWorkflow,
  },
});
