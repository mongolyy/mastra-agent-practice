/**
 * invoke-agent.ts
 *
 * AWS Bedrock AgentCore Runtime にデプロイされたエージェントを
 * ローカルからテスト呼び出しするスクリプト。
 *
 * 使用方法:
 *   AGENT_NAME=mastra-practice-agent npm run invoke-agent
 *
 * 前提条件:
 *   - AWS credentials が設定済みであること (AWS_PROFILE または環境変数)
 *   - AgentCore にエージェントがデプロイ済みであること
 */

import "dotenv/config";
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { randomUUID } from "node:crypto";

const AWS_REGION = process.env["AWS_REGION"] ?? "us-east-1";
const AGENT_NAME = process.env["AGENT_NAME"];

if (!AGENT_NAME) {
  console.error("Error: AGENT_NAME environment variable is required");
  process.exit(1);
}

// ── AgentCore エンドポイントURL を SSM Parameter Store から取得 ───────────
async function getAgentEndpoint(agentName: string): Promise<string> {
  const ssm = new SSMClient({ region: AWS_REGION });
  const parameterName = `/bedrock-agentcore/${agentName}/endpoint`;

  console.log(`Fetching endpoint from SSM: ${parameterName}`);

  const command = new GetParameterCommand({ Name: parameterName });
  const response = await ssm.send(command);

  const endpoint = response.Parameter?.Value;
  if (!endpoint) {
    throw new Error(`Endpoint not found in SSM parameter: ${parameterName}`);
  }

  return endpoint;
}

// ── エージェント呼び出し ──────────────────────────────────────────────────
async function invokeAgent(prompt: string): Promise<void> {
  const endpoint = await getAgentEndpoint(AGENT_NAME!);
  const sessionId = randomUUID();

  console.log(`\nEndpoint: ${endpoint}`);
  console.log(`Session ID: ${sessionId}`);
  console.log(`Prompt: ${prompt}`);
  console.log("\n--- Response ---");

  const client = new BedrockAgentCoreClient({
    region: AWS_REGION,
    endpoint,
  });

  const command = new InvokeAgentRuntimeCommand({
    agentRuntimeId: AGENT_NAME,
    sessionId,
    qualifier: "$LATEST",
    payload: JSON.stringify({ prompt }),
  });

  const response = await client.send(command);

  // ストリーミングレスポンスを受信
  if (response.body) {
    const decoder = new TextDecoder("utf-8");
    for await (const chunk of response.body) {
      if (chunk instanceof Uint8Array) {
        process.stdout.write(decoder.decode(chunk, { stream: true }));
      }
    }
    // 残りのバイトをフラッシュ
    process.stdout.write(decoder.decode());
  }

  console.log("\n--- End of Response ---");
}

// ── エントリーポイント ────────────────────────────────────────────────────
const prompt = process.argv[2] ?? "東京の現在時刻を教えてください。また、123 × 456 を計算してください。";

invokeAgent(prompt).catch((error: unknown) => {
  console.error("Error:", error);
  process.exit(1);
});
