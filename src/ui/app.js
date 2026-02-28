// === App: main orchestrator ===

class App {
    constructor() {
        this.bus = new EventBus();
        this.grid = new CharGrid();
        this.canvas = document.getElementById('grid-canvas');
        this.renderer = new CanvasRenderer(this.canvas);
        this.history = new UndoManager();
        this.components = [];
        this.selectedComponents = new Set(); // stores component IDs
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
            let hit = this.hitTest(col, row);
            // Drill into group to find the actual child at (col, row)
            if (hit && hit.type === 'group' && hit.children) {
                const child = [...hit.children]
                    .filter(c => c && typeof c === 'object' && c.contains)
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .find(c => c.contains(col, row));
                if (child) hit = child;
            }
            if (!hit) return;
            const info = this._getInlineEditInfo(hit, col, row);
            if (info) {
                this._startInlineEdit(hit, px, py, info.propKey, info.editBounds || null, info.onSave || null);
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
            case 'selectAll': {
                const all = this.components.filter(c => c.name !== '_freehand' && c.visible);
                if (all.length > 0) this.selectMultiple(all);
                break;
            }
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

    // === Selection Management ===

    get selectedComponent() {
        if (this.selectedComponents.size === 1) {
            const id = this.selectedComponents.values().next().value;
            return this.components.find(c => c.id === id) || null;
        }
        return null;
    }

    isSelected(comp) {
        return this.selectedComponents.has(comp.id);
    }

    getSelectedComponents() {
        return this.components.filter(c => this.selectedComponents.has(c.id));
    }

    selectComponent(comp) {
        this.selectedComponents.clear();
        if (comp) this.selectedComponents.add(comp.id);
        this.inspectorUI.update(comp);
        this.layersUI.update();
        this.render();
    }

    toggleSelect(comp) {
        if (this.selectedComponents.has(comp.id)) {
            this.selectedComponents.delete(comp.id);
        } else {
            this.selectedComponents.add(comp.id);
        }
        this._updateSelectionUI();
    }

    selectMultiple(comps) {
        this.selectedComponents.clear();
        for (const c of comps) this.selectedComponents.add(c.id);
        this._updateSelectionUI();
    }

    _updateSelectionUI() {
        const single = this.selectedComponent; // uses getter
        this.inspectorUI.update(single);
        this.layersUI.update();
        this.render();
    }

    deleteComponent(comp) {
        this.pushUndo();
        const idx = this.components.indexOf(comp);
        if (idx >= 0) {
            this.components.splice(idx, 1);
            this.selectedComponents.delete(comp.id);
            this._updateSelectionUI();
            this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
            this._toast('Deleted component');
        }
    }

    deleteSelected() {
        const toDelete = this.getSelectedComponents().filter(c => !c.locked);
        if (toDelete.length === 0) return;
        this.pushUndo();
        for (const comp of toDelete) {
            const idx = this.components.indexOf(comp);
            if (idx >= 0) this.components.splice(idx, 1);
            this.selectedComponents.delete(comp.id);
        }
        this._updateSelectionUI();
        this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
        this._toast(`Deleted ${toDelete.length} component${toDelete.length > 1 ? 's' : ''}`);
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
            this.selectedComponents.clear();
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
            this.selectedComponents.clear();
            this.inspectorUI.update(null);
            this.layersUI.update();
            this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
            this.render();
            this._toast('Redo');
        }
    }

    // === Copy / Paste ===

    copySelected() {
        const selected = this.getSelectedComponents();
        if (selected.length > 0) {
            this._clipboard = selected.map(c => c.serialize());
            this._toast('Copied');
        }
    }

    pasteClipboard() {
        if (this._clipboard && this._clipboard.length > 0) {
            this.pushUndo();
            const pasted = [];
            for (const orig of this._clipboard) {
                const data = JSON.parse(JSON.stringify(orig));
                data.id = ++_componentIdCounter;
                data.name = `${data.type}_${data.id}`;
                data.x += 2;
                data.y += 1;
                // Offset group children positions and assign new IDs
                if (data.children && Array.isArray(data.children)) {
                    for (const child of data.children) {
                        child.id = ++_componentIdCounter;
                        child.name = `${child.type}_${child.id}`;
                        child.x += 2;
                        child.y += 1;
                    }
                }
                const comp = ComponentRegistry.deserialize(data);
                comp.zIndex = this.components.length;
                this.components.push(comp);
                pasted.push(comp);
            }
            this.selectMultiple(pasted);
            this._toast('Pasted');
        }
    }

    cutSelected() {
        const selected = this.getSelectedComponents();
        if (selected.length > 0) {
            this.copySelected();
            this.deleteSelected();
            this._toast('Cut');
        }
    }

    rotateSelected() {
        if (this.selectedComponents.size !== 1) return;
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

    mkGroup(checkedIds = null) {
        const ids = checkedIds || this.selectedComponents;
        const targets = this.components.filter(c => ids.has(c.id) && c.name !== '_freehand');
        if (targets.length < 2) {
            this._toast('Select at least 2 components to group');
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
        this.components = this.components.filter(c => !ids.has(c.id));
        group.zIndex = this.components.length;
        this.components.push(group);
        this.selectComponent(group);
        this.render();
        this._toast('Grouped ' + targets.length + ' components');
    }

    deGroup() {
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

        this.selectedComponents.clear();
        this.inspectorUI.update(null);
        this.layersUI.update();
        this.statusBarUI.updateCount(this.components.filter(c => c.name !== '_freehand').length);
        this.render();
        this._toast('Ungrouped ' + children.length + ' components');
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
            this.selectedComponents.clear();
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
        this.selectedComponents.clear();
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

    _getInlineEditInfo(comp, col, row) {
        switch (comp.type) {
            case 'textbox':
                return { propKey: 'text' };

            case 'button':
                return {
                    propKey: 'label',
                    editBounds: { x: comp.x + 2, y: comp.y, w: Math.max(1, comp.w - 4), h: 1 },
                };

            case 'input':
                return {
                    propKey: 'placeholder',
                    editBounds: { x: comp.x + 1, y: comp.y, w: Math.max(1, comp.w - 2), h: 1 },
                };

            case 'card':
                return {
                    propKey: 'title',
                    editBounds: { x: comp.x + 2, y: comp.y + 1, w: Math.max(1, comp.w - 4), h: 1 },
                };

            case 'modal':
                return {
                    propKey: 'title',
                    editBounds: { x: comp.x + 2, y: comp.y + 1, w: Math.max(1, comp.w - 6), h: 1 },
                };

            case 'table': {
                const numCols = Math.min(comp.props.cols, Math.max(1, Math.floor((comp.w - 1) / 3)));
                const colWidth = Math.floor((comp.w - 1) / numCols);
                const localCol = col - comp.x;
                const colIdx = Math.min(numCols - 1, Math.max(0, Math.floor(localCol / colWidth)));
                const headers = comp.props.headers || [];
                return {
                    propKey: 'headers',
                    editBounds: {
                        x: comp.x + colIdx * colWidth + 1,
                        y: comp.y + 1,
                        w: Math.max(1, colWidth - 1),
                        h: 1,
                    },
                    onSave: {
                        initValue: headers[colIdx] || '',
                        save: (val) => { headers[colIdx] = val; comp.props.headers = [...headers]; },
                    },
                };
            }

            case 'tabs': {
                const tabs = comp.props.tabs || [];
                const activeIdx = comp.props.activeIndex || 0;
                let cx = 0;
                const localCol = col - comp.x;
                for (let i = 0; i < tabs.length; i++) {
                    const label = tabs[i];
                    const isActive = (i === activeIdx);
                    const tabWidth = isActive ? label.length + 2 : label.length;
                    if (localCol >= cx && localCol < cx + tabWidth + 1) {
                        const textStart = isActive ? cx + 1 : cx;
                        return {
                            propKey: 'tabs',
                            editBounds: {
                                x: comp.x + textStart,
                                y: comp.y,
                                w: Math.max(1, label.length),
                                h: 1,
                            },
                            onSave: {
                                initValue: label,
                                save: (val) => { tabs[i] = val; comp.props.tabs = [...tabs]; },
                            },
                        };
                    }
                    cx += tabWidth + 1;
                }
                return null;
            }

            case 'navbar': {
                const localCol = col - comp.x;
                const logo = comp.props.logo || '';
                const links = comp.props.links || [];
                const action = comp.props.action || '';

                // Logo region
                if (localCol < logo.length + 2) {
                    return {
                        propKey: 'logo',
                        editBounds: { x: comp.x, y: comp.y, w: Math.max(1, logo.length), h: 1 },
                        onSave: {
                            initValue: logo,
                            save: (val) => { comp.props.logo = val; },
                        },
                    };
                }

                // Action region (right-aligned)
                const actionText = action ? `[${action}]` : '';
                const actionStart = comp.w - actionText.length;
                if (actionText && localCol >= actionStart) {
                    return {
                        propKey: 'action',
                        editBounds: { x: comp.x + actionStart + 1, y: comp.y, w: Math.max(1, action.length), h: 1 },
                        onSave: {
                            initValue: action,
                            save: (val) => { comp.props.action = val; },
                        },
                    };
                }

                // Links region
                let linkCol = logo.length + 2;
                for (let i = 0; i < links.length; i++) {
                    const link = links[i];
                    if (localCol >= linkCol && localCol < linkCol + link.length + 2) {
                        return {
                            propKey: 'links',
                            editBounds: { x: comp.x + linkCol, y: comp.y, w: Math.max(1, link.length), h: 1 },
                            onSave: {
                                initValue: link,
                                save: (val) => { links[i] = val; comp.props.links = [...links]; },
                            },
                        };
                    }
                    linkCol += link.length + 2;
                }
                return null;
            }

            case 'dropdown':
                return {
                    propKey: 'value',
                    editBounds: { x: comp.x + 1, y: comp.y, w: Math.max(1, comp.w - 4), h: 1 },
                };

            case 'search':
                return {
                    propKey: 'placeholder',
                    editBounds: { x: comp.x + 3, y: comp.y, w: Math.max(1, comp.w - 4), h: 1 },
                };

            case 'checkbox':
                return {
                    propKey: 'label',
                    editBounds: { x: comp.x + 4, y: comp.y, w: Math.max(1, comp.w - 4), h: 1 },
                };

            case 'radio':
                return {
                    propKey: 'label',
                    editBounds: { x: comp.x + 4, y: comp.y, w: Math.max(1, comp.w - 4), h: 1 },
                };

            case 'toggle': {
                const prefixLen = comp.props.on ? 8 : 9; // '[━●] On ' or '[●━] Off '
                return {
                    propKey: 'label',
                    editBounds: { x: comp.x + prefixLen, y: comp.y, w: Math.max(1, comp.w - prefixLen), h: 1 },
                };
            }

            case 'breadcrumb':
                return {
                    propKey: 'items',
                    onSave: {
                        initValue: (comp.props.items || []).join(', '),
                        save: (val) => { comp.props.items = val.split(',').map(s => s.trim()).filter(s => s); },
                    },
                };

            default:
                return null;
        }
    }

    _startInlineEdit(comp, px, py, propKey = 'text', editBounds = null, onSave = null) {
        const editor = document.getElementById('inline-editor');
        const canvasArea = document.getElementById('canvas-area');
        const canvasRect = this.canvas.getBoundingClientRect();
        const areaRect = canvasArea.getBoundingClientRect();

        const bx = editBounds ? editBounds.x : comp.x;
        const by = editBounds ? editBounds.y : comp.y;
        const bw = editBounds ? editBounds.w : comp.w;
        const bh = editBounds ? editBounds.h : comp.h;

        const x = bx * this.renderer.charWidth + (canvasRect.left - areaRect.left) + canvasArea.scrollLeft;
        const y = by * this.renderer.charHeight + (canvasRect.top - areaRect.top) + canvasArea.scrollTop;

        editor.style.display = 'block';
        editor.style.left = x + 'px';
        editor.style.top = y + 'px';
        editor.style.width = (bw * this.renderer.charWidth) + 'px';
        editor.style.height = (bh * this.renderer.charHeight) + 'px';
        editor.style.fontSize = this.renderer.fontSize + 'px';
        editor.style.fontFamily = this.renderer.fontFamily;
        editor.style.lineHeight = this.renderer.charHeight + 'px';
        // Match canvas per-cell character spacing
        const extraSpace = this.renderer.charWidth - this.renderer._fontCharWidth;
        editor.style.letterSpacing = extraSpace + 'px';
        editor.style.paddingLeft = Math.floor(extraSpace / 2) + 'px';
        editor.style.paddingTop = Math.floor((this.renderer.charHeight - this.renderer.fontSize) / 2) + 'px';
        if (onSave) {
            editor.value = onSave.initValue;
        } else {
            const rawVal = comp.props[propKey];
            const isArray = Array.isArray(rawVal);
            editor.value = isArray ? rawVal.join(', ') : (rawVal || '');
        }
        editor.focus();
        editor.select();

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            this.pushUndo();
            if (onSave) {
                onSave.save(editor.value);
            } else {
                const rawVal = comp.props[propKey];
                const isArray = Array.isArray(rawVal);
                comp.props[propKey] = isArray ? editor.value.split(',').map(s => s.trim()) : editor.value;
            }
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
