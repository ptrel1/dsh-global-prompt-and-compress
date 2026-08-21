#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# dsh-global-prompt 打包脚本 (PostSup 标准格式)
# ============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="${1:-$(node -p "require('./package.json').version" 2>/dev/null || echo "0.1.0")}"
OUT_DIR="$ROOT_DIR/update_package"
mkdir -p "$OUT_DIR"

ZIP_NAME="dsh-global-prompt-v${VERSION}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"
rm -f "$ZIP_PATH"

echo "📦 正在打包 dsh-global-prompt v${VERSION}..."

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

cat > "$TEMP_DIR/version.json" <<EOF
{
  "name": "dsh-global-prompt",
  "type": "full",
  "to_version": "v${VERSION}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "files_changed": {
    "A": ["lib/", "cordis.patch.yml", "package.json", "app.toml", "README.md"],
    "M": [],
    "D": []
  }
}
EOF

zip -q -r "$ZIP_PATH" \
  lib/ \
  cordis.patch.yml \
  package.json \
  app.toml \
  README.md \
  .gitignore

cd "$TEMP_DIR"
zip -q -u "$ZIP_PATH" version.json
cd "$ROOT_DIR"

echo "✅ 打包完成: $ZIP_PATH"
echo "📏 包大小: $(du -h "$ZIP_PATH" | cut -f1)"
