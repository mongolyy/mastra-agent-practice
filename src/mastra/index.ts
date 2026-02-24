import { Mastra } from "@mastra/core";
import { utilityAgent } from "./agents/utility-agent.js";
import {
  coordinatorAgent,
  devAgent,
  architectAgent,
  debugAgent,
  devilAdvocateAgent,
} from "./agents/agent-team.js";

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
  },
});
