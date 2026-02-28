# 2.5 Complete Function List

> Extracted from [CLAUDE.md](../CLAUDE.md) Section 2.5. This is the single source of truth for all function signatures.

#### `utils/constants.js` — Global Constants (no classes)
- `GRID_COLS = 80`, `GRID_ROWS = 40`
- `DEFAULT_FONT_FAMILY = '"Courier New", "Courier", monospace'`
- `DEFAULT_FONT_SIZE = 14`
- `MAX_UNDO_LEVELS = 50`
- `COLORS = { bg, gridLine, cellBg, text, textDim, cursor, selection, selectionBorder, handle, handleFill, panelBg, panelBorder, panelText, panelTextDim, panelHover, panelActive, accent, accentHover, toolbarBg, statusBg, statusText, error, success, warning }`
- `SHORTCUTS = { 'ctrl+z': 'undo', ... }` — 30 entries mapping key combos to action strings
- `TOOL_DEFS = [{ id, label, shortcut, icon }]` — 7 entries
- `BORDER_STYLES = ['single', 'heavy', 'double', 'rounded', 'ascii']`

#### `utils/boxdraw.js` — Box-Drawing Lookup + Helpers
- `BORDER_CHARS = { single: {...}, heavy: {...}, double: {...}, rounded: {...}, ascii: {...} }` — each with 15 position keys
- `ARROW_CHARS = { right: '→', left: '←', up: '↑', down: '↓' }`
- `drawBox(chars: string[][], x: int, y: int, w: int, h: int, style?: string): void`
- `drawHDivider(chars: string[][], x: int, w: int, row: int, style?: string): void`
- `drawVDivider(chars: string[][], col: int, y: int, h: int, style?: string): void`
- `placeText(chars: string[][], x: int, y: int, text: string, maxWidth?: int): void`
- `_BOX_DIRS: object` — char → direction flags (OR'd across all positions that define it)
- `_BOX_STYLE: object` — char → first style name that defines it
- `_BOX_RESULTS: object` — style → { dirFlags → char } lookup
- `mergeLineChars(existing: string, incoming: string): string` — merge two overlapping chars using 4-direction box merge then diagonal fallback

#### `core/grid.js` — `class CharGrid`
- `constructor(cols = GRID_COLS, rows = GRID_ROWS)` — creates `this.cells = string[][]`
- `_createEmpty(): string[][]` — returns rows×cols array filled with `' '`
- `clear(): void` — sets all cells to `' '`
- `getChar(col: int, row: int): string` — bounds-checked, returns `' '` if OOB
- `setChar(col: int, row: int, ch: string): void` — bounds-checked
- `composite(components: BaseComponent[]): void` — clear + sort by zIndex asc + blit each
- `_blit(charArray: string[][], offsetX: int, offsetY: int): void` — copy non-space chars
- `toText(): string` — join rows with `trimEnd()` + `\n`
- `toMarkdown(): string` — wraps `toText()` in triple-backtick code fence
- `resize(newCols: int, newRows: int): void` — preserves existing content

#### `core/renderer.js` — `class CanvasRenderer`
- `constructor(canvas: HTMLCanvasElement)` — stores ctx, calls `_measureFont()`
- `_measureFont(): void` — sets `charWidth = ceil(measureText('M').width)`, `charHeight = ceil(fontSize * 1.5)`
- `getGridPixelSize(cols, rows): {width, height}`
- `resizeToGrid(cols, rows): void` — sets canvas width/height ×dpr, CSS width/height, `ctx.setTransform(dpr,...)`
- `pixelToGrid(px, py): {col: int, row: int}` — `floor(px/charWidth)`, `floor(py/charHeight)`
- `render(grid: CharGrid, overlays?: object): void` — full frame: bg → gridlines → chars → overlays
- `_drawCursor(col, row): void` — dashed pink `strokeRect` at cell
- `_drawSelection(rect: {x,y,w,h}): void` — semi-transparent blue fill + dashed blue `strokeRect`
- `_drawHandle(col, row): void` — small circle (radius 3) with fill + stroke
- `_drawSelectionRect(rect: {x,y,w,h}): void` — dashed accent `strokeRect`
- `_drawPreviewCells(cells: {col,row}[]): void` — semi-transparent green `fillRect` per cell

#### `core/history.js` — `class UndoManager`
- `constructor(maxLevels = MAX_UNDO_LEVELS)` — initializes `undoStack = []`, `redoStack = []`
- `push(components: BaseComponent[]): void` — serialize + push + trim + clear redo
- `undo(currentComponents): BaseComponent[] | null` — pop undo, push current to redo
- `redo(currentComponents): BaseComponent[] | null` — pop redo, push current to undo
- `canUndo(): boolean`, `canRedo(): boolean`
- `clear(): void`
- `_serialize(components): string` — `JSON.stringify(components.map(c => c.serialize()))`
- `_deserialize(snapshot): BaseComponent[]` — `JSON.parse(snapshot).map(d => ComponentRegistry.deserialize(d))`

#### `core/export.js` — `ExportUtils` object
- `async copyToClipboard(text: string): boolean` — `navigator.clipboard.writeText` with `execCommand('copy')` fallback
- `saveToFile(components, filename = 'wireframe.kaomoji.json'): void` — `Blob` → `URL.createObjectURL` → `<a>.click()` → `revokeObjectURL`
- `loadFromFile(): Promise<BaseComponent[]>` — creates `<input type="file" accept=".json">` → `FileReader` → parse + `ComponentRegistry.deserialize`
- `saveToLocalStorage(components, key = 'kaomoji_project'): void`
- `loadFromLocalStorage(key = 'kaomoji_project'): BaseComponent[] | null`
- `exportAsText(grid): string` — `grid.toText()` with trailing empty lines trimmed
- `exportAsMarkdown(grid): string` — wraps `exportAsText()` in triple-backtick code fence

**Save file format** (version 1):
```json
{
  "version": 1,
  "gridCols": 80,
  "gridRows": 40,
  "components": [ { "type": "card", "id": 1, "x": 10, "y": 5, "w": 20, "h": 8, "zIndex": 0, "visible": true, "locked": false, "name": "card_1", "borderStyle": "single", "props": {"title": "Card Title"} } ],
  "timestamp": "2026-02-27T12:00:00.000Z"
}
```

#### `components/base.js` — `class BaseComponent` + `_componentIdCounter`
Global: `let _componentIdCounter = 0` — auto-increments on each `new BaseComponent()`

- `constructor(type: string, x: int, y: int, w: int, h: int, props?: object)` — sets `id = ++_componentIdCounter`, extracts `name` and `borderStyle` from props (deleting them from `this.props`)
- `render(): string[][]` — returns w×h array of spaces (override in subclass)
- `contains(col, row): boolean` — bounding box test
- `getBounds(): {x, y, w, h}`
- `getHandles(): {col, row, dir}[]` — 8 handles at NW/N/NE/E/SE/S/SW/W
- `getHandleAt(col, row): string | null` — returns dir string if exact match
- `getMinSize(): {minW, minH}` — default `{1, 1}`
- `serialize(): object` — returns `{type, id, x, y, w, h, zIndex, visible, locked, name, borderStyle, props}`
- `applyData(data: object): void` — sets all fields from data, syncs `_componentIdCounter`
- `clone(): BaseComponent` — serialize + bump id + offset (+2, +1) + deserialize. Assigns new IDs to group children and offsets their positions
- `getEditableProps(): PropDef[]` — default: `[x, y, w, h, borderStyle]`
- `setProp(key, value): void` — sets direct property or `this.props[key]`
- `getProp(key): any` — gets direct property or `this.props[key]`

**PropDef format**: `{ key: string, label: string, type: 'number'|'text'|'select', options?: string[], propsBased?: boolean }`

#### `components/registry.js` — `ComponentRegistry` object + `ELEMENT_PALETTE`

`ComponentRegistry._types = { [type]: { cls: Class, defaults: { w, h, props } } }`

- `register(type: string, cls: Function, defaults: {w, h, props}): void`
- `create(type, x, y, props?): BaseComponent` — `new cls(x, y, defaults.w, defaults.h, {...defaults.props, ...props})`
- `deserialize(data): BaseComponent` — `new cls(data.x, data.y, data.w, data.h, {borderStyle, name, ...data.props})` then `applyData(data)`
- `getTypes(): string[]`
- `getDefaults(type): {w, h, props} | null`

**Registration calls** (20 types, in order):
```
textbox:    TextBoxComponent,    {w:10, h:1,  props:{text:'Text'}}
box:        BoxComponent,        {w:12, h:6,  props:{}}
button:     ButtonComponent,     {w:10, h:1,  props:{label:'Button'}}
input:      InputComponent,      {w:16, h:1,  props:{placeholder:''}}
line:       LineComponent,       {w:8,  h:1,  props:{orientation:'horizontal'}}
arrow:      ArrowComponent,      {w:8,  h:1,  props:{orientation:'horizontal', direction:'right'}}
card:       CardComponent,       {w:20, h:8,  props:{title:'Card Title'}}
table:      TableComponent,      {w:24, h:7,  props:{cols:3, rows:3, headers:['Col1','Col2','Col3']}}
modal:      ModalComponent,      {w:30, h:12, props:{title:'Modal Title'}}
tabs:       TabsComponent,       {w:30, h:2,  props:{tabs:['Tab 1','Tab 2','Tab 3'], activeIndex:0}}
navbar:     NavBarComponent,     {w:40, h:1,  props:{logo:'Logo', links:['Home','About','Contact'], action:'Sign In'}}
dropdown:   DropdownComponent,   {w:14, h:1,  props:{value:'Option'}}
search:     SearchComponent,     {w:20, h:1,  props:{placeholder:'Search...'}}
checkbox:   CheckboxComponent,   {w:12, h:1,  props:{label:'Option', checked:true}}
radio:      RadioComponent,      {w:12, h:1,  props:{label:'Option', selected:true}}
toggle:     ToggleComponent,     {w:8,  h:1,  props:{on:true, label:''}}
progress:   ProgressComponent,   {w:16, h:1,  props:{value:50}}
breadcrumb: BreadcrumbComponent, {w:24, h:1,  props:{items:['Home','Docs','About']}}
pagination: PaginationComponent, {w:16, h:1,  props:{pages:5, current:1}}
separator:  SeparatorComponent,  {w:20, h:1,  props:{}}
```

**ELEMENT_PALETTE** (20 entries, display order for left panel):
```
button:     '[ Btn ]'    input:     '[____]'     box:        '┌──┐'
card:       '┌─┬─┐'      table:     '┌┬┐'        modal:      '┌×─┐'
tabs:       '[T1]T2'     navbar:    'Logo..'     dropdown:   '[▾]'
search:     '[/...]'     checkbox:  '[x]'        radio:      '(o)'
toggle:     '[━●]'       progress:  '[██░]'      breadcrumb: 'a>b>c'
pagination: '<1[2]>'     textbox:   'Abc'        line:       '───'
arrow:      '──→'        separator: '────'
```

#### Component Classes (20 files) — Render Logic

Each follows the pattern: `constructor` (call `super(type, x, y, w, h, props)`, set default props) → `render()` (create w×h `char[][]`, draw ASCII pattern) → `getMinSize()` → `getEditableProps()` (append to `super.getEditableProps()`).

**Per-component render details are in Section 2.4** (algorithms 2.4.7, 2.4.8) and **Section 2.3.1** (ASCII patterns). Key details not covered elsewhere:

- **TextBox**: Splits `props.text` on `\n`, places each line at row offset. Supports multi-line.
- **Button**: `[ ${label.substring(0, w-4)} ]` — truncates label to fit within brackets.
- **Input**: `[` + underscores (or placeholder text) + `]`. If placeholder, uses `placeText`; else fills `_`.
- **Line**: If `orientation === 'vertical'`: fills column 0 with `bc.v`. Else fills row 0 with `bc.h`.
- **Arrow**: Same as Line but replaces endpoint: `right` → last col gets `→`, `left` → first col gets `←`, `down` → last row gets `↓`, `up` → first row gets `↑`.
- **Card**: `drawBox` + `placeText(chars, 2, 1, title, w-4)` + `drawHDivider(chars, 0, w, 2, style)`. Guard `w >= 3 && h >= 4`.
- **Tabs**: Active tab wrapped in `[brackets]`, inactive plain. Items separated by 1 space. Row 1 filled with `bc.h`.
- **NavBar**: Logo at col 0, links spaced by 2, action `[text]` right-aligned at `w - actionText.length`.
- **Dropdown**: `[` at col 0, value text at col 1, `▾` at col `w-2`, `]` at col `w-1`. Value truncated to `w-5`.
- **Search**: `[` at col 0, `/ ` + placeholder, `]` at col `w-1`.
- **Checkbox**: `[x]` or `[ ]` + ` ` + label. `checked` prop is boolean.
- **Radio**: `(o)` or `( )` + ` ` + label. `selected` prop is boolean.
- **Toggle**: `[━●]` (on) or `[●━]` (off) + ` On`/` Off` + optional label.
- **Progress**: `[` + `█` × filled + `░` × remaining + `]` + ` ${pct}%`. `barW = w - label.length - 2`. `filled = round(barW * pct / 100)`.
- **Breadcrumb**: `items.join(' > ')`.
- **Pagination**: `< ` + page numbers (current wrapped in `[]`) + ` >`.
- **Separator**: All cells in row 0 set to `bc.h`.

#### `tools/base.js` — `class BaseTool`
- `constructor(name: string, app: App)` — stores reference
- `activate(): void`, `deactivate(): void` — lifecycle hooks
- `onMouseDown(col, row, e): void`, `onMouseMove(col, row, e): void`, `onMouseUp(col, row, e): void`
- `getOverlays(): object` — returns overlay data for renderer
- `getCursor(): string` — CSS cursor value

#### `tools/select.js` — `class SelectTool extends BaseTool`
Internal state: `_dragging`, `_resizing`, `_resizeDir`, `_startCol`, `_startRow`, `_origX`, `_origY`, `_origW`, `_origH`, `_marquee`
- `_applyResize(comp, dx, dy, min): void` — adjusts comp x/y/w/h per direction string
- `getOverlays()`: returns `{selection?, handles?, selectionRect?}`
- `getCursor()`: returns `'default'`

#### `tools/pencil.js` — `class PencilTool extends BaseTool`
Internal: `_drawing`, `_drawChar = '*'`, `_previewCells`
- `_drawAt(col, row): void` — get/create `_freehand` component, edit text at position

#### `tools/eraser.js` — `class EraserTool extends BaseTool`
Internal: `_erasing`, `_previewCells`
- `_eraseAt(col, row): void` — find `_freehand` component, set char to space

#### `tools/brush.js` — `class BrushTool extends BaseTool`
Internal: `_drawing`, `_lastCol`, `_lastRow`, `_previewCells`
- `_brushAt(fromCol, fromRow, toCol, toRow): void` — interpolate line, use `bc.h` or `bc.v`
- `_setChar(lines, col, row, ch): void` — edit a single char in lines array

#### `ui/eventbus.js` — `class EventBus`
- `constructor()` — `this._listeners = {}`
- `on(event: string, fn: Function): void`
- `off(event: string, fn: Function): void`
- `emit(event: string, ...args): void`

#### `ui/toolbar.js` — `class ToolbarUI`
- `constructor(app: App)` — calls `_bind()`
- `_bind(): void` — attaches click handlers to `#btn-copy-md`, `#btn-save`, `#btn-load`, `#btn-new` → emits `bus.emit('action', actionName)`

#### `ui/palette.js` — `class PaletteUI`
- `constructor(app: App)` — calls `_buildTools()`, `_buildElements()`, `_buildDrawTools()`
- `_buildTools(): void` — renders select/text/line/arrow items into `#tools-section`
- `_buildElements(): void` — renders all `ELEMENT_PALETTE` items into `#elements-section` with click (→ `addComponentAtCenter`) and drag handlers
- `_buildDrawTools(): void` — renders pencil/eraser/brush items into `#draw-section`
- `updateActiveTool(toolId: string): void` — toggles `.active` class on `[data-tool]` items

#### `ui/inspector.js` — `class InspectorUI`
- `constructor(app: App)` — stores `#inspector-content` reference
- `update(component: BaseComponent | null): void` — clears content, shows "No selection" or builds property rows
- `_addPropRow(label, key, value, type, onChange): void` — creates `<input>` with `e.stopPropagation()` on keydown
- `_addSelectRow(label, key, value, options, onChange): void` — creates `<select>`

Property change handler: converts boolean strings (`'true'`/`'false'`) for `propsBased` select fields, converts to `parseInt` for number types, then calls `app.bus.emit('componentChanged', component)` + `app.render()`.

#### `ui/layers.js` — `class LayersUI`
- `constructor(app: App)` — stores `#layers-content` reference
- `update(): void` — clears content, renders components (filtered: `name !== '_freehand'`) sorted by `zIndex` descending (top first). Each item has: visibility toggle (■/□), name, ▲/▼ (zIndex ±1), × (delete).

#### `ui/statusbar.js` — `class StatusBarUI`
- `constructor(app: App)` — stores DOM references for 4 status items
- `updatePos(col, row): void` — `Ln ${row+1}, Col ${col+1}`
- `updateGrid(cols, rows): void` — `${cols}×${rows}`
- `updateCount(n): void` — `Components: ${n}`
- `updateTool(name): void` — capitalized tool name

#### `ui/app.js` — `class App` (main orchestrator)

**Constructor** initializes:
- `bus = new EventBus()`
- `grid = new CharGrid()`
- `renderer = new CanvasRenderer(canvas)` where `canvas = #grid-canvas`
- `history = new UndoManager()`
- `components = []`, `selectedComponent = null`, `currentToolId = 'select'`
- `_cursorCol = 0`, `_cursorRow = 0`, `_clipboard = null`
- `_tools = { select: SelectTool, text: SelectTool, line: SelectTool, arrow: SelectTool, pencil: PencilTool, eraser: EraserTool, brush: BrushTool }` — note: text/line/arrow reuse SelectTool
- UI instances: `ToolbarUI`, `PaletteUI`, `InspectorUI`, `LayersUI`, `StatusBarUI`
- Calls `renderer.resizeToGrid()`, `_bindEvents()`, `_loadAutoSave()`, `render()`

**`_bindEvents()`** binds:
- Canvas `mousedown/mousemove/mouseup/mouseleave` → convert pixels to grid coords → delegate to `_activeTool`
- Canvas `dblclick` → hit test → if component has `text`/`label`/`title` prop → `_startInlineEdit()`
- Canvas `dragover` (preventDefault) + `drop` → read type from `dataTransfer` → `addComponentAt(type, col, row)`
- `document.keydown` → build shortcut key string → lookup in `SHORTCUTS` → `_handleAction()`
- `bus.on('action', ...)` + `bus.on('componentChanged', ...)`
- `setInterval(30000)` for auto-save
- `window.resize` → `render()`

**Action methods**:
- `setTool(toolId)`: deactivate old → activate new → update palette + statusbar + cursor
- `addComponentAt(type, col, row)`: pushUndo → `ComponentRegistry.create()` → set zIndex → push → select → render → toast
- `addComponentAtCenter(type)`: calculate center position from defaults → `addComponentAt()`
- `selectComponent(comp)`: set `selectedComponent` → update inspector + layers → render
- `deleteComponent(comp)`: pushUndo → splice from array → clear selection if needed → update UI
- `deleteSelected()`: guard locked → `deleteComponent()`
- `hitTest(col, row)`: filter visible + non-freehand → sort descending zIndex → first `contains()` match
- `pushUndo()`: `history.push(components)`
- `undo()` / `redo()`: `history.undo/redo(components)` → replace `components` → clear selection → update UI
- `copySelected()`: `_clipboard = selectedComponent.serialize()`
- `pasteClipboard()`: pushUndo → deep clones with new IDs for group children, offsets child positions (+2/+1 offset) → push → select
- `cutSelected()`: copy + delete
- `saveToFile()`: `ExportUtils.saveToFile(components)`
- `loadFromFile()`: `await ExportUtils.loadFromFile()` → pushUndo → replace components → update UI
- `newCanvas()`: confirm dialog → pushUndo → clear components + history + localStorage
- `copyMarkdown()`: composite → `exportAsMarkdown()` → `copyToClipboard()`

**`_startInlineEdit(comp, px, py, propKey)`**:
- Position `#inline-editor` textarea over component (using canvas rect + component grid coords × charWidth/charHeight)
- Set font size/family/lineHeight to match renderer
- On Enter (non-shift): commit `comp.props[propKey] = editor.value`, hide editor
- On Escape: cancel, hide editor
- On blur: commit

**`_toast(msg, duration = 2000)`**: Show `#toast` element with `.show` class, clear after timeout.

**Bootstrap**: `document.addEventListener('DOMContentLoaded', () => { window.app = new App(); })`
