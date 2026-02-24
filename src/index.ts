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
] as const;

type AgentName = (typeof VALID_AGENTS)[number];

function isValidAgent(name: unknown): name is AgentName {
  return VALID_AGENTS.includes(name as AgentName);
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

// ── サーバー起動 ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nServer listening on port ${PORT}`);
  console.log(`  Health:  GET  http://localhost:${PORT}/ping`);
  console.log(
    `  Team:    POST http://localhost:${PORT}/invocations  (coordinatorAgent)`,
  );
  console.log(
    `  Utility: POST http://localhost:${PORT}/invocations  {"prompt":"...", "agentName":"utilityAgent"}`,
  );
  console.log(`\n  Available agents: ${VALID_AGENTS.join(", ")}`);
});
