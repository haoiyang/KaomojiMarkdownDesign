# KaomojiMarkdownDesign

A browser-based ASCII wireframe editor for designing UI mockups using Unicode box-drawing characters. Compiles into a single portable HTML file with zero external dependencies.

## What It Does

- **20 UI component types**: Button, Input, Box, Card, Table, Modal, Tabs, NavBar, Dropdown, Search, Checkbox, Radio, Toggle, Progress, Breadcrumb, Pagination, TextBox, Line, Arrow, Separator
- **5 border styles**: single (`┌─┐`), heavy (`┏━┓`), double (`╔═╗`), rounded (`╭─╮`), ASCII (`+-+`)
- **Interactive tools**: Select/Move/Resize, Pencil, Eraser, Brush for freehand drawing
- **Full editor UI**: Inspector panel, Layers panel with z-ordering, drag-and-drop from palette
- **Export**: Copy as Markdown, Save/Load JSON files, auto-save to localStorage
- **Keyboard shortcuts**: Undo/Redo, Copy/Paste/Cut, tool switching, Delete
- **Dark theme** with Catppuccin-inspired color palette

## Quick Start

### Development (multi-file)
Open `src/index.html` in a browser. Scripts load via individual `<script>` tags.

### Production (single file)
```bash
bash build.sh
# Output: dist/kaomoji-markdown-design.html (99KB)
open dist/kaomoji-markdown-design.html
```

The single HTML file works from `file://` — no server needed.

## Architecture

MVC pattern with HTML5 Canvas rendering:

```
App (orchestrator)
├── CharGrid (80×40 char buffer + compositing)
├── CanvasRenderer (fillText per cell)
├── UndoManager (50-level snapshot stack)
├── EventBus (pub/sub)
├── Tools (Select, Pencil, Eraser, Brush)
├── Components (20 types via ComponentRegistry)
└── UI Panels (Toolbar, Palette, Inspector, Layers, StatusBar)
```

See [CLAUDE.md](CLAUDE.md) for the full development plan.

## Dependencies

**Runtime**: None (HTML5 Canvas, DOM, localStorage, Clipboard API — all browser-native)
**Build**: `bash` (for build.sh)
**Browser**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
**Font**: System monospace (`"Courier New", "Courier", monospace`)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| V / T / L / A / P / E / B | Select / Text / Line / Arrow / Pencil / Eraser / Brush |
| Ctrl+Z / Ctrl+Shift+Z | Undo / Redo |
| Ctrl+C / Ctrl+V / Ctrl+X | Copy / Paste / Cut component |
| Ctrl+Shift+C | Copy as Markdown |
| Ctrl+S | Save to file |
| Delete / Backspace | Delete selected |
| Escape | Deselect |
| Double-click | Edit text inline |
