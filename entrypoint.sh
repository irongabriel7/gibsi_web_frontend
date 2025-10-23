#!/bin/sh

CONFIG_FILE="/shared/config.yml"

# Start Nginx in background
echo "🌐 Starting Nginx..."
nginx -g "daemon off;" &

# Wait briefly for Nginx to be ready
sleep 2

# Check if ngrok config exists
if [ -f "$CONFIG_FILE" ]; then
  echo "🚀 Starting ngrok using config: $CONFIG_FILE"

  # Optional: automatically authenticate if NGROK_AUTHTOKEN is set
  if [ ! -z "$NGROK_AUTHTOKEN" ]; then
    ngrok config add-authtoken "$NGROK_AUTHTOKEN"
  fi

  # Start ngrok with v3 CLI
  ngrok start --all --config "$CONFIG_FILE" &
else
  echo "❌ Ngrok config not found at $CONFIG_FILE — skipping ngrok start."
fi

# Keep the container alive
tail -f /dev/null
