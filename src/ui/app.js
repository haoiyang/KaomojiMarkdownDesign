// === App: main orchestrator ===

class App {
    constructor() {
        this.bus = new EventBus();
        this.grid = new CharGrid();
        this.canvas = document.getElementById('grid-canvas');
        this.renderer = new CanvasRenderer(this.canvas);
        this.history = new UndoManager();
        this.components = [];
        this.selectedComponent = null;
        this.currentToolId = 'select';
        this._cursorCol = 0;
        this._cursorRow = 0;
        this._clipboard = null;

        // Tools
        this._tools = {
            select: new SelectTool(this),
            text: new TextTool(this),
            line: new LineTool(this, false),
            arrow: new LineTool(this, true),
            eraser: new EraserTool(this),
        };
        this._activeTool = this._tools.select;

        // UI
        this.toolbarUI = new ToolbarUI(this);
        this.paletteUI = new PaletteUI(this);
        this.inspectorUI = new InspectorUI(this);
        this.layersUI = new LayersUI(this);
        this.statusBarUI = new StatusBarUI(this);

        // Splitters
        this._leftSplitter = new PanelSplitter(
            document.getElementById('left-splitter'),
            document.getElementById('left-panel'),
            'left',
            { minWidth: 100, maxWidth: 300, onResize: () => this.render() }
        );
        this._rightSplitter = new PanelSplitter(
            document.getElementById('right-splitter'),
            document.getElementById('right-panel'),
            'right',
            { minWidth: 140, maxWidth: 400, onResize: () => this.render() }
        );

        // Init
        this.renderer.resizeToGrid(this.grid.cols, this.grid.rows);
        this.statusBarUI.updateGrid(this.grid.cols, this.grid.rows);
        this.statusBarUI.updateCount(0);

        this._bindEvents();
        this._loadAutoSave();
        this.render();
    }

    _bindEvents() {
        // Canvas mouse events
        const canvasArea = document.getElementById('canvas-area');

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const { col, row } = this.renderer.pixelToGrid(px, py);
            this._activeTool.onMouseDown(col, row, e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const { col, row } = this.renderer.pixelToGrid(px, py);
            this._cursorCol = col;
            this._cursorRow = row;
            this.statusBarUI.updatePos(col, row);
            this._activeTool.onMouseMove(col, row, e);
        });

        // mouseup on document so it fires even if mouse leaves canvas
        document.addEventListener('mouseup', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const { col, row } = this.renderer.pixelToGrid(px, py);
            this._activeTool.onMouseUp(col, row, e);
        });

        this.canvas.addEventListener('mouseleave', () => {
            this._cursorCol = -1;
            this._cursorRow = -1;
            this.render();
        });

        // Double-click to edit text
        this.canvas.addEventListener('dblclick', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const { col, row } = this.renderer.pixelToGrid(px, py);
            const hit = this.hitTest(col, row);
            if (hit && hit.props.text !== undefined) {
                this._startInlineEdit(hit, px, py);
            } else if (hit && hit.props.label !== undefined) {
                this._startInlineEdit(hit, px, py, 'label');
            } else if (hit && hit.props.title !== undefined) {
                this._startInlineEdit(hit, px, py, 'title');
            }
        });

        // Drag-and-drop from palette
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('text/plain');
            if (!type) return;
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const { col, row } = this.renderer.pixelToGrid(px, py);
            this.addComponentAt(type, col, row);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't intercept when editing inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            const key = this._getShortcutKey(e);
            const action = SHORTCUTS[key] || SHORTCUTS[e.key];
            if (action) {
                e.preventDefault();
                this._handleAction(action);
            }
        });

        // EventBus actions
        this.bus.on('action', (action) => this._handleAction(action));
        this.bus.on('componentChanged', () => {
            this.render();
            this.layersUI.update();
        });

        // Auto-save every 30 seconds
        setInterval(() => this._autoSave(), 30000);

        // Window resize
        window.addEventListener('resize', () => this.render());
    }

    _getShortcutKey(e) {
        const parts = [];
        if (e.ctrlKey) parts.push('ctrl');
        if (e.metaKey) parts.push('meta');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        parts.push(e.key);
        return parts.join('+');
    }

    _handleAction(action) {
        if (action.startsWith('tool:')) {
            this.setTool(action.substring(5));
            return;
        }

        switch (action) {
            case 'undo': this.undo(); break;
            case 'redo': this.redo(); break;
            case 'delete': this.deleteSelected(); break;
            case 'deselect': this.selectComponent(null); break;
            case 'selectAll':
                if (this.components.length > 0) {
                    this.selectComponent(this.components[this.components.length - 1]);
                }
                break;
            case 'copy': this.copySelected(); break;
            case 'paste': this.pasteClipboard(); break;
            case 'cut': this.cutSelected(); break;
            case 'save': this.saveToFile(); break;
            case 'saveAs': this.saveToFile(); break;
            case 'load': this.loadFromFile(); break;
            case 'new': this.newCanvas(); break;
            case 'copyMarkdown': this.copyMarkdown(); break;
            case 'pasteMarkdown': this.pasteMarkdown(); break;
            case 'rotate': this.rotateSelected(); break;
        }
    }

    // === Tool Management ===

    setTool(toolId) {
        if (this._activeTool) this._activeTool.deactivate();
        this.currentToolId = toolId;
        this._activeTool = this._tools[toolId] || this._tools.select;
        this._activeTool.activate();
        this.canvas.style.cursor = this._activeTool.getCursor();
        this.paletteUI.updateActiveTool(toolId);
        this.statusBarUI.updateTool(toolId);
        this.render();
    }

    // === Component Management ===

    addComponentAt(type, col, row) {
        this.pushUndo();
        const comp = ComponentRegistry.create(type, col, row);
        comp.zIndex = this.components.length;
        this.components.push(comp);
        this.selectComponent(comp);
        this.render();
        this._toast(`Added ${type}`);
    }

    addComponentAtCenter(type) {
        const defaults = ComponentRegistry.getDefaults(type);
        const col = Math.floor((GRID_COLS - (defaults?.w || 10)) / 2);
        const row = Math.floor((GRID_ROWS - (defaults?.h || 4)) / 2);
        this.addComponentAt(type, col, row);
    }

    selectComponent(comp) {
        this.selectedComponent = comp;
        this.inspectorUI.update(comp);
        this.layersUI.update();
        this.render();
    }

    deleteComponent(comp) {
        this.pushUndo();
        const idx = this.components.indexOf(comp);
        if (idx >= 0) {
            this.components.splice(idx, 1);
            if (this.selectedComponent === comp) {
                this.selectedComponent = null;
                this.inspectorUI.update(null);
            }
            this.layersUI.update();
            this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
            this.render();
            this._toast('Deleted component');
        }
    }

    deleteSelected() {
        if (this.selectedComponent && !this.selectedComponent.locked) {
            this.deleteComponent(this.selectedComponent);
        }
    }

    hitTest(col, row) {
        // Reverse z-order: topmost first
        const sorted = [...this.components]
            .filter(c => c.visible && c.name !== '_freehand')
            .sort((a, b) => b.zIndex - a.zIndex);
        for (const comp of sorted) {
            if (comp.contains(col, row)) return comp;
        }
        return null;
    }

    // === Undo / Redo ===

    pushUndo() {
        this.history.push(this.components);
    }

    undo() {
        const restored = this.history.undo(this.components);
        if (restored) {
            this.components = restored;
            this.selectedComponent = null;
            this.inspectorUI.update(null);
            this.layersUI.update();
            this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
            this.render();
            this._toast('Undo');
        }
    }

    redo() {
        const restored = this.history.redo(this.components);
        if (restored) {
            this.components = restored;
            this.selectedComponent = null;
            this.inspectorUI.update(null);
            this.layersUI.update();
            this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
            this.render();
            this._toast('Redo');
        }
    }

    // === Copy / Paste ===

    copySelected() {
        if (this.selectedComponent) {
            this._clipboard = this.selectedComponent.serialize();
            this._toast('Copied');
        }
    }

    pasteClipboard() {
        if (this._clipboard) {
            this.pushUndo();
            const data = JSON.parse(JSON.stringify(this._clipboard));
            data.id = ++_componentIdCounter;
            data.name = `${data.type}_${data.id}`;
            data.x += 2;
            data.y += 1;
            const comp = ComponentRegistry.deserialize(data);
            comp.zIndex = this.components.length;
            this.components.push(comp);
            this.selectComponent(comp);
            this.render();
            this._toast('Pasted');
        }
    }

    cutSelected() {
        if (this.selectedComponent) {
            this.copySelected();
            this.deleteSelected();
            this._toast('Cut');
        }
    }

    rotateSelected() {
        const comp = this.selectedComponent;
        if (!comp || comp.locked) return;
        this.pushUndo();

        if (comp.type === 'line' || comp.type === 'arrow') {
            // Swap w and h + toggle flipped = 90° rotation
            const oldW = comp.w;
            comp.w = comp.h;
            comp.h = oldW;
            comp.props.flipped = !comp.props.flipped;
        } else {
            // General rotation: swap w and h
            const oldW = comp.w;
            comp.w = comp.h;
            comp.h = oldW;
        }

        // Keep within grid bounds
        if (comp.x + comp.w > GRID_COLS) comp.x = Math.max(0, GRID_COLS - comp.w);
        if (comp.y + comp.h > GRID_ROWS) comp.y = Math.max(0, GRID_ROWS - comp.h);

        this.inspectorUI.update(comp);
        this.render();
        this._toast('Rotated');
    }

    // === Group / Ungroup ===

    mkLayer(checkedIds) {
        const targets = this.components.filter(c => checkedIds.has(c.id) && c.name !== '_freehand');
        if (targets.length < 2) {
            this._toast('Check at least 2 layers to group');
            return;
        }
        this.pushUndo();

        // Compute bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const c of targets) {
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            maxX = Math.max(maxX, c.x + c.w);
            maxY = Math.max(maxY, c.y + c.h);
        }

        const group = ComponentRegistry.create('group', minX, minY);
        group.w = maxX - minX;
        group.h = maxY - minY;
        group.children = targets;

        // Remove children from top-level components
        this.components = this.components.filter(c => !checkedIds.has(c.id));
        group.zIndex = this.components.length;
        this.components.push(group);
        this.selectComponent(group);
        this.render();
        this._toast('Grouped ' + targets.length + ' layers');
    }

    deLayer() {
        const sel = this.selectedComponent;
        if (!sel || sel.type !== 'group') {
            this._toast('Select a group to ungroup');
            return;
        }
        this.pushUndo();

        const children = sel.children;
        const idx = this.components.indexOf(sel);
        if (idx >= 0) this.components.splice(idx, 1);

        for (const child of children) {
            child.zIndex = this.components.length;
            this.components.push(child);
        }

        this.selectedComponent = null;
        this.inspectorUI.update(null);
        this.layersUI.update();
        this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
        this.render();
        this._toast('Ungrouped ' + children.length + ' layers');
    }

    // === File Operations ===

    saveToFile() {
        ExportUtils.saveToFile(this.components);
        this._toast('Saved to file');
    }

    async loadFromFile() {
        try {
            const components = await ExportUtils.loadFromFile();
            this.pushUndo();
            this.components = components;
            this.selectedComponent = null;
            this.inspectorUI.update(null);
            this.layersUI.update();
            this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
            this.render();
            this._toast('Loaded from file');
        } catch (err) {
            this._toast('Load failed: ' + err.message);
        }
    }

    newCanvas() {
        if (this.components.length > 0 && !confirm('Clear canvas? Unsaved changes will be lost.')) return;
        this.pushUndo();
        this.components = [];
        this.selectedComponent = null;
        this.inspectorUI.update(null);
        this.layersUI.update();
        this.statusBarUI.updateCount(0);
        this.history.clear();
        localStorage.removeItem('kaomoji_project');
        this.render();
        this._toast('New canvas');
    }

    async copyMarkdown() {
        this.grid.composite(this.components.filter(c => c.visible));
        const md = ExportUtils.exportAsMarkdown(this.grid);
        const ok = await ExportUtils.copyToClipboard(md);
        this._toast(ok ? 'Markdown copied!' : 'Copy failed');
    }

    async pasteMarkdown() {
        try {
            let text = await navigator.clipboard.readText();
            if (!text) { this._toast('Clipboard is empty'); return; }
            // Strip markdown code fence if present
            text = text.replace(/^```[^\n]*\n/, '').replace(/\n```\s*$/, '');
            const lines = text.split('\n');
            const h = lines.length;
            const w = Math.max(...lines.map(l => l.length));
            if (w === 0 || h === 0) { this._toast('Nothing to paste'); return; }
            // Pad lines to equal width
            const padded = lines.map(l => l.padEnd(w));
            this.pushUndo();
            const comp = new TextBoxComponent(0, 0, w, h, { text: padded.join('\n') });
            comp.id = ++_componentIdCounter;
            comp.name = `textbox_${comp.id}`;
            comp.zIndex = this.components.length;
            this.components.push(comp);
            this.selectComponent(comp);
            this.render();
            this._toast('Pasted markdown');
        } catch (err) {
            this._toast('Paste failed: ' + err.message);
        }
    }

    // === Inline Text Editing ===

    _startInlineEdit(comp, px, py, propKey = 'text') {
        const editor = document.getElementById('inline-editor');
        const canvasArea = document.getElementById('canvas-area');
        const canvasRect = this.canvas.getBoundingClientRect();
        const areaRect = canvasArea.getBoundingClientRect();

        const x = comp.x * this.renderer.charWidth + (canvasRect.left - areaRect.left) + canvasArea.scrollLeft;
        const y = comp.y * this.renderer.charHeight + (canvasRect.top - areaRect.top) + canvasArea.scrollTop;

        editor.style.display = 'block';
        editor.style.left = x + 'px';
        editor.style.top = y + 'px';
        editor.style.width = (comp.w * this.renderer.charWidth) + 'px';
        editor.style.height = (comp.h * this.renderer.charHeight) + 'px';
        editor.style.fontSize = this.renderer.fontSize + 'px';
        editor.style.fontFamily = this.renderer.fontFamily;
        editor.style.lineHeight = this.renderer.charHeight + 'px';
        editor.value = comp.props[propKey] || '';
        editor.focus();
        editor.select();

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            this.pushUndo();
            comp.props[propKey] = editor.value;
            editor.style.display = 'none';
            editor.removeEventListener('blur', finish);
            editor.removeEventListener('keydown', onKey);
            this.render();
            this.inspectorUI.update(comp);
        };

        const onKey = (e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
                editor.style.display = 'none';
                editor.removeEventListener('blur', finish);
                editor.removeEventListener('keydown', onKey);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finish();
            }
        };

        editor.addEventListener('blur', finish);
        editor.addEventListener('keydown', onKey);
    }

    // === Rendering ===

    render() {
        // Composite all visible components onto grid
        this.grid.composite(this.components.filter(c => c.visible));

        // Build overlays
        const overlays = this._activeTool.getOverlays();
        if (this._cursorCol >= 0 && this._cursorRow >= 0) {
            overlays.cursor = { col: this._cursorCol, row: this._cursorRow };
        }

        // Render
        this.renderer.render(this.grid, overlays);

        // Update component count
        this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
    }

    // === Auto-save ===

    _autoSave() {
        if (this.components.length > 0) {
            ExportUtils.saveToLocalStorage(this.components);
        } else {
            localStorage.removeItem('kaomoji_project');
        }
    }

    _loadAutoSave() {
        const components = ExportUtils.loadFromLocalStorage();
        if (components && components.length > 0) {
            this.components = components;
            this.layersUI.update();
            this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
        }
    }

    // === Toast ===

    _toast(msg, duration = 2000) {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => el.classList.remove('show'), duration);
    }
}

// === Bootstrap ===
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
