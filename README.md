# Mastra + AWS Bedrock AgentCore Runtime Practice

MastraのAIエージェントフレームワークとAWS Bedrock AgentCore Runtimeを統合した学習用TypeScriptプロジェクト。

## アーキテクチャ

```
ユーザー
  ↓
AWS Bedrock AgentCore Runtime (セッション管理・スケーリング)
  ↓ POST /invocations (sessionId ヘッダー付き)
Express HTTP サーバー (src/index.ts)
  ↓
Mastra Agent (utilityAgent)
  ├─ Tool: getCurrentTimeTool (タイムゾーン指定で現在時刻取得)
  ├─ Tool: calculateTool (四則演算)
  └─ Tool: generateRandomNumberTool (乱数生成)
  ↓
LLM (openai/gpt-4o-mini または amazon-bedrock/claude-3-5-haiku)
```

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
# .env を編集して OPENAI_API_KEY を設定
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## ローカルでの動作確認

### ヘルスチェック

```bash
curl http://localhost:8080/ping
```

期待されるレスポンス:
```json
{ "status": "healthy", "timeOfLastUpdate": 1234567890 }
```

### エージェント呼び出し

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: test-session-001" \
  -d '{"prompt": "東京の現在時刻は？"}'
```

リクエスト例:
- `"東京の現在時刻は？"` → getCurrentTimeTool を使用
- `"123 × 456 を計算して"` → calculateTool を使用
- `"1から100の乱数を生成して"` → generateRandomNumberTool を使用

## Dockerビルドと実行

```bash
# ビルド
npm run build
docker build -t mastra-agent-practice .

# 実行
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  mastra-agent-practice
```

### ARM64 (Apple Silicon / AgentCore) 向けビルド

x86マシンでARM64イメージをビルドする場合:

```bash
docker buildx build \
  --platform linux/arm64 \
  --load \
  -t mastra-agent-practice:arm64 .
```

## AWS AgentCore へのデプロイ後

AgentCore にデプロイ済みのエージェントをローカルからテスト:

```bash
AGENT_NAME=mastra-practice-agent npm run invoke-agent

# カスタムプロンプトを指定
AGENT_NAME=mastra-practice-agent npm run invoke-agent -- "ニューヨークの現在時刻は？"
```

## プロジェクト構成

```
mastra-agent-practice/
├── src/
│   ├── index.ts                    # Express サーバー (AgentCore HTTP インターフェース)
│   └── mastra/
│       ├── index.ts                # Mastra インスタンス登録
│       └── agents/
│           └── utility-agent.ts   # エージェント + 3ツール定義
├── scripts/
│   └── invoke-agent.ts            # ローカルテスト用スクリプト (AWS SDK使用)
├── .env.example
├── .gitignore
├── Dockerfile                      # multi-stage ARM64 ビルド
├── package.json
├── tsconfig.json
└── README.md
```

## LLMプロバイダーの切り替え

`src/mastra/agents/utility-agent.ts` の `model` を変更:

```typescript
// OpenAI (デフォルト)
model: "openai/gpt-4o-mini",

// AWS Bedrock
model: "amazon-bedrock/anthropic.claude-3-5-haiku-20241022-v1:0",
```

Bedrockを使用する場合は `OPENAI_API_KEY` の代わりにIAM認証を設定してください。

## 注意点

- **ESM + nodenext**: インポートパスに `.js` 拡張子必須
- **ARM64**: AgentCore は ARM64 microVM で動作するため Dockerfile に `--platform=linux/arm64` が必要
- **ストリーミング**: `res.write()` 開始後はHTTPステータスコードを変更できない
- **Mastraバージョン**: `^0.24.0` はアクティブ開発中のため、API変更に注意

## 参照

- [AWS公式サンプル](https://github.com/awslabs/amazon-bedrock-agentcore-samples/tree/main/03-integrations/agentic-frameworks/typescript_mastra)
- [Mastra ドキュメント](https://mastra.ai/docs)
- [AWS Bedrock AgentCore](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
