"""Start the API server: niyam-api [--port 8000]."""

import argparse

import uvicorn


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8000)
    a = ap.parse_args()
    uvicorn.run("niyam.api:app", host=a.host, port=a.port, proxy_headers=True, forwarded_allow_ips="*")
