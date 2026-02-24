#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
エージェントチームのHTTPエンドポイントテスト
uv run --with requests scripts/test_team.py で実行
"""
import sys
import uuid
import requests

# Windows (cp932) でも UTF-8 出力できるよう設定
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://localhost:8080"
SESSION_ID = str(uuid.uuid4())
HEADERS = {
    "Content-Type": "application/json",
    "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id": SESSION_ID,
}


def print_section(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)


def test_ping() -> bool:
    print_section("1. ヘルスチェック (/ping)")
    resp = requests.get(f"{BASE_URL}/ping", timeout=5)
    print(f"  Status: {resp.status_code}")
    print(f"  Body:   {resp.json()}")
    return resp.status_code == 200


def test_invocations(prompt: str, agent_name: str | None = None) -> bool:
    label = agent_name or "coordinatorAgent (デフォルト)"
    print_section(f"2. エージェント呼び出し - {label}")
    print(f"  Prompt: {prompt[:80]}")
    print()

    body: dict = {"prompt": prompt}
    if agent_name:
        body["agentName"] = agent_name

    try:
        with requests.post(
            f"{BASE_URL}/invocations",
            headers=HEADERS,
            json=body,
            stream=True,
            timeout=120,
        ) as resp:
            print(f"  Status: {resp.status_code}")
            print(f"  Response (streaming):\n")
            print("  " + "-"*50)

            full_text = ""
            for chunk in resp.iter_content(chunk_size=None, decode_unicode=True):
                if chunk:
                    print(chunk, end="", flush=True)
                    full_text += chunk

            print("\n  " + "-"*50)
            print(f"\n  Total chars: {len(full_text)}")
            return resp.status_code == 200 and len(full_text) > 0

    except requests.Timeout:
        print("  ERROR: Timeout (120s)")
        return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def main() -> None:
    print(f"\n{'*'*60}")
    print("  Mastra エージェントチーム テスト")
    print(f"  Session: {SESSION_ID}")
    print(f"{'*'*60}")

    results = []

    # ヘルスチェック
    results.append(test_ping())

    # チームコーディネーターのテスト (メインのユースケース)
    results.append(test_invocations(
        "Expressサーバーでストリーミングを実装する際の最善策は何ですか？"
        "特にAWS Bedrock AgentCore Runtimeとの統合時の注意点を教えてください。"
    ))

    # 集計
    passed = sum(results)
    print_section(f"テスト結果: {passed}/{len(results)} 成功")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
