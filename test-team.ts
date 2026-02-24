import "dotenv/config";
import { mastra } from "./src/mastra/index.js";

async function run() {
  console.log("=== エージェントチームテスト ===\n");
  const coordinator = mastra.getAgent("coordinatorAgent");

  const question = `
MastraエージェントをAWS Bedrock AgentCore Runtimeにデプロイする際に、
Express サーバーでチャンクストリーミングを実装する最善の方法は何ですか？
  `.trim();

  console.log(`質問: ${question}\n`);
  console.log("--- チームの分析 ---\n");

  try {
    const stream = await coordinator.stream(question, { maxSteps: 10 });
    const reader = stream.textStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      process.stdout.write(value);
    }
    console.log("\n\n=== 完了 ===");
  } catch (e: any) {
    console.error("ERROR:", e.message);
    if (e.data) console.error("Detail:", e.data);
  }
}

run();
