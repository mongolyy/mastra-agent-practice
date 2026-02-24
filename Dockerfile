# ── Build stage ──────────────────────────────────────────────────────────
FROM --platform=linux/arm64 public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

# 依存関係インストール (package-lock.json があれば ci を使用)
COPY package.json package-lock.json* ./
RUN npm ci

# TypeScript ソースをコピーしてビルド
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM --platform=linux/arm64 public.ecr.aws/docker/library/node:20-alpine AS runtime

WORKDIR /app

# production 依存関係のみインストール
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist

# AgentCore Runtime が要求するポート
ENV PORT=8080
EXPOSE 8080

# 非rootユーザーで実行 (セキュリティベストプラクティス)
USER node

CMD ["node", "dist/index.js"]
