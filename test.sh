#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:3000}
SRC_LANG=en-US
DST_LANG=it-IT
POLL_INTERVAL=10      # seconds
MAX_WAIT=600          # 10 min

echo "🔧 Base URL: $BASE_URL"
echo "🆕 Creating order…"

ORDER_JSON=$(curl -s -X POST "$BASE_URL/orders" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Test $(date +%T)\",\"sourceLang\":\"$SRC_LANG\",\"targetLang\":\"$DST_LANG\"}")
ORDER_ID=$(echo "$ORDER_JSON" | jq -r '.id')
echo "✅ Order id=$ORDER_ID"

echo "➕ Adding texts…"
curl -s -X POST "$BASE_URL/orders/$ORDER_ID/texts" \
  -H 'Content-Type: application/json' \
  -d '{"content":"Hello world!"}'  > /dev/null
curl -s -X POST "$BASE_URL/orders/$ORDER_ID/texts" \
  -H 'Content-Type: application/json' \
  -d '{"content":"How are you today?"}' > /dev/null
echo "✅ Added 2"

echo "🚀 Submitting…"
curl -s -X POST "$BASE_URL/orders/$ORDER_ID/submit" > /dev/null
echo "✅ Submitted"

echo -n "⏳ Waiting for delivery"; echo
ELAPSED=0
while (( ELAPSED < MAX_WAIT )); do
  ORDER=$(curl -s "$BASE_URL/orders/$ORDER_ID")
  DELIVERED=$(echo "$ORDER" | jq '[.texts[].status]|all(.=="delivered")')
  if [[ "$DELIVERED" == "true" ]]; then
    echo; echo "🎉 Delivered!"
    break
  fi
  STATUSES=$(echo "$ORDER" | jq -r '[.texts[].status]|join(",")')
  echo -n "($STATUSES)"; echo
  sleep "$POLL_INTERVAL"
  (( ELAPSED += POLL_INTERVAL ))
done

if (( ELAPSED >= MAX_WAIT )); then
  echo; echo "⚠️  Timeout after $MAX_WAIT s:"
  echo "$ORDER" | jq '.texts[] | {id,status}'
  exit 1
fi

echo; echo "📦 Final payload:"
echo "$ORDER" | jq '.texts[] | select(.content != null) | {id,content,translatedContent,status}'
