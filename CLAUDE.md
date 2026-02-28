# KaomojiMarkdownDesign

## 1. Project Overview

Browser-based ASCII wireframe editor for designing UI mockups using Unicode box-drawing characters. Compiles into a single portable HTML file (164KB) with zero external dependencies. Inspired by [mockdown.design](https://www.mockdown.design/).

`$PROJECT_ROOT` = this directory (`${PYTHON_WS}/KaomojiMarkdownDesign`)

**Quick Reference:**
```bash
# Development (multi-file, script tags)
open $PROJECT_ROOT/src/index.html

# Build single-file dist
bash $PROJECT_ROOT/build.sh
# Output: $PROJECT_ROOT/dist/kaomoji-markdown-design.html (150KB)
```

**Key Files:**

| File | Purpose |
|------|---------|
| `src/index.html` | HTML shell + all CSS + `<script>` tags in dependency order |
| `src/utils/constants.js` | All global constants: grid size, colors, shortcuts, tool defs |
| `src/utils/boxdraw.js` | `BORDER_CHARS` lookup table (5 styles × 15 positions) + helper functions |
| `src/core/grid.js` | `CharGrid` class: 2D char buffer + compositing |
| `src/core/renderer.js` | `CanvasRenderer` class: HTML5 Canvas `fillText` per cell |
| `src/core/history.js` | `UndoManager` class: 50-level snapshot undo/redo |
| `src/core/export.js` | `ExportUtils` object: clipboard, file, localStorage I/O |
| `src/components/base.js` | `BaseComponent` abstract class + `_componentIdCounter` |
| `src/components/registry.js` | `ComponentRegistry` factory + `ELEMENT_PALETTE` array |
| `src/components/group.js` | `GroupComponent`: container for MkGroup/DeGroup |
| `src/components/*.js` | 20 component type files (one class each) |
| `src/tools/base.js` | `BaseTool` interface class |
| `src/tools/select.js` | `SelectTool`: click/drag/resize with 8 handles + marquee |
| `src/tools/pencil.js` | `PencilTool`: freehand `*` char drawing |
| `src/tools/eraser.js` | `EraserTool`: set chars to space |
| `src/tools/brush.js` | `BrushTool`: draw with box-drawing chars (h/v auto-detect) |
| `src/ui/app.js` | `App` class: main orchestrator, event binding, all actions |
| `src/ui/eventbus.js` | `EventBus` class: simple pub/sub |
| `src/ui/toolbar.js` | `ToolbarUI`: top button bar binding |
| `src/ui/palette.js` | `PaletteUI`: left panel tools + element library |
| `src/ui/inspector.js` | `InspectorUI`: right panel property editor |
| `src/ui/layers.js` | `LayersUI`: right panel component list (header: "Components") |
| `src/ui/statusbar.js` | `StatusBarUI`: bottom info bar |
| `src/ui/bridge.js` | `KaomojiBridge`: WebSocket client for MCP server communication |
| `build.sh` | Bash script: concatenate 46 JS files into single HTML |
| `dist/kaomoji-markdown-design.html` | Portable single-file output |

---

## 2. Development Plan

### 2.1 Goal

Create a browser-based ASCII wireframe editor that:
1. Renders UI mockups using Unicode box-drawing characters on an 80×40 character grid
2. Provides 20 pre-built UI component types with 5 border styles
3. Supports interactive editing: select, move, resize, draw, undo/redo
4. Exports to Markdown code blocks for documentation
5. Compiles into a single portable HTML file with zero external dependencies
6. Uses a dark theme inspired by Catppuccin Mocha

### 2.2 Overview

**Architecture**: MVC with HTML5 Canvas rendering.

```
App (orchestrator)
├── EventBus (pub/sub)
├── CharGrid (80×40 model — 2D string[][])
├── CanvasRenderer (view — fillText per cell)
├── UndoManager (50-level snapshot JSON.stringify)
├── ComponentRegistry (factory + deserialize)
│   └── 20 Component types (each renders to local char[][])
├── Tools (strategy pattern)
│   ├── SelectTool (move/resize/marquee)
│   ├── PencilTool (freehand '*')
│   ├── EraserTool (set to space)
│   └── BrushTool (box-drawing h/v)
└── UI Panels
    ├── ToolbarUI (top action buttons)
    ├── PaletteUI (left: tools + elements + draw)
    ├── InspectorUI (right: property editor)
    ├── LayersUI (right: z-order list)
    └── StatusBarUI (bottom info)
```

**Rendering Pipeline** (called on every state change):
1. `App.render()` calls `grid.composite(visibleComponents)`
2. `CharGrid.composite()`: sort by zIndex ascending → each component's `render()` returns local `char[][]` → `_blit()` non-space chars onto grid
3. `App.render()` builds overlays object from active tool
4. `CanvasRenderer.render(grid, overlays)`: clear canvas → draw grid lines → `fillText` each non-space cell → draw overlay layers (cursor, selection, handles, marquee, preview)

**Why Canvas not DOM `<pre>`**: Precise per-character pixel positioning, efficient 3200-cell rendering loop, trivial `floor(px/charWidth)` mouse-to-grid mapping, overlay support without z-index juggling.

**Font**: System monospace `"Courier New", "Courier", monospace` — zero external deps. `charWidth` measured at startup via `ctx.measureText('M').width` (ceil'd). `charHeight = ceil(fontSize * 1.5)`.

### 2.3 Features

#### 2.3.1 Component Library (20 types)

| # | Type | Class | ASCII Pattern | Default W×H | Min W×H | Props |
|---|------|-------|---------------|-------------|---------|-------|
| 1 | `textbox` | `TextBoxComponent` | Free text (multi-line via `\n`) | 10×1 | 1×1 | `text: 'Text'` |
| 2 | `box` | `BoxComponent` | `┌─┐│ │└─┘` rectangle | 12×6 | 3×3 | — |
| 3 | `button` | `ButtonComponent` | `[ Label ]` | 10×1 | 5×1 | `label: 'Button'` |
| 4 | `input` | `InputComponent` | `[___________]` or `[placeholder]` | 16×1 | 5×1 | `placeholder: ''` |
| 5 | `card` | `CardComponent` | Box + title row + `├──┤` divider at row 2 | 20×8 | 5×4 | `title: 'Card Title'` |
| 6 | `table` | `TableComponent` | Outer box + `┬┼┴` vertical dividers + header divider | 24×7 | 5×4 | `cols:3, rows:3, headers:['Col1','Col2','Col3']` |
| 7 | `modal` | `ModalComponent` | Box + title + `×` close + header divider + action row `[ Cancel ] [ OK ]` | 30×12 | 10×6 | `title: 'Modal Title'` |
| 8 | `tabs` | `TabsComponent` | `[Active] Tab2 Tab3` + `───` underline | 30×2 | 8×2 | `tabs:['Tab 1','Tab 2','Tab 3'], activeIndex:0` |
| 9 | `navbar` | `NavBarComponent` | `Logo  Home  About  Contact  [Sign In]` | 40×1 | 10×1 | `logo:'Logo', links:['Home','About','Contact'], action:'Sign In'` |
| 10 | `dropdown` | `DropdownComponent` | `[Option   ▾]` | 14×1 | 5×1 | `value: 'Option'` |
| 11 | `search` | `SearchComponent` | `[/ Search...     ]` | 20×1 | 8×1 | `placeholder: 'Search...'` |
| 12 | `checkbox` | `CheckboxComponent` | `[x] Label` / `[ ] Label` | 12×1 | 4×1 | `label:'Option', checked:true` |
| 13 | `radio` | `RadioComponent` | `(o) Label` / `( ) Label` | 12×1 | 4×1 | `label:'Option', selected:true` |
| 14 | `toggle` | `ToggleComponent` | `[━●] On` / `[●━] Off` | 8×1 | 5×1 | `on:true, label:''` |
| 15 | `progress` | `ProgressComponent` | `[████░░░░] 50%` | 16×1 | 8×1 | `value: 50` |
| 16 | `breadcrumb` | `BreadcrumbComponent` | `Home > Docs > About` | 24×1 | 5×1 | `items:['Home','Docs','About']` |
| 17 | `pagination` | `PaginationComponent` | `< 1 [2] 3 4 5 >` | 16×1 | 7×1 | `pages:5, current:1` |
| 18 | `separator` | `SeparatorComponent` | `────────────────────` | 20×1 | 2×1 | — |
| 19 | `line` | `LineComponent` | `────────` or `│` (vertical) | 8×1 | 1×1 | `orientation:'horizontal'` |
| 20 | `arrow` | `ArrowComponent` | `───────→` or `↓` | 8×1 | 2×1 | `orientation:'horizontal', direction:'right'` |

#### 2.3.2 Border Styles (5)

| Style | tl | t | tr | l | r | bl | b | br | h | v | cross | tee_down | tee_up | tee_right | tee_left |
|-------|----|----|----|----|----|----|----|----|----|----|-------|----------|--------|-----------|----------|
| `single` | `┌` | `─` | `┐` | `│` | `│` | `└` | `─` | `┘` | `─` | `│` | `┼` | `┬` | `┴` | `├` | `┤` |
| `heavy` | `┏` | `━` | `┓` | `┃` | `┃` | `┗` | `━` | `┛` | `━` | `┃` | `╋` | `┳` | `┻` | `┣` | `┫` |
| `double` | `╔` | `═` | `╗` | `║` | `║` | `╚` | `═` | `╝` | `═` | `║` | `╬` | `╦` | `╩` | `╠` | `╣` |
| `rounded` | `╭` | `─` | `╮` | `│` | `│` | `╰` | `─` | `╯` | `─` | `│` | `┼` | `┬` | `┴` | `├` | `┤` |
| `ascii` | `+` | `-` | `+` | `\|` | `\|` | `+` | `-` | `+` | `-` | `\|` | `+` | `+` | `+` | `+` | `+` |

Arrow characters: `right: →`, `left: ←`, `up: ↑`, `down: ↓`

#### 2.3.3 Tools (7)

| Tool | Class | Key | Icon | Cursor | Behavior |
|------|-------|-----|------|--------|----------|
| Select | `SelectTool` | V | `◇` | `default` | Click: hit-test + select. Drag: move. Handle-drag: resize. Empty-drag: marquee |
| Text | (uses `SelectTool`) | T | `T` | `default` | Same as Select (double-click to edit text inline) |
| Line | (uses `SelectTool`) | L | `─` | `default` | Same as Select |
| Arrow | (uses `SelectTool`) | A | `→` | `default` | Same as Select |
| Pencil | `PencilTool` | P | `✎` | `crosshair` | Draw `*` chars on freehand layer |
| Eraser | `EraserTool` | E | `◻` | `crosshair` | Set chars to space on freehand layer |
| Brush | `BrushTool` | B | `▓` | `crosshair` | Draw `─` (horizontal) or `│` (vertical) based on movement direction |

#### 2.3.4 Editor Features
- **Undo/Redo**: 50-level snapshot stack via `JSON.stringify(components.map(c => c.serialize()))`
- **Copy/Paste/Cut**: Serialize selected component to clipboard object, paste with +2/+1 offset
- **Inline text editing**: Double-click on component with `text`/`label`/`title` prop → position `<textarea>` over component, Enter to commit, Escape to cancel
- **Drag-and-drop**: HTML5 drag from palette `elem-item` → drop on canvas → `addComponentAt(type, col, row)`
- **Auto-save**: `setInterval(30000)` → `ExportUtils.saveToLocalStorage(components)` → loads on startup
- **Save/Load file**: JSON file with `.kaomoji.json` extension via `Blob`+`URL.createObjectURL` / `FileReader`
- **Copy Markdown**: Composite grid → `exportAsMarkdown()` → `navigator.clipboard.writeText()` with `execCommand('copy')` fallback

#### 2.3.5 Keyboard Shortcuts

All `ctrl+` shortcuts have `meta+` (macOS Cmd) equivalents. Shortcuts are ignored when focus is on `INPUT`, `TEXTAREA`, or `SELECT` elements.

| Key | Action |
|-----|--------|
| `ctrl+z` / `meta+z` | `undo` |
| `ctrl+shift+z` / `meta+shift+z` | `redo` |
| `ctrl+y` / `meta+y` | `redo` |
| `ctrl+c` / `meta+c` | `copy` |
| `ctrl+v` / `meta+v` | `paste` |
| `ctrl+x` / `meta+x` | `cut` |
| `ctrl+a` / `meta+a` | `selectAll` (selects last component) |
| `ctrl+s` / `meta+s` | `save` (file download) |
| `ctrl+shift+s` / `meta+shift+s` | `saveAs` |
| `ctrl+n` / `meta+n` | `new` (clear canvas with confirm) |
| `ctrl+shift+c` / `meta+shift+c` | `copyMarkdown` |
| `Delete` / `Backspace` | `delete` selected |
| `Escape` | `deselect` |
| `v` / `t` / `l` / `a` / `p` / `e` / `b` | Switch to tool: select/text/line/arrow/pencil/eraser/brush |

### 2.4 Key Algorithms

> **Full content**: [docs/algorithms.md](docs/algorithms.md) — 11 algorithms: grid compositing, mouse-to-grid, hit testing, resize handles, snapshot undo, box-drawing helpers, table/modal render, freehand drawing, SelectTool state machine, box-drawing character merge.

### 2.5 Complete Function List

> **Full content**: [docs/functions.md](docs/functions.md) — All function signatures grouped by file (utils, core, components, tools, UI).

### 2.6 Data Structures

#### Global Constants

**COLORS** (Catppuccin Mocha palette):
```
bg: '#1e1e2e'         gridLine: '#313244'     cellBg: '#181825'
text: '#cdd6f4'        textDim: '#6c7086'      cursor: '#f5c2e7'
selection: 'rgba(137, 180, 250, 0.25)'          selectionBorder: '#89b4fa'
handle: '#f38ba8'      handleFill: '#1e1e2e'    panelBg: '#1e1e2e'
panelBorder: '#313244'  panelText: '#cdd6f4'     panelTextDim: '#6c7086'
panelHover: '#313244'   panelActive: '#45475a'   accent: '#89b4fa'
accentHover: '#b4befe'  toolbarBg: '#11111b'     statusBg: '#11111b'
statusText: '#a6adc8'   error: '#f38ba8'         success: '#a6e3a1'
warning: '#f9e2af'
```

#### Serialized Component Format
```typescript
{
  type: string,           // registry key: 'card', 'button', etc.
  id: number,             // auto-increment from _componentIdCounter
  x: number, y: number,   // grid position (top-left)
  w: number, h: number,   // grid size
  zIndex: number,          // layer order (ascending = front)
  visible: boolean,
  locked: boolean,
  name: string,            // display name: "${type}_${id}"
  borderStyle: string,     // 'single' | 'heavy' | 'double' | 'rounded' | 'ascii'
  props: object            // type-specific properties (see 2.3.1)
}
```

### 2.7 Implementation Details

#### 2.7.1 CLI & Usage
No CLI — browser-only application.

**Development**: Open `$PROJECT_ROOT/src/index.html` directly in browser. Scripts load via individual `<script>` tags in dependency order.

**Production**: Run `bash build.sh` → produces `$PROJECT_ROOT/dist/kaomoji-markdown-design.html`. Open from `file://` protocol — no web server needed.

#### 2.7.2 UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ◆ KaomojiMarkdownDesign          [Copy MD] [Save] [Load] [New] │  ← Toolbar (40px)
├────────┬─────────────────────────────────────────┬───────────────┤
│ TOOLS  │                                         │  INSPECTOR    │
│────────│                                         │───────────────│
│ Select │                                         │  Type: Card   │
│ Text   │                                         │  X: 5  Y: 3  │
│ Line   │         80 × 40 ASCII Canvas            │  W: 20 H: 8  │
│ Arrow  │                                         │  Border: ─    │
│────────│     (monospace character grid)           │───────────────│
│ ELEMS  │                                         │  COMPONENTS   │
│────────│      flex:1, overflow:auto               │───────────────│
│ Button │      bg: #11111b, padding:16px          │  ■ Card    ×  │
│ Input  │                                         │  □ Modal   ×  │
│ Card   │                                         │  □ Button  ×  │
│ Table  │                                         │               │
│ Modal  │                                         │               │
│ ...    │                                         │               │
│────────│                                         │               │
│ DRAW   │                                         │               │
│────────│                                         │               │
│ Pencil │                                         │               │
│ Eraser │                                         │               │
│ Brush  │                                         │               │
├────────┴─────────────────────────────────────────┴───────────────┤
│ Ln 1, Col 1  │  80×40  │  Components: 3  │  Select              │  ← StatusBar (24px)
└──────────────────────────────────────────────────────────────────┘
  160px fixed     flex:1 (fills remaining)     200px fixed

Layout: body is flex column (100vh)
  Row 1: Toolbar    — fixed 40px height
  Row 2: Main       — flex:1, is flex row containing:
           Left panel  — fixed 160px width, flex column, overflow-y:auto
           Canvas area  — flex:1, overflow:auto
           Right panel — fixed 200px width, flex column, overflow-y:auto
  Row 3: StatusBar  — fixed 24px height
```

#### 2.7.3 HTML Structure

```html
<body> (flex column, 100% height, overflow hidden)
  <div id="toolbar"> (flex row, h:40px, bg:#11111b)
    <span class="logo">◆ KaomojiMarkdownDesign</span>
    <div class="spacer"> (flex:1)
    <button id="btn-copy-md" class="toolbar-btn primary">Copy MD</button>
    <button id="btn-save" class="toolbar-btn">Save</button>
    <button id="btn-load" class="toolbar-btn">Load</button>
    <button id="btn-new" class="toolbar-btn">New</button>

  <div id="main"> (flex row, flex:1)
    <div id="left-panel"> (w:160px, flex-col, overflow-y:auto)
      <div id="tools-section" class="panel-section">
        <div class="panel-header">TOOLS</div>
        <!-- 4 tool items: select, text, line, arrow -->
      <div id="elements-section" class="panel-section">
        <div class="panel-header">ELEMENTS</div>
        <!-- 20 draggable elem-items -->
      <div id="draw-section" class="panel-section">
        <div class="panel-header">DRAW</div>
        <!-- 3 tool items: pencil, eraser, brush -->

    <div id="canvas-area"> (flex:1, overflow:auto, bg:#11111b, padding:16px)
      <canvas id="grid-canvas"> (cursor:crosshair)
      <textarea id="inline-editor" spellcheck="false"> (position:absolute, display:none)

    <div id="right-panel"> (w:200px, flex-col, overflow-y:auto)
      <div id="inspector-section" class="panel-section">
        <div class="panel-header">INSPECTOR</div>
        <div id="inspector-content">
      <div id="layers-section" class="panel-section">
        <div class="panel-header">Components</div>
        <div id="layers-content">

  <div id="statusbar"> (flex row, h:24px, bg:#11111b)
    <span id="status-pos">Ln 1, Col 1</span>
    <span id="status-grid">80×40</span>
    <span id="status-count">Components: 0</span>
    <span id="status-tool">Select</span>

  <div id="toast" class="toast"> (fixed, bottom:40px, centered)
```

#### 2.7.4 CSS Layout Rules

- Body: `flex column`, `100vh`, `overflow: hidden`
- Toolbar: `h: 40px`, `bg: #11111b`, `border-bottom: 1px solid #313244`
- Main: `flex row`, `flex: 1`
- Left panel: `w: 160px`, `bg: #1e1e2e`, `border-right: 1px solid #313244`
- Canvas area: `flex: 1`, `overflow: auto`, `bg: #11111b`, `padding: 16px`
- Right panel: `w: 200px`, `bg: #1e1e2e`, `border-left: 1px solid #313244`
- Status bar: `h: 24px`, `bg: #11111b`, `border-top: 1px solid #313244`
- Panel headers: `font-size: 10px`, `text-transform: uppercase`, `letter-spacing: 0.08em`, `color: #6c7086`
- Panel items: `padding: 5px 10px`, hover `bg: #313244`, active `bg: #45475a color: #89b4fa`
- Element items: `cursor: grab`, `draggable: true`
- Property inputs: `bg: #313244`, `border: 1px solid #45475a`, `font-family: monospace`
- Toast: `position: fixed`, `opacity: 0`, transition `opacity 0.3s`, `.show` sets `opacity: 1`
- Inline editor: `position: absolute`, `display: none`, `bg: transparent`, `border: 1px solid #89b4fa`, `caret-color: #f5c2e7`
- Primary button: `bg: #89b4fa`, `color: #1e1e2e`, hover `bg: #b4befe`
- Logo: `font-weight: 700`, `color: #cba6f7`

#### 2.7.5 Canvas Rendering Details

- DPR scaling: `canvas.width = pixelWidth * dpr`, `canvas.style.width = pixelWidth + 'px'`, `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`
- Grid lines: `strokeStyle: #313244`, `lineWidth: 0.5`, vertical + horizontal
- Characters: `font: '14px "Courier New", "Courier", monospace'`, `textBaseline: 'top'`, `fillStyle: #cdd6f4`, y-offset: `r * charHeight + floor((charHeight - fontSize) / 2)`
- Cursor overlay: `strokeStyle: #f5c2e7`, `lineWidth: 1`, `setLineDash([3, 3])`
- Selection overlay: `fillStyle: rgba(137,180,250,0.25)` fill + `strokeStyle: #89b4fa` `setLineDash([4, 4])`
- Handles: `arc(cx, cy, 3)`, `fillStyle: #1e1e2e`, `strokeStyle: #f38ba8`, `lineWidth: 1.5`
- Marquee: `strokeStyle: #89b4fa`, `setLineDash([2, 2])`
- Draw preview: `fillStyle: rgba(166, 227, 161, 0.3)` per cell

### 2.8 Function Flowcharts

> **Full content**: [docs/flowcharts.md](docs/flowcharts.md) — 8 Mermaid diagrams: init flow, data flow (MVC), render pipeline, add component, drag/select state machine, undo/redo, save/load, copy markdown.

### 2.9 Comprehensive Error Handling

| Scenario | Handling |
|----------|----------|
| Component placed off-grid | `addComponentAt` doesn't clamp; `_blit` silently skips OOB cells |
| Resize below minimum size | `_applyResize` enforces `max(minW, ...)` / `max(minH, ...)` |
| Resize past grid boundary | `_applyResize` clamps: `x >= 0`, `y >= 0`, `x+w <= GRID_COLS`, `y+h <= GRID_ROWS` |
| Move past grid boundary | `onMouseMove` clamps: `max(0, min(GRID_COLS-w, origX+dx))` |
| Load invalid JSON file | `try/catch` in `loadFromFile` → `reject(err)` → toast error message |
| Load wrong version | `if (data.version !== 1)` → reject with "Unsupported file version" |
| Unknown component type in deserialize | `throw new Error('Unknown component type: ${type}')` |
| Clipboard API unavailable | Fallback: create hidden `<textarea>`, `select()`, `execCommand('copy')` |
| Clear canvas with unsaved changes | `confirm('Clear canvas? Unsaved changes will be lost.')` gate |
| Shortcut pressed while editing input | `if (e.target.tagName === 'INPUT' \|\| 'TEXTAREA' \|\| 'SELECT') return` |
| Inspector input keydown | `e.stopPropagation()` prevents tool shortcuts from firing |
| Grid `getChar`/`setChar` OOB | Returns `' '` / silently skips |
| `_freehand` component missing on draw | Created on first draw: `w=GRID_COLS, h=GRID_ROWS, zIndex=-1000` |
| Empty components on save | Auto-save skips if `components.length === 0` |
| localStorage parse failure | `try/catch` returns `null` |

### 2.10 Key Implementation Patterns

| Pattern | Usage |
|---------|-------|
| **Factory** | `ComponentRegistry.create(type, x, y, props)` — instantiates correct class from type string |
| **Strategy** | Tool switching: `_activeTool` reference swapped between `SelectTool`/`PencilTool`/`EraserTool`/`BrushTool` |
| **Observer** | `EventBus.on('action', ...)` / `emit('componentChanged', ...)` decouples UI from logic |
| **Snapshot Memento** | `UndoManager` stores full JSON-serialized state per action |
| **Composite** | `CharGrid.composite()` merges component renders via space-as-transparent blit |
| **Template Method** | `BaseComponent.render()` / `getMinSize()` / `getEditableProps()` overridden by subclasses |
| **Singleton-ish** | `ComponentRegistry` and `ExportUtils` are plain objects (module singletons) |
| **Inline strategy** | text/line/arrow tools reuse `SelectTool` instance (no special behavior needed) |

### 2.11 File Format Specifications

#### Project Directory Tree
```
KaomojiMarkdownDesign/
├── CLAUDE.md
├── README.md
├── build.sh                           (executable)
├── src/
│   ├── index.html                     (HTML shell + CSS + 40 <script> tags)
│   ├── utils/
│   │   ├── constants.js               (globals: GRID_*, COLORS, SHORTCUTS, TOOL_DEFS)
│   │   └── boxdraw.js                 (BORDER_CHARS, ARROW_CHARS, drawBox/drawHDivider/drawVDivider/placeText)
│   ├── core/
│   │   ├── grid.js                    (class CharGrid)
│   │   ├── renderer.js                (class CanvasRenderer)
│   │   ├── history.js                 (class UndoManager)
│   │   └── export.js                  (ExportUtils object)
│   ├── components/
│   │   ├── base.js                    (class BaseComponent + _componentIdCounter)
│   │   ├── textbox.js                 (class TextBoxComponent)
│   │   ├── box.js                     (class BoxComponent)
│   │   ├── button.js                  (class ButtonComponent)
│   │   ├── input.js                   (class InputComponent)
│   │   ├── line.js                    (class LineComponent)
│   │   ├── arrow.js                   (class ArrowComponent)
│   │   ├── card.js                    (class CardComponent)
│   │   ├── table.js                   (class TableComponent)
│   │   ├── modal.js                   (class ModalComponent)
│   │   ├── tabs.js                    (class TabsComponent)
│   │   ├── navbar.js                  (class NavBarComponent)
│   │   ├── dropdown.js                (class DropdownComponent)
│   │   ├── search.js                  (class SearchComponent)
│   │   ├── checkbox.js                (class CheckboxComponent)
│   │   ├── radio.js                   (class RadioComponent)
│   │   ├── toggle.js                  (class ToggleComponent)
│   │   ├── progress.js                (class ProgressComponent)
│   │   ├── breadcrumb.js              (class BreadcrumbComponent)
│   │   ├── pagination.js              (class PaginationComponent)
│   │   ├── separator.js               (class SeparatorComponent)
│   │   └── registry.js                (ComponentRegistry + ELEMENT_PALETTE)
│   ├── tools/
│   │   ├── base.js                    (class BaseTool)
│   │   ├── select.js                  (class SelectTool)
│   │   ├── pencil.js                  (class PencilTool)
│   │   ├── eraser.js                  (class EraserTool)
│   │   └── brush.js                   (class BrushTool)
│   └── ui/
│       ├── eventbus.js                (class EventBus)
│       ├── toolbar.js                 (class ToolbarUI)
│       ├── palette.js                 (class PaletteUI)
│       ├── inspector.js               (class InspectorUI)
│       ├── layers.js                  (class LayersUI)
│       ├── statusbar.js               (class StatusBarUI)
│       ├── app.js                     (class App + DOMContentLoaded bootstrap)
│       └── bridge.js                  (class KaomojiBridge — WebSocket MCP client)
├── mcp/                               (MCP server for Claude Code integration)
│   ├── server.py                      (MCP entry point: list_tools + call_tool)
│   ├── tool_handlers.py               (17 async handlers + TOOL_REGISTRY)
│   ├── kaomoji_bridge.py              (WebSocket server on port 9878)
│   ├── resource_handlers.py           (placeholder)
│   ├── requirements.txt               (mcp>=1.0.0, websockets>=12.0)
│   └── tests/                         (50 pytest tests)
│       ├── conftest.py
│       ├── test_bridge.py
│       ├── test_server.py
│       └── test_tool_handlers.py
└── dist/
    └── kaomoji-markdown-design.html   (single-file output, ~164KB)
```

**Total: 46 JS files + 1 HTML + 1 build script + 5 MCP Python files = 53 source files**

#### Script Load Order (in index.html)
```
1.  utils/constants.js
2.  utils/boxdraw.js
3.  core/grid.js
4.  core/renderer.js
5.  core/history.js
6.  core/export.js
7.  components/base.js
8.  components/textbox.js
9.  components/box.js
10. components/button.js
11. components/input.js
12. components/line.js
13. components/arrow.js
14. components/card.js
15. components/table.js
16. components/modal.js
17. components/tabs.js
18. components/navbar.js
19. components/dropdown.js
20. components/search.js
21. components/checkbox.js
22. components/radio.js
23. components/toggle.js
24. components/progress.js
25. components/breadcrumb.js
26. components/pagination.js
27. components/separator.js
28. components/registry.js
29. tools/base.js
30. tools/select.js
31. tools/pencil.js
32. tools/eraser.js
33. tools/brush.js
34. ui/eventbus.js
35. ui/toolbar.js
36. ui/palette.js
37. ui/inspector.js
38. ui/layers.js
39. ui/statusbar.js
40. ui/app.js
41. ui/bridge.js
```

#### Build Script (`build.sh`)
```bash
# Reads index.html, extracts content before/after INJECT markers
# Concatenates all 46 JS files (in order above) into temp file
# Outputs: sed (before marker) + <script> + JS + </script> + sed (after marker)
# Uses sed -n for line ranges, not awk (avoids newline-in-variable issues)
```

Markers in index.html: `<!-- INJECT_JS_START -->` and `<!-- INJECT_JS_END -->`

### 2.12 Dependencies

| Category | Requirements |
|----------|-------------|
| **Runtime** | None — uses only browser-native APIs: HTML5 Canvas, DOM, localStorage, Blob, FileReader, URL.createObjectURL, navigator.clipboard, document.execCommand |
| **Build** | `bash` (for build.sh), `sed`, `cat`, `wc` |
| **Browser** | Chrome 60+, Firefox 55+, Safari 11+, Edge 79+ |
| **Font** | System monospace: `"Courier New", "Courier", monospace` |
| **External files** | Zero (no CDN, no npm, no font files, no images) |

### 2.13 Testing & Validation

#### 2.13.1 Unit & Integration Tests
Manual testing checklist:
- [x] Open `dist/kaomoji-markdown-design.html` from `file://` protocol
- [x] Canvas renders 80×40 grid with subtle grid lines
- [x] All 20 element types render correct ASCII patterns
- [x] Click element in palette → appears centered on canvas with selection
- [x] Inspector shows type name + all editable properties
- [x] Layers panel shows component with ■/□ toggle, ▲/▼ reorder, × delete
- [x] Click on canvas → hit test selects topmost component
- [x] Drag component → moves within grid bounds
- [x] Drag resize handle → resizes respecting min size
- [x] Border style dropdown → changes render style (5 styles verified)
- [x] Copy MD button → markdown in clipboard
- [x] Save button → downloads .kaomoji.json file
- [x] Load button → file picker, restores components
- [x] New button → confirm dialog, clears canvas
- [x] Ctrl+Z / Ctrl+Shift+Z → undo/redo works across 20+ actions
- [x] Ctrl+C/V/X → copy/paste/cut components
- [x] Delete/Backspace → removes selected component
- [x] Tool switching via keyboard shortcuts (V/T/L/A/P/E/B)
- [x] Double-click on text/card/modal → inline text editing
- [x] Pencil tool draws `*` characters
- [x] Eraser tool clears characters
- [x] Brush tool draws `─`/`│` characters
- [x] Status bar updates: position, grid size, component count, tool name
- [x] Auto-save to localStorage (verify after browser refresh)
- [x] Multiple overlapping components render with correct z-order

#### 2.13.2 Codex Review Protocol

**Files reviewed:** 40 JS files across `src/utils/`, `src/core/`, `src/components/`, `src/tools/`, `src/ui/`

**False positive checklist** (project-specific):
- Global variables (`GRID_COLS`, `COLORS`, `BORDER_CHARS`, etc.) — intentional, all scripts share one `window` scope
- `_componentIdCounter` global mutable — required for cross-class ID generation
- No `export`/`import` — project uses script concatenation, not modules
- `ComponentRegistry` referenced before definition — scripts loaded in order via `<script>` tags
- Fallback `execCommand('copy')` deprecated — intentional for Safari < 13.1 compat
- `_BOX_DIRS`/`_BOX_STYLE`/`_BOX_RESULTS` built dynamically at load time — intentional global mutation during module init

**Review 1 — Tier Breakdown:**

| Tier | Count | Fixed | False Positive | Accepted |
|------|-------|-------|----------------|----------|
| 1 (Critical) | 0 | 0 | 0 | 0 |
| 2 (High) | 5 | 5 | 0 | 0 |
| 3 (Medium) | 8 | 0 | 0 | 8 |
| 4 (Low) | 7 | 0 | 0 | 7 |

**Tier 2 Findings (all fixed):**

| # | File | Finding | Fix |
|---|------|---------|-----|
| 2.1 | `boxdraw.js:62-97` | `drawBox`/`drawHDivider`/`drawVDivider` no bounds checking — OOB writes cause TypeError or silent corruption | Added `_safeSet(chars, r, c, ch)` helper with bounds check; all draw functions use it + row/col pre-validation |
| 2.2 | `table.js:27-31` | Large `numCols` relative to `this.w` causes garbled rendering (overlapping dividers/headers) | Clamped `numCols` to `maxCols = floor((w-1)/3)` ensuring min 3-char column width |
| 2.3 | `modal.js:29` | Action buttons rendered at negative X when width < 22 | Added width guard: full buttons only if `w >= btnTotalWidth`; narrow modal shows only OK if fits |
| 2.4 | `app.js:385-408` | `_startInlineEdit` double-fires `finish()` on Enter+blur, creating spurious undo entries | Added `let finished = false` guard flag at top of `finish()` |
| 2.5 | `app.js:294-307` | `pasteClipboard` shallow clone corrupts clipboard `props` on subsequent paste | Changed to deep clone: `JSON.parse(JSON.stringify(this._clipboard))` |

**Tier 3 Findings (accepted):**

| # | File:Line | Description | Acceptance Rationale |
|---|-----------|-------------|---------------------|
| 3.1 | `app.js:341-349` | `newCanvas` pushes undo then clears history | Dead code; harmless since history cleared immediately. Future cleanup possible. |
| 3.2 | `base.js:138` | `parseInt` for all numeric props loses floats | All current props are integers. No float properties exist. |
| 3.3 | `button.js:14` | Negative substring arg when `w < 4` | Min width is 5; only reachable via corrupted data. `substring` handles gracefully. |
| 3.4 | `dropdown.js:17-19` | Dropdown garbled when `w < 5` | Min width enforced by getMinSize(). Corrupted data edge case. |
| 3.5 | `pagination.js:17-24` | O(n) loop for large page count values | Practical limit: inspector doesn't accept extreme values easily. Minor freeze risk. |
| 3.6 | `app.js:164-167` | `selectAll` only selects last component | App architecture is single-selection. Multi-select is out of scope. |
| 3.7 | `app.js:173` | `saveAs` identical to `save` | Browser File API doesn't support "save as" with custom filename prompt. Both download with same default name. |
| 3.8 | `app.js:310-316` | `cutSelected` fires 3 toasts rapidly ("Copied", "Deleted", "Cut") | Each toast replaces prior via clearTimeout; only "Cut" is visible. Brief flicker is cosmetic. |

**Final state confirmation:** No Tier 1 or Tier 2 issues remain.

**Review 2 — Tier Breakdown (box-drawing merge + group paste):**

| Tier | Count | Fixed | False Positive | Accepted |
|------|-------|-------|----------------|----------|
| 1 (Critical) | 0 | 0 | 0 | 0 |
| 2 (High) | 1 | 1 | 0 | 0 |
| 3 (Medium) | 7 | 0 | 0 | 7 |
| 4 (Low) | 5 | 0 | 0 | 5 |

**Tier 2 Findings (all fixed):**

| # | File | Finding | Fix |
|---|------|---------|-----|
| 2.1 | `app.js:104-109` | Group children drill-down in dblclick missing null/corruption guard on children array | Added `.filter(c => c && typeof c === 'object' && c.contains)` before sort/find |

**Tier 3 Findings (accepted):**

| # | File:Line | Description | Acceptance Rationale |
|---|-----------|-------------|---------------------|
| 3.1 | `boxdraw.js:271-290` | Box merge fallback to diagonal if style result undefined | Falls through safely to `return incoming` via diagonal guard |
| 3.2 | `app.js:365` | _componentIdCounter overflow after billions of pastes | Requires ~9e15 operations; not practical |
| 3.3 | `boxdraw.js:202-207` | Single-direction fallbacks assume chars.h/v exist | All 5 built-in styles define h/v; undefined result falls through safely |
| 3.4 | `app.js:370-377` | pasteClipboard doesn't validate child data structure | Malformed data produces "undefined_N" names; doesn't crash |
| 3.5 | `group.js:66-77` | setProp doesn't clamp children after position shift | Same behavior as non-group components; _blit skips OOB cells |
| 3.6 | `boxdraw.js:271-290` | Diagonal fallback could merge box chars unexpectedly | Only reached if _BOX_RESULTS lookup fails; returns incoming as safe default |
| 3.7 | `base.js:115-130` | clone() doesn't update child zIndex values | Children keep original zIndex; only affects ungrouping order |

#### 2.13.3 Review History
| Date | Scope | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Result |
|------|-------|--------|--------|--------|--------|--------|
| 2026-02-27 | All 40 JS files | 0 | 5 (fixed) | 8 (accepted) | 7 (accepted) | Pass — no Tier 1/2 remain |
| 2026-02-28 | boxdraw.js, base.js, app.js, group.js, grid.js | 0 | 1 (fixed) | 7 (accepted) | 5 (accepted) | Pass — no Tier 1/2 remain |

### 2.14 Implementation Considerations

- **HiDPI rendering**: Canvas uses `devicePixelRatio` scaling — physical pixels = logical pixels × dpr. `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` ensures all drawing ops use logical coordinates.
- **Font measurement**: `ctx.measureText('M').width` provides exact monospace character width. Height approximated as `ceil(fontSize * 1.5)`. Both values `ceil`'d to ensure integer pixel alignment.
- **Freehand layer**: Hidden `_freehand` textbox at `zIndex = -1000` stores freehand drawing as a multi-line string. Created lazily on first pencil/brush/eraser use. Excluded from hit test, layer panel, and component count.
- **Memory usage**: Each undo snapshot is `JSON.stringify` of all components — typically 1-50KB per snapshot. 50 levels ≈ 2.5MB max. Acceptable for browser.
- **No module system**: All code uses global scope (classes, functions, constants). Script load order is critical (dependency order). Build script must maintain same order.
- **Text encoding**: All box-drawing characters are Unicode (not combining characters), safe for `fillText` and JSON serialization.
- **Auto-save**: 30-second interval saves to `localStorage` key `kaomoji_project`. Loads on startup. Skips if no components.
- **Clipboard fallback**: `navigator.clipboard.writeText()` requires secure context (HTTPS or `file://`). Falls back to `document.execCommand('copy')` via hidden textarea.

### 2.15 Implementation Status
- [x] Phase 1: Core Engine — `constants.js`, `boxdraw.js`, `grid.js`, `renderer.js`, `history.js`, `export.js`, `index.html`
- [x] Phase 2: Component Foundation — `base.js`, `textbox.js`, `box.js`, `button.js`, `input.js`, `line.js`, `arrow.js`
- [x] Phase 3: Advanced Components — `card.js`, `table.js`, `modal.js`, `tabs.js`, `navbar.js`, `dropdown.js`, `search.js`, `checkbox.js`, `radio.js`, `toggle.js`, `progress.js`, `breadcrumb.js`, `pagination.js`, `separator.js`, `registry.js`
- [x] Phase 4: Tools — `base.js`, `select.js`, `pencil.js`, `eraser.js`, `brush.js`
- [x] Phase 5: UI Panels — `eventbus.js`, `toolbar.js`, `palette.js`, `inspector.js`, `layers.js`, `statusbar.js`, `app.js`
- [x] Phase 6: Features — Undo/redo wiring, keyboard shortcuts, Copy Markdown, Save/Load, copy/paste/cut, inline text editing, auto-save, drag-and-drop
- [x] Phase 7: Build script (`build.sh`), single-file output (`dist/kaomoji-markdown-design.html` 164KB), `CLAUDE.md`, `README.md`
- [x] Phase 8: Box-drawing merge system, group paste fix, inline editing for all elements
- [x] Phase 9: MCP bridge (`bridge.js`), Delete button in Components panel, rename Layers→Components

---

## 3. Modification Log (Audit Trail)

| Ver | Date | Modification | Impact |
|-----|------|-------------|--------|
| 1.0 | 2026-02-27 | Initial 7-phase implementation | All sections created |
| 1.1 | 2026-02-27 | CLAUDE.md expanded to full reproducibility | 2.3–2.11 rewritten |
| 1.2 | 2026-02-27 | Codex review: 5 Tier 2 fixes | 2.13 updated |
| 1.3 | 2026-02-27 | Section 2.8 flowcharts converted to Mermaid (8 diagrams) | 2.8 rewritten |
| 1.4 | 2026-02-27 | Added 2.7.2 UI Layout ASCII diagram | 2.7 expanded |
| 1.5 | 2026-02-28 | Box-drawing merge system (4-direction U/D/L/R) | 2.4.11, 2.5 added |
| 1.6 | 2026-02-28 | Group paste fix + Codex review #2 | 2.13 updated |
| 1.7 | 2026-03-01 | MCP bridge + Delete button + Layers→Components | 46 JS files, 164KB dist |
| 1.8 | 2026-03-01 | Split large sections to docs/ (algorithms, functions, flowcharts) | CLAUDE.md <40KB |
