from flask import Flask, request, jsonify
import asyncio
import httpx
import base64
import os
from urllib.parse import unquote_plus

app = Flask(__name__)

# 从环境变量读取敏感信息（推荐）
CF_ACCOUNT_ID = "719f87bc8681446927abc561bc028529"
CF_API_TOKEN = "bS4sa5naHsS78TTLOEJKKOElcIudss5aFqBTZijA"

if not CF_ACCOUNT_ID or not CF_API_TOKEN:
    raise EnvironmentError("请设置环境变量: CF_ACCOUNT_ID 和 CF_API_TOKEN")

RUN_URL = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/@cf/openai/whisper-large-v3-turbo"

async def transcribe_from_url(audio_url: str, initial_prompt: str = "") -> dict:
    """
    1. 从 URL 下载音频 → 内存 (bytes)
    2. 转为 Base64 字符串
    3. 调用 Cloudflare Whisper API
    """
    # === 步骤 1: 下载到内存 ===
    async with httpx.AsyncClient() as client:
        response = await client.get(audio_url)
        response.raise_for_status()
        audio_bytes = response.content  # ← 纯内存，未写入磁盘！

    # === 步骤 2: 转 Base64 ===
    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')

    # === 步骤 3: 请求 Cloudflare AI ===
    payload = {
        "audio": audio_b64,
        "task": "transcribe",
        "vad_filter": True,
        "initial_prompt": initial_prompt.strip()
    }

    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",  # ← 已补全！
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        ai_resp = await client.post(RUN_URL, json=payload, headers=headers)
        ai_resp.raise_for_status()
        return ai_resp.json()

@app.route('/asr')
def asr():
    audio_url = request.args.get('audio')
    prompt = request.args.get('text', '')

    if not audio_url:
        return jsonify({"error": "缺少 audio 参数"}), 400

    try:
        # URL 解码（支持中文提示或含特殊字符的 URL）
        audio_url = unquote_plus(audio_url)
        prompt = unquote_plus(prompt)

        # 在同步 Flask 视图中运行异步函数
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(transcribe_from_url(audio_url, prompt))
        loop.close()

        return jsonify({
            "text": result.get("text", ""),
            "info": result.get("transcription_info", {})
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    return '''
    <h3>Whisper ASR (Cloudflare + 内存处理)</h3>
    <p>示例：<br>
    <code>/asr?audio=https://example.com/speech.mp3&text=普通话内容</code>
    </p>
    '''

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
