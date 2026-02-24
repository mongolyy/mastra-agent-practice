# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output (requires build first)
npm run invoke-agent # Test a deployed AgentCore agent via AWS SDK
```

### Local API testing

```bash
# Health check
curl http://localhost:8080/ping

# Call the coordinator team agent (default)
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: test-session-001" \
  -d '{"prompt": "質問をここに"}'

# Call a specific agent
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: test-session-001" \
  -d '{"prompt": "東京の現在時刻は？", "agentName": "utilityAgent"}'
```

### Invoke deployed AgentCore agent

```bash
AGENT_NAME=mastra-practice-agent npm run invoke-agent "質問をここに"
```

## Architecture

### Request flow

```
POST /invocations (Express, src/index.ts)
  └─ mastra.getAgent(agentName)   (src/mastra/index.ts)
       └─ agent.stream(prompt)
            └─ bedrock(MODEL)     (src/mastra/bedrock.ts)
                 └─ AWS Bedrock cross-region inference profile
```

### Agent types

**`coordinatorAgent`** (default) — Orchestrator that calls `consultTeamTool`, which fans out in parallel to all 4 specialist agents and returns their combined analysis.

**Specialist agents** (called only via `consultTeamTool`, not directly from the HTTP layer):
- `devAgent` — implementation perspective
- `architectAgent` — system design perspective
- `debugAgent` — failure/edge case perspective
- `devilAdvocateAgent` — critical/contrarian perspective

**`utilityAgent`** — Standalone agent with 3 tools: `getCurrentTime`, `calculate`, `generateRandomNumber`.

### Key files

| File | Role |
|---|---|
| `src/index.ts` | Express server; routes `POST /invocations` to the selected agent; streams response |
| `src/mastra/index.ts` | Mastra instance; registers all agents |
| `src/mastra/bedrock.ts` | AWS Bedrock provider setup; defines `MODELS` constants |
| `src/mastra/agents/agent-team.ts` | `coordinatorAgent` + 4 specialists + `consultTeamTool` |
| `src/mastra/agents/utility-agent.ts` | `utilityAgent` + 3 utility tools |
| `scripts/invoke-agent.ts` | CLI script to call a deployed AgentCore endpoint; fetches endpoint URL from SSM Parameter Store at `/bedrock-agentcore/{AGENT_NAME}/endpoint` |

### AWS / Bedrock configuration

- LLM provider: AWS Bedrock via `@ai-sdk/amazon-bedrock`
- Default model: `jp.anthropic.claude-haiku-4-5-20251001-v1:0` (cross-region JP inference profile, `ap-northeast-1`)
- Auth: `AWS_PROFILE` → SSO; otherwise falls back to environment variables or instance metadata
- Region defaults: `ap-northeast-1` for inference, `us-east-1` for AgentCore invocation script

### HTTP contract (AgentCore Runtime)

- `GET /ping` → `{ status: "healthy", timeOfLastUpdate: <unix_seconds> }`
- `POST /invocations` → chunked streaming plain text
  - Required header: `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id`
  - Body: `{ "prompt": string, "agentName"?: AgentName }`
  - Valid `agentName` values: `coordinatorAgent` (default), `utilityAgent`, `devAgent`, `architectAgent`, `debugAgent`, `devilAdvocateAgent`
