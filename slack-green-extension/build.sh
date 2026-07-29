#!/usr/bin/env bash
# 웹스토어 업로드용 zip 생성. 개발 파일(tools, README, build.sh, dist)은 제외.
#   ./build.sh
# 결과: dist/green-bean-extension-v<version>.zip
set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(node -e "console.log(require('./manifest.json').version)")
OUT="dist/green-bean-extension-v${VERSION}.zip"

# 아이콘이 없으면 먼저 생성
if [ ! -f icons/icon128.png ]; then
  echo "icons 없음 → 생성"
  node tools/generate-icons.mjs
fi

mkdir -p dist
rm -f "$OUT"

# 스토어에 포함할 것만 담는다.
zip -r "$OUT" \
  manifest.json \
  src \
  icons \
  -x "*.DS_Store" >/dev/null

echo "✅ 생성됨: $OUT"
echo "포함된 파일:"
unzip -l "$OUT" | awk 'NR>3 && $4!="" {print "  " $4}'
