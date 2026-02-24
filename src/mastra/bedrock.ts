import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromSSO } from "@aws-sdk/credential-providers";

// AWS_PROFILE が設定されている場合は SSO 認証、
// それ以外は環境変数 (AWS_ACCESS_KEY_ID 等) やインスタンスメタデータを使用
const awsProfile = process.env["AWS_PROFILE"];
const baseConfig = { region: process.env["AWS_REGION"] ?? "ap-northeast-1" };

export const bedrock = createAmazonBedrock(
  awsProfile
    ? { ...baseConfig, credentialProvider: fromSSO({ profile: awsProfile }) }
    : baseConfig,
);

// ap-northeast-1 で利用可能な推論プロファイル
// JP: ap-northeast-1 + ap-northeast-3 のクロスリージョン
export const MODELS = {
  haikuJP: "jp.anthropic.claude-haiku-4-5-20251001-v1:0",
  sonnetJP: "jp.anthropic.claude-sonnet-4-6",
  haiku3APAC: "apac.anthropic.claude-3-haiku-20240307-v1:0",
} as const;
