#!/bin/bash
# Usage: ./ingest.sh <escaped-json-string>
# Example: ./ingest.sh '"[{\"Brand\":\"ปตท.\",...}]"'
#
# Or pipe from clipboard:
#   pbpaste | ./ingest.sh
#   xclip -o | ./ingest.sh

API_URL="${API_URL:-https://lpnfuel-production.up.railway.app/api/v1}"
API_KEY="${API_KEY:-lpnfuel-dev-key-1980}"

# Read input from argument or stdin
if [ -n "$1" ]; then
  RAW="$1"
else
  RAW=$(cat)
fi

# Remove surrounding quotes and unescape \" → "
JSON=$(echo "$RAW" | sed 's/^"//; s/"$//; s/\\"/"/g')

# Send to API
curl -s -X POST "${API_URL}/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "$JSON" | python3 -m json.tool 2>/dev/null || echo "$JSON" | head -c 200

echo ""
