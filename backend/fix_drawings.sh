#!/bin/bash
# fix_drawings.sh
# 
# Uploads each improved SVG to Stratus via the /upload endpoint (temp drawing),
# then reads back the raw stratus:// key from the DB via a raw endpoint,
# patches the original drawing with that stratus:// key, and deletes the temp drawing.
#
# We use the /api/drawings/:id raw endpoint (returns fileUrl as-is from DB).
# But the server always resolves stratus:// on GET... so instead we:
#   1. Upload temp → get temp.id
#   2. Check what the GET returns (signed URL starts with https://buildtrack-development.zohostratus.in)
#   3. PATCH the original with that same signed URL (7-day life is fine, server re-resolves it)
#
# Actually the CORRECT approach: PATCH original drawing's raw fileUrl with "stratus://drawings/<uuid>.svg+xml"
# We know the key pattern from the upload response fileUrl.
# The signed URL looks like: https://buildtrack-development.zohostratus.in/_signed/drawings/<uuid>.svg+xml?...
# The raw key is: drawings/<uuid>.svg+xml
# We store stratus://drawings/<uuid>.svg+xml in the DB.

BASE="https://construction-backend-50044693287.development.catalystappsail.in/api"
DIR="/Users/ashok-14955/construction-drawing-app/backend/assets/improved-drawings"
PROJECT_ID="b0af18f2-99dc-4ab8-8496-09d779343c8b"

# drawing_id | file | gridCols | gridRows
declare -a DRAWINGS=(
  "ab7b4fc3-2641-4a22-a0cd-e17c33f73d00|foundation-plan.svg|Foundation Plan|3|2"
  "ded710c4-2eb9-41c3-a235-d24ee29263d6|ground-floor-plan.svg|Ground Floor Plan|4|2"
  "12b0ce29-ff25-46d2-bc99-fb8c3529bc79|roof-plan.svg|Roof Plan|3|3"
  "628bde45-dcdc-4ae5-b635-4e6301496968|electrical-layout-plan.svg|Electrical Layout Plan|6|3"
  "e2cab291-8be9-467d-b334-24fd13ccd4a1|plumbing-and-drainage-plan.svg|Plumbing and Drainage Plan|4|3"
  "3efd90a6-309c-4497-b41b-28c347ea0122|interior-finishing-plan.svg|Interior Finishing Plan|4|3"
)

for entry in "${DRAWINGS[@]}"; do
  IFS='|' read -r ORIG_ID FILE NAME COLS ROWS <<< "$entry"
  echo ""
  echo "━━━ $NAME ━━━"

  # 1. Upload as temp drawing
  echo "  📤 Uploading to Stratus..."
  UPLOAD_RESP=$(curl -s -X POST "$BASE/drawings/upload" \
    -F "file=@$DIR/$FILE;type=image/svg+xml" \
    -F "name=$NAME _TEMP_" \
    -F "projectId=$PROJECT_ID" \
    -F "gridCols=$COLS" \
    -F "gridRows=$ROWS")

  TEMP_ID=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
  SIGNED_URL=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('fileUrl',''))" 2>/dev/null)
  ERR=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null)

  if [ -z "$TEMP_ID" ] || [ "$TEMP_ID" = "None" ]; then
    echo "  ❌ Upload failed: $ERR"
    echo "     Response: $(echo "$UPLOAD_RESP" | head -c 200)"
    continue
  fi
  echo "  ✅ Uploaded (temp_id=$TEMP_ID)"

  # 2. Extract the raw Stratus key from the signed URL
  # Format: https://buildtrack-development.zohostratus.in/_signed/drawings/<uuid>.svg+xml?...
  # Raw key = drawings/<uuid>.svg+xml
  RAW_KEY=$(echo "$SIGNED_URL" | python3 -c "
import sys, re
url = sys.stdin.read().strip()
m = re.search(r'/_signed/(.+?)\\?', url)
print(m.group(1) if m else '')
")

  if [ -z "$RAW_KEY" ]; then
    echo "  ⚠️  Could not extract raw key from: ${SIGNED_URL:0:100}"
    echo "  📝 Will store signed URL directly (will expire in 7 days)"
    STORE_URL="$SIGNED_URL"
  else
    STORE_URL="stratus://$RAW_KEY"
    echo "  🔑 Raw key: $STORE_URL"
  fi

  # 3. PATCH the original drawing with the stratus:// key
  echo "  🔧 Patching original drawing $ORIG_ID..."
  PATCH_RESP=$(curl -s -X PATCH "$BASE/drawings/$ORIG_ID" \
    -H "Content-Type: application/json" \
    -d "{\"fileUrl\": \"$STORE_URL\"}")

  PATCH_ID=$(echo "$PATCH_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
  if [ -n "$PATCH_ID" ] && [ "$PATCH_ID" != "None" ]; then
    echo "  ✅ Original drawing updated"
  else
    echo "  ❌ Patch failed: $(echo "$PATCH_RESP" | head -c 200)"
  fi

  # 4. Delete temp drawing
  echo "  🗑️  Deleting temp drawing..."
  curl -s -X DELETE "$BASE/drawings/$TEMP_ID" > /dev/null
  echo "  ✅ Cleaned up"
done

echo ""
echo "✅ All done! Open: https://buildtrack-withdrawing.onslate.in/projects"
