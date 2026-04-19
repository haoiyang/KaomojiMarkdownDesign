# Implementation Details

> Extracted from [../CLAUDE.md](../CLAUDE.md) Section 2.7 on 2026-04-20 per B.6 40 KB size rule. Single source of truth — reference this doc from CLAUDE.md with a one-line pointer.

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

