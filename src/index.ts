import "dotenv/config";
import express from "express";
import { mastra } from "./mastra/index.js";

const PORT = process.env["PORT"] ?? "8080";

// 利用可能なエージェント名
const VALID_AGENTS = [
  "coordinatorAgent", // デフォルト: 4専門家チーム
  "utilityAgent", // ツール利用デモ
  "devAgent",
  "architectAgent",
  "debugAgent",
  "devilAdvocateAgent",
  "translatorAgent", // 多言語翻訳
  "summarizerAgent", // テキスト要約
  "classifierAgent", // カテゴリ分類 (ワークフロー内部用)
  "sentimentAgent", // 感情分析 (ワークフロー内部用)
] as const;

type AgentName = (typeof VALID_AGENTS)[number];

function isValidAgent(name: unknown): name is AgentName {
  return VALID_AGENTS.includes(name as AgentName);
}

// 利用可能なワークフロー名
const VALID_WORKFLOWS = [
  "translateAndSummarizeWorkflow", // 翻訳→要約パイプライン
  "contentAnalysisWorkflow", // コンテンツ分析パイプライン
] as const;

type WorkflowName = (typeof VALID_WORKFLOWS)[number];

function isValidWorkflow(name: unknown): name is WorkflowName {
  return VALID_WORKFLOWS.includes(name as WorkflowName);
}

const app = express();
app.use(express.json());

// ── ヘルスチェック ────────────────────────────────────────────────────────
app.get("/ping", (_req, res) => {
  res.json({
    status: "healthy",
    timeOfLastUpdate: Math.floor(Date.now() / 1000),
  });
});

// ── エージェント呼び出し ──────────────────────────────────────────────────
app.post("/invocations", async (req, res) => {
  const sessionId = req.headers["x-amzn-bedrock-agentcore-runtime-session-id"];

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({
      error:
        "Missing required header: X-Amzn-Bedrock-AgentCore-Runtime-Session-Id",
    });
    return;
  }

  const body = req.body as { prompt?: unknown; agentName?: unknown };

  if (!body.prompt || typeof body.prompt !== "string") {
    res
      .status(400)
      .json({ error: "Request body must contain a 'prompt' string field" });
    return;
  }

  // agentName 未指定時はコーディネーター (チームエージェント) を使用
  const agentName: AgentName = isValidAgent(body.agentName)
    ? body.agentName
    : "coordinatorAgent";

  const { prompt } = body;
  console.log(
    `[${new Date().toISOString()}] Session: ${sessionId} | Agent: ${agentName} | Prompt: ${prompt.slice(0, 80)}`,
  );

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const agent = mastra.getAgent(agentName);
    const stream = await agent.stream(prompt, { maxSteps: 10 });

    for await (const chunk of stream.textStream) {
      res.write(chunk);
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Stream error | Session: ${sessionId} | Agent: ${agentName}`,
      error,
    );
    res.write(
      "\n\n[エラーが発生しました。しばらく経ってから再試行してください。]",
    );
  }

  res.end();
});

// ── ワークフロー呼び出し ──────────────────────────────────────────────────
app.post("/workflows", async (req, res) => {
  const sessionId = req.headers["x-amzn-bedrock-agentcore-runtime-session-id"];

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({
      error:
        "Missing required header: X-Amzn-Bedrock-AgentCore-Runtime-Session-Id",
    });
    return;
  }

  const body = req.body as {
    input?: unknown;
    workflowName?: unknown;
  };

  if (!body.workflowName || !isValidWorkflow(body.workflowName)) {
    res.status(400).json({
      error: `Invalid or missing 'workflowName'. Valid values: ${VALID_WORKFLOWS.join(", ")}`,
    });
    return;
  }

  if (!body.input || typeof body.input !== "object") {
    res.status(400).json({
      error: "Request body must contain an 'input' object field",
    });
    return;
  }

  const { workflowName } = body;
  console.log(
    `[${new Date().toISOString()}] Session: ${sessionId} | Workflow: ${workflowName} | Input: ${JSON.stringify(body.input).slice(0, 80)}`,
  );

  try {
    const workflow = mastra.getWorkflow(workflowName);
    const run = await workflow.createRun();
    const result = await run.start({ inputData: body.input as never });

    res.json(result);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Workflow error | Session: ${sessionId} | Workflow: ${workflowName}`,
      error,
    );
    res.status(500).json({
      error: "ワークフローの実行中にエラーが発生しました",
    });
  }
});

// ── サーバー起動 ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nServer listening on port ${PORT}`);
  console.log(`  Health:     GET  http://localhost:${PORT}/ping`);
  console.log(
    `  Agents:     POST http://localhost:${PORT}/invocations  (coordinatorAgent)`,
  );
  console.log(
    `  Workflows:  POST http://localhost:${PORT}/workflows`,
  );
  console.log(`\n  Available agents:    ${VALID_AGENTS.join(", ")}`);
  console.log(`  Available workflows: ${VALID_WORKFLOWS.join(", ")}`);
});
