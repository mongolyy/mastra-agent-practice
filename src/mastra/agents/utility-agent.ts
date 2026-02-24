import { Agent, createTool } from "@mastra/core";
import { z } from "zod";
import { bedrock, MODELS } from "../bedrock.js";

// ── Tool 1: 現在時刻取得 ──────────────────────────────────────────────────
const getCurrentTimeTool = createTool({
  id: "getCurrentTime",
  description:
    "指定したタイムゾーンの現在時刻を返す。タイムゾーンを省略した場合はUTCを使用する。",
  inputSchema: z.object({
    timezone: z
      .string()
      .default("UTC")
      .describe('IANAタイムゾーン識別子 (例: "Asia/Tokyo", "America/New_York")'),
  }),
  outputSchema: z.object({
    timezone: z.string(),
    currentTime: z.string(),
    isoString: z.string(),
  }),
  execute: async ({ context }) => {
    const { timezone } = context;
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return {
      timezone,
      currentTime: formatter.format(now),
      isoString: now.toISOString(),
    };
  },
});

// ── Tool 2: 四則演算 ──────────────────────────────────────────────────────
const calculateTool = createTool({
  id: "calculate",
  description: "2つの数値の四則演算（加算・減算・乗算・除算）を実行する。",
  inputSchema: z.object({
    a: z.number().describe("1つ目の数値"),
    b: z.number().describe("2つ目の数値"),
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("実行する演算: add(加算), subtract(減算), multiply(乗算), divide(除算)"),
  }),
  outputSchema: z.object({
    a: z.number(),
    b: z.number(),
    operation: z.string(),
    result: z.number(),
    expression: z.string(),
  }),
  execute: async ({ context }) => {
    const { a, b, operation } = context;
    const operatorMap = {
      add: "+",
      subtract: "-",
      multiply: "×",
      divide: "÷",
    } as const;

    let result: number;
    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          throw new Error("ゼロ除算は実行できません");
        }
        result = a / b;
        break;
    }

    const operator = operatorMap[operation];
    return {
      a,
      b,
      operation,
      result,
      expression: `${a} ${operator} ${b} = ${result}`,
    };
  },
});

// ── Tool 3: 乱数生成 ──────────────────────────────────────────────────────
const generateRandomNumberTool = createTool({
  id: "generateRandomNumber",
  description: "指定した範囲内の乱数を生成する。",
  inputSchema: z.object({
    min: z.number().default(0).describe("最小値 (inclusive, デフォルト: 0)"),
    max: z.number().default(100).describe("最大値 (inclusive, デフォルト: 100)"),
  }),
  outputSchema: z.object({
    min: z.number(),
    max: z.number(),
    result: z.number(),
  }),
  execute: async ({ context }) => {
    const { min, max } = context;
    if (min > max) {
      throw new Error(`min (${min}) は max (${max}) 以下でなければなりません`);
    }
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    return { min, max, result };
  },
});

// ── エージェント定義 ──────────────────────────────────────────────────────
export const utilityAgent = new Agent({
  name: "utilityAgent",
  instructions: `あなたは便利な多目的アシスタントです。以下のツールを使用してユーザーのリクエストに応えてください。

利用可能なツール:
- getCurrentTime: タイムゾーンを指定して現在時刻を取得します
- calculate: 2つの数値の四則演算を実行します
- generateRandomNumber: 指定した範囲内の乱数を生成します

ユーザーのリクエストを理解し、適切なツールを選択して実行してください。
結果は日本語でわかりやすく説明してください。`,
  model: bedrock(MODELS.haikuJP),
  tools: {
    getCurrentTimeTool,
    calculateTool,
    generateRandomNumberTool,
  },
});
