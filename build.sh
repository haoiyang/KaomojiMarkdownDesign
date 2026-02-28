#!/bin/bash
# Build script: concatenates all JS files into a single portable HTML file.
# Usage: bash build.sh
# Output: dist/kaomoji-markdown-design.html

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/src"
DIST="$SCRIPT_DIR/dist"
OUTPUT="$DIST/kaomoji-markdown-design.html"
TMPJS="$DIST/_combined.js.tmp"

mkdir -p "$DIST"

# JS files in dependency order
JS_FILES=(
    "utils/constants.js"
    "utils/boxdraw.js"
    "core/grid.js"
    "core/renderer.js"
    "core/history.js"
    "core/export.js"
    "components/base.js"
    "components/textbox.js"
    "components/box.js"
    "components/button.js"
    "components/input.js"
    "components/line.js"
    "components/arrow.js"
    "components/card.js"
    "components/table.js"
    "components/modal.js"
    "components/tabs.js"
    "components/navbar.js"
    "components/dropdown.js"
    "components/search.js"
    "components/checkbox.js"
    "components/radio.js"
    "components/toggle.js"
    "components/progress.js"
    "components/breadcrumb.js"
    "components/pagination.js"
    "components/separator.js"
    "components/circle.js"
    "components/group.js"
    "components/registry.js"
    "tools/base.js"
    "tools/select.js"
    "tools/text.js"
    "tools/line.js"
    "tools/pencil.js"
    "tools/eraser.js"
    "tools/brush.js"
    "ui/eventbus.js"
    "ui/toolbar.js"
    "ui/palette.js"
    "ui/inspector.js"
    "ui/layers.js"
    "ui/splitter.js"
    "ui/statusbar.js"
    "ui/app.js"
    "ui/bridge.js"
)

# Concatenate all JS into a temp file
> "$TMPJS"
for f in "${JS_FILES[@]}"; do
    filepath="$SRC/$f"
    if [ ! -f "$filepath" ]; then
        echo "ERROR: Missing file: $filepath" >&2
        rm -f "$TMPJS"
        exit 1
    fi
    echo "// --- $f ---" >> "$TMPJS"
    cat "$filepath" >> "$TMPJS"
    echo "" >> "$TMPJS"
done

# Build output: copy HTML up to INJECT marker, inject JS, copy rest
{
    # Print lines up to and including INJECT_JS_START
    sed -n '1,/<!-- INJECT_JS_START -->/p' "$SRC/index.html"
    echo "<script>"
    cat "$TMPJS"
    echo "</script>"
    # Print lines from INJECT_JS_END onward
    sed -n '/<!-- INJECT_JS_END -->/,$p' "$SRC/index.html"
} > "$OUTPUT"

rm -f "$TMPJS"

# Get file size
SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
SIZE_KB=$((SIZE / 1024))

echo "Build complete: $OUTPUT (${SIZE_KB}KB)"
echo "JS files: ${#JS_FILES[@]}"
