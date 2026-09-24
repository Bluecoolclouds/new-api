#!/usr/bin/env python3
"""
apinet-canary: Autonomous Upstream Synthetic Health & Quota Heartbeat Daemon.
Probes active channels continuously with 1-token micro-requests to detect
upstream wallet depletions, outages, and degraded latencies before customers hit them.
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

DB_PASS = os.environ.get("DB_PASS", "newapi_pass_2024")
STATUS_JSON_PATH = os.environ.get("STATUS_JSON_PATH", "/root/apinet/logs/canary-status.json")
LOG_PATH = os.environ.get("LOG_PATH", "/root/apinet/logs/canary.log")

handlers = [logging.StreamHandler(sys.stdout)]
try:
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    handlers.append(logging.FileHandler(LOG_PATH))
except (PermissionError, OSError):
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=handlers,
)

CANARY_MODEL_PREFERENCES = [
    "gemini-3.8-flash",
    "gpt-5.4-mini",
    "deepseek-v4-pro",
    "gpt-5.5",
    "glm-5.3-flash",
    "ERNIE-4.5-Turbo",
]


def get_active_channels():
    sql = "SELECT id, name, base_url, key, models FROM channels WHERE status = 1 ORDER BY id;"
    cmd = [
        "psql",
        "-h",
        "127.0.0.1",
        "-U",
        "newapi",
        "-d",
        "newapi",
        "-t",
        "-A",
        "-F",
        "\t",
        "-c",
        sql,
    ]
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASS
    res = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if res.returncode != 0:
        logging.error(f"Failed to query PostgreSQL: {res.stderr.strip()}")
        return []

    channels = []
    for line in res.stdout.strip().splitlines():
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) >= 5:
            cid, name, base_url, key, models_str = parts[:5]
            models = [m.strip() for m in models_str.split(",") if m.strip()]
            channels.append({
                "id": int(cid),
                "name": name,
                "base_url": base_url.rstrip("/"),
                "key": key,
                "models": models,
            })
    return channels


def select_probe_model(channel):
    for pref in CANARY_MODEL_PREFERENCES:
        if pref in channel["models"]:
            return pref
    non_chat_kw = ("*", "image", "video", "tts", "voice", "audio", "speech")
    for m in channel["models"]:
        m_lower = m.lower()
        if not any(k in m_lower for k in non_chat_kw):
            return m
    return channel["models"][0] if channel["models"] else "gpt-4o-mini"


def probe_channel(ch, model, timeout=10):
    is_media = any(k in ch["name"].lower() for k in ("img", "video", "image", "transcribe", "audio", "speech"))
    if is_media:
        base = ch["base_url"].split("/v1/")[0]
        url = f"{base}/v1/models"
        headers = {
            "Authorization": f"Bearer {ch['key']}",
            "User-Agent": "Apinet-Canary/2026.09",
        }
        req = urllib.request.Request(url, headers=headers, method="GET")
    else:
        url = f"{ch['base_url']}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {ch['key']}",
            "Content-Type": "application/json",
            "User-Agent": "Apinet-Canary/2026.09",
        }
        payload = json.dumps({
            "model": model,
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 1,
        }).encode("utf-8")
        req = urllib.request.Request(
            url, data=payload, headers=headers, method="POST"
        )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            latency_ms = int((time.time() - t0) * 1000)
            return {
                "status": "HEALTHY",
                "http_code": resp.status,
                "latency_ms": latency_ms,
                "detail": "OK",
            }
    except urllib.error.HTTPError as e:
        latency_ms = int((time.time() - t0) * 1000)
        body = e.read().decode("utf-8", errors="replace")[:200]

        # Check quota depletion
        body_lower = body.lower()
        if (
            "user quota is not enough" in body_lower
            or "quota is not enough" in body_lower
            or "insufficient_balance" in body_lower
            or "insufficient account balance" in body_lower
            or "balance is insufficient" in body_lower
        ):
            return {
                "status": "QUOTA_DEPLETED",
                "http_code": e.code,
                "latency_ms": latency_ms,
                "detail": "Upstream master account wallet is OUT OF CREDITS!",
            }
        if e.code == 429:
            return {
                "status": "RATE_LIMITED",
                "http_code": 429,
                "latency_ms": latency_ms,
                "detail": body[:100],
            }
        if e.code in (401, 403):
            return {
                "status": "AUTH_OR_ROUTING_FAIL",
                "http_code": e.code,
                "latency_ms": latency_ms,
                "detail": body[:100],
            }
        return {
            "status": "HTTP_ERROR",
            "http_code": e.code,
            "latency_ms": latency_ms,
            "detail": body[:100],
        }
    except Exception as e:
        latency_ms = int((time.time() - t0) * 1000)
        return {
            "status": "UNREACHABLE",
            "http_code": 0,
            "latency_ms": latency_ms,
            "detail": str(e)[:100],
        }


def run_heartbeat():
    channels = get_active_channels()
    results = {}

    for ch in channels:
        if ch["id"] == 9:  # together-img
            continue

def quarantine_channel(ch_id: int, reason: str) -> bool:
    """
    Active Auto-Quarantine:
    Immediately disables a failing/depleted channel in PostgreSQL (status = 2)
    to prevent NewAPI from continuing to route customer traffic to it.
    """
    sql = f"UPDATE channels SET status = 2 WHERE id = {ch_id} AND status = 1;"
    cmd = [
        "psql",
        "-h",
        "127.0.0.1",
        "-U",
        "newapi",
        "-d",
        "newapi",
        "-c",
        sql,
    ]
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASS
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, env=env)
        if res.returncode == 0:
            logging.warning(
                f"🛑 [AUTO-QUARANTINE] Channel #{ch_id} auto-disabled in DB (status=2). Reason: {reason}. Prevented cascading 500 errors to customers."
            )
            return True
        else:
            logging.error(f"Failed to quarantine channel #{ch_id}: {res.stderr.strip()}")
            return False
    except Exception as e:
        logging.error(f"Failed to execute quarantine psql command: {e}")
        return False


def run_heartbeat(auto_quarantine: bool = False):
    channels = get_active_channels()
    if not channels:
        logging.warning("No active channels found in database.")
        return {}

    results = {}
    for ch in channels:
        model = select_probe_model(ch)
        res = probe_channel(ch, model)
        results[ch["id"]] = {
            "name": ch["name"],
            "base_url": ch["base_url"],
            "model": model,
            "last_check": int(time.time()),
            **res,
        }

        icon = "✅" if res["status"] == "HEALTHY" else "⚠️"
        if res["status"] in ("QUOTA_DEPLETED", "AUTH_REVOKED"):
            icon = "🚨"
            logging.critical(
                f"{icon} CHANNEL #{ch['id']} ({ch['name']}) CRITICAL FAILURE ({res['status']})! Detail: {res['detail']}"
            )
            if auto_quarantine:
                quarantine_channel(ch["id"], res["status"])
        else:
            logging.info(
                f"{icon} Channel #{ch['id']} ({ch['name']}) [{model}] -> {res['status']} ({res['latency_ms']}ms, HTTP {res['http_code']})"
            )

    try:
        os.makedirs(os.path.dirname(STATUS_JSON_PATH), exist_ok=True)
        with open(STATUS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
    except Exception as e:
        logging.error(f"Failed to write status json: {e}")

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Apinet Synthetic Canary Daemon"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single heartbeat check and exit",
    )
    parser.add_argument(
        "--auto-quarantine",
        action="store_true",
        help="Automatically disable channels (status=2) in DB when QUOTA_DEPLETED or AUTH_REVOKED is detected",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Check interval in seconds (default: 60)",
    )
    args = parser.parse_args()

    if args.once:
        run_heartbeat(auto_quarantine=args.auto_quarantine)
        sys.exit(0)

    logging.info(f"Starting apinet-canary daemon (interval: {args.interval}s, auto_quarantine: {args.auto_quarantine})...")
    while True:
        try:
            run_heartbeat(auto_quarantine=args.auto_quarantine)
        except Exception as e:
            logging.error(f"Unhandled canary loop exception: {e}")
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
