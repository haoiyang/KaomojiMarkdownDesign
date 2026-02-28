# 2.8 Function Flowcharts

> Extracted from [CLAUDE.md](../CLAUDE.md) Section 2.8. Mermaid diagrams showing how functions interact.

#### Main Initialization Flow

```mermaid
flowchart TD
    A[DOMContentLoaded] --> B["new App()"]
    B --> C["bus = new EventBus()"]
    B --> D["grid = new CharGrid(80,40)"]
    B --> E["canvas = getElementById('grid-canvas')"]
    B --> F["renderer = new CanvasRenderer(canvas)"]
    F --> F1["_measureFont():<br/>charWidth = ceil(measureText('M').width)<br/>charHeight = ceil(fontSize * 1.5)"]
    B --> G["history = new UndoManager()"]
    B --> H["components = []"]
    B --> I["Create _tools map"]
    I --> I1["select: new SelectTool(this)"]
    I --> I2["text/line/arrow: new SelectTool(this)"]
    I --> I3["pencil: new PencilTool(this)"]
    I --> I4["eraser: new EraserTool(this)"]
    I --> I5["brush: new BrushTool(this)"]
    B --> J["Create UI panels"]
    J --> J1["toolbarUI = new ToolbarUI(this)"]
    J --> J2["paletteUI = new PaletteUI(this)"]
    J --> J3["inspectorUI = new InspectorUI(this)"]
    J --> J4["layersUI = new LayersUI(this)"]
    J --> J5["statusBarUI = new StatusBarUI(this)"]
    B --> K["renderer.resizeToGrid(80, 40)"]
    K --> L["statusBarUI.updateGrid(80, 40)"]
    L --> M["statusBarUI.updateCount(0)"]
    M --> N["_bindEvents()"]
    N --> N1["canvas: mousedown/move/up/leave/dblclick/dragover/drop"]
    N --> N2["document: keydown"]
    N --> N3["eventbus: on('action'), on('componentChanged')"]
    N --> N4["setInterval(30s): _autoSave()"]
    N --> N5["window: resize"]
    N --> O["_loadAutoSave()"]
    O --> O1{"localStorage has data?"}
    O1 -->|Yes| O2["deserialize → components[]"]
    O1 -->|No| P["render() — first paint"]
    O2 --> P
    P --> Q["window.app = new App()"]
```

#### Data Flow Diagram (MVC)

```mermaid
graph LR
    subgraph INPUT["User Input"]
        MOUSE["Mouse events<br/>click/drag/dblclick"]
        KEYBOARD["Keyboard events<br/>shortcuts"]
        PALETTE["Palette drag<br/>drop component"]
    end

    subgraph CONTROLLER["Controller — App"]
        PIXEL["pixelToGrid(px,py)"]
        SHORTCUT["_getShortcutKey(e)"]
        ACTION["_handleAction(action)"]
        TOOL["_activeTool<br/>onMouseDown/Move/Up"]
        ADDC["addComponentAt()"]
    end

    subgraph MODEL["Model"]
        COMP["components[]"]
        SEL["selectedComponent"]
        CLIP["_clipboard"]
        HIST["history<br/>undoStack/redoStack"]
        GRID["CharGrid<br/>cells[80][40]"]
    end

    subgraph VIEW["View"]
        INSP["InspectorUI<br/>update(comp)"]
        LAYERS["LayersUI<br/>update()"]
        STATUS["StatusBarUI<br/>updatePos/Count/Tool"]
        REND["CanvasRenderer<br/>render(grid, overlays)"]
    end

    MOUSE --> PIXEL --> TOOL
    KEYBOARD --> SHORTCUT --> ACTION
    PALETTE --> ADDC
    ACTION --> TOOL
    ACTION --> ADDC

    TOOL -->|modify| COMP
    TOOL -->|modify| SEL
    ADDC -->|push| COMP
    ADDC -->|snapshot| HIST

    COMP -->|composite| GRID
    GRID -->|render| REND
    SEL -->|update| INSP
    COMP -->|update| LAYERS
    TOOL -->|getOverlays| REND
```

#### Render Pipeline

```mermaid
flowchart TD
    A["app.render()"] --> B["grid.composite(components.filter(visible))"]
    B --> B1["grid.clear() — fill all cells with ' '"]
    B1 --> B2["sort components by zIndex ascending"]
    B2 --> B3["for each component"]
    B3 --> B4["chars = component.render() — local char buffer"]
    B4 --> B5["grid._blit(comp.x, comp.y, chars)<br/>copy non-space chars to global grid"]
    B5 --> B3
    B3 -->|done| C["overlays = _activeTool.getOverlays()"]
    C --> C1{"SelectTool?"}
    C1 -->|Yes| C2["overlays: selection rect, handles[], marquee?, preview?"]
    C1 -->|No| C3["overlays: empty {}"]
    C2 --> D
    C3 --> D
    D{"cursor on canvas?"}
    D -->|Yes| D1["overlays.cursor = col, row"]
    D -->|No| E
    D1 --> E["renderer.render(grid, overlays)"]
    E --> E1["ctx.clearRect — clear canvas"]
    E1 --> E2["draw grid bg — crust color fill"]
    E2 --> E3["draw grid lines — 0.05 alpha at cell boundaries"]
    E3 --> E4["for each cell in 80x40:<br/>if char != ' ': fillText(char, col*cw, row*ch+yOffset)"]
    E4 --> E5["draw overlays:<br/>cursor: blue rect 0.3 alpha<br/>selection: dashed blue rect<br/>handles: 8 small blue squares<br/>marquee: dashed blue drag rect<br/>preview: dashed yellow rect"]
    E5 --> F["statusBarUI.updateCount(non-freehand count)"]
```

#### Add Component from Palette

```mermaid
sequenceDiagram
    participant U as User
    participant P as PaletteUI
    participant A as App
    participant R as ComponentRegistry
    participant H as UndoManager
    participant I as InspectorUI
    participant L as LayersUI

    U->>P: click elem-item
    P->>A: addComponentAtCenter(type)
    A->>R: getDefaults(type)
    R-->>A: {w, h, props}
    Note over A: col = floor((80-w)/2)<br/>row = floor((40-h)/2)
    A->>A: addComponentAt(type, col, row)
    A->>H: pushUndo() — serialize all components
    A->>R: create(type, col, row)
    R-->>A: new CompClass(col, row, w, h, props)
    Note over A: comp.zIndex = components.length<br/>components.push(comp)
    A->>A: selectComponent(comp)
    A->>I: update(comp) — rebuild prop rows
    A->>L: update() — rebuild layer list
    A->>A: render()
    A->>U: toast('Added type')
```

#### Drag Component on Canvas

```mermaid
stateDiagram-v2
    [*] --> IDLE

    IDLE --> RESIZING: mousedown on handle<br/>(selected && !locked)
    IDLE --> DRAGGING: mousedown hit component<br/>pushUndo, selectComponent
    IDLE --> MARQUEE: mousedown on empty area<br/>deselect

    RESIZING --> RESIZING: mousemove<br/>_applyResize(comp, dx, dy, min)<br/>render()
    RESIZING --> IDLE: mouseup<br/>render()

    DRAGGING --> DRAGGING: mousemove<br/>comp.x = clamp(origX+dx)<br/>comp.y = clamp(origY+dy)<br/>render()
    DRAGGING --> IDLE: mouseup<br/>render()

    MARQUEE --> MARQUEE: mousemove<br/>expand selection rect<br/>render()
    MARQUEE --> IDLE: mouseup<br/>find component in rect<br/>selectComponent or deselect<br/>render()
```

#### Undo/Redo Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant H as UndoManager
    participant R as ComponentRegistry
    participant I as InspectorUI
    participant L as LayersUI

    U->>A: Ctrl+Z (keydown)
    Note over A: _getShortcutKey(e) → 'ctrl+z'<br/>SHORTCUTS['ctrl+z'] → 'undo'<br/>_handleAction('undo')
    A->>H: undo(components)
    H->>H: serialize current → push to redoStack
    H->>H: pop undoStack → snapshot
    H->>R: deserialize each component in snapshot
    R-->>H: Component[]
    H-->>A: restored Component[]
    A->>A: components = restored
    A->>A: selectedComponent = null
    A->>I: update(null)
    A->>L: update()
    A->>A: render()
    A->>U: toast('Undo')
```

#### Save/Load Flow

```mermaid
flowchart TD
    subgraph SAVE["Save Flow"]
        S1["User clicks Save / Ctrl+S"] --> S2["ExportUtils.saveToFile(components)"]
        S2 --> S3["data = {version:1, gridCols, gridRows,<br/>components.map(serialize), timestamp}"]
        S3 --> S4["blob = new Blob(JSON.stringify(data))"]
        S4 --> S5["url = URL.createObjectURL(blob)"]
        S5 --> S6["a.href=url, a.download='wireframe.kaomoji.json'<br/>a.click()"]
        S6 --> S7["URL.revokeObjectURL(url)"]
        S7 --> S8["toast('Saved to file')"]
    end

    subgraph LOAD["Load Flow"]
        L1["User clicks Load / Ctrl+O"] --> L2["ExportUtils.loadFromFile()"]
        L2 --> L3["create hidden input type=file accept=.json"]
        L3 --> L4["input.click() → user selects file"]
        L4 --> L5["FileReader.readAsText(file)"]
        L5 --> L6["JSON.parse(result)"]
        L6 --> L7{"data.version === 1?"}
        L7 -->|No| L8["reject('Unsupported file version')"]
        L7 -->|Yes| L9["data.components.map(ComponentRegistry.deserialize)"]
        L9 --> L10["pushUndo, replace components,<br/>update UI panels, render()"]
        L10 --> L11["toast('Loaded from file')"]
        L8 --> L12["toast('Load failed: ...')"]
    end
```

#### Copy Markdown Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant G as CharGrid
    participant E as ExportUtils
    participant CB as Clipboard API

    U->>A: Click 'Copy MD' / Ctrl+Shift+C
    Note over A: _handleAction('copyMarkdown')
    A->>G: composite(components.filter(visible))
    Note over G: clear → sort by zIndex → blit each
    A->>E: exportAsMarkdown(grid)
    Note over E: grid.toText() → trimEnd rows<br/>trim trailing empty lines<br/>wrap in triple backticks
    E-->>A: markdown string
    A->>E: copyToClipboard(md)
    E->>CB: navigator.clipboard.writeText(md)
    alt Clipboard API succeeds
        CB-->>E: success
        E-->>A: true
        A->>U: toast('Markdown copied!')
    else Clipboard API fails
        E->>E: fallback: textarea + execCommand('copy')
        E-->>A: true/false
        A->>U: toast result
    end
```
