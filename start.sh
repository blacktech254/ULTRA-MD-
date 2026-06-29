#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║         ULTRA GURU MD — Panel Startup Wrapper               ║
# ║  Keeps the bot running forever; restarts after any exit.    ║
# ╚══════════════════════════════════════════════════════════════╝

export NODE_OPTIONS="--max-old-space-size=512"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          🤖  ULTRA GURU MD v5.0.0  — GURUTECH 😎            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

while true; do
    echo "▶  [$(date '+%Y-%m-%d %H:%M:%S')] Starting bot..."
    node index.js
    EXIT_CODE=$?
    echo ""
    echo "⚠  [$(date '+%Y-%m-%d %H:%M:%S')] Bot exited with code $EXIT_CODE."

    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅  Clean exit. Restarting in 3 seconds..."
        sleep 3
    else
        echo "🔄  Restarting in 5 seconds..."
        sleep 5
    fi
    echo ""
done
