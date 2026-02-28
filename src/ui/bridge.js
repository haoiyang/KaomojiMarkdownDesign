// === KaomojiBridge: WebSocket client for MCP server communication ===

class KaomojiBridge {
    constructor() {
        this.ws = null;
        this.url = 'ws://localhost:9878';
        this._reconnectTimer = null;
        this._connected = false;
    }

    connect() {
        if (this.ws && this.ws.readyState <= 1) return; // CONNECTING or OPEN

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this._connected = true;
                console.log('[KaomojiBridge] Connected to MCP server');
                if (this._reconnectTimer) {
                    clearInterval(this._reconnectTimer);
                    this._reconnectTimer = null;
                }
            };

            this.ws.onmessage = (event) => {
                this._handleMessage(event.data);
            };

            this.ws.onclose = () => {
                this._connected = false;
                this.ws = null;
                this._scheduleReconnect();
            };

            this.ws.onerror = () => {
                // onclose will fire after onerror
            };
        } catch (e) {
            this._scheduleReconnect();
        }
    }

    _scheduleReconnect() {
        if (this._reconnectTimer) return;
        this._reconnectTimer = setInterval(() => this.connect(), 3000);
    }

    _handleMessage(raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch (e) {
            console.error('[KaomojiBridge] Invalid JSON:', e);
            return;
        }

        const { id, command, params } = msg;
        if (!id || !command) return;

        let response;
        try {
            if (!window.app) throw new Error('App not initialized');
            const result = this._dispatch(command, params || {});
            response = { id, success: true, result };
        } catch (e) {
            response = { id, success: false, error: e.message };
        }

        if (this.ws && this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(response));
        }
    }

    _dispatch(command, params) {
        switch (command) {
            case 'status':       return this._cmdStatus(params);
            case 'list_components': return this._cmdListComponents(params);
            case 'add_component':   return this._cmdAddComponent(params);
            case 'delete_component': return this._cmdDeleteComponent(params);
            case 'move_component':  return this._cmdMoveComponent(params);
            case 'resize_component': return this._cmdResizeComponent(params);
            case 'set_props':       return this._cmdSetProps(params);
            case 'get_component':   return this._cmdGetComponent(params);
            case 'select':          return this._cmdSelect(params);
            case 'group':           return this._cmdGroup(params);
            case 'undo_redo':       return this._cmdUndoRedo(params);
            case 'export':          return this._cmdExport(params);
            case 'import_json':     return this._cmdImportJson(params);
            case 'export_json':     return this._cmdExportJson(params);
            case 'clear':           return this._cmdClear(params);
            case 'pencil':          return this._cmdPencil(params);
            case 'eraser':          return this._cmdEraser(params);
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }

    // --- Command Handlers ---

    _cmdStatus() {
        const app = window.app;
        const count = app.components.filter(c => c.name !== '_freehand').length;
        return {
            gridCols: GRID_COLS,
            gridRows: GRID_ROWS,
            componentCount: count,
            selectedIds: [...app.selectedComponents],
            currentTool: app.currentToolId
        };
    }

    _cmdListComponents(params) {
        const app = window.app;
        const includeProps = params.include_props || false;
        const list = app.components
            .filter(c => c.name !== '_freehand')
            .map(c => {
                const info = {
                    id: c.id,
                    type: c.type,
                    name: c.name,
                    x: c.x, y: c.y,
                    w: c.w, h: c.h,
                    zIndex: c.zIndex,
                    visible: c.visible,
                    locked: c.locked,
                    borderStyle: c.borderStyle
                };
                if (includeProps) info.props = { ...c.props };
                return info;
            });
        return { components: list };
    }

    _cmdAddComponent(params) {
        const app = window.app;
        const { type, col, row, props } = params;
        app.pushUndo();
        const comp = ComponentRegistry.create(type, col, row, props);
        comp.zIndex = app.components.length;
        app.components.push(comp);
        app.selectComponent(comp);
        app.render();
        return this._serializeComponent(comp);
    }

    _cmdDeleteComponent(params) {
        const app = window.app;
        const { ids } = params;
        if (!ids || ids.length === 0) throw new Error('No IDs provided');
        app.pushUndo();
        const deleted = [];
        for (const id of ids) {
            const idx = app.components.findIndex(c => c.id === id);
            if (idx >= 0) {
                deleted.push(id);
                app.selectedComponents.delete(id);
                app.components.splice(idx, 1);
            }
        }
        app._updateSelectionUI();
        app.statusBarUI.updateCount(app.components.filter(c => c.name !== '_freehand').length);
        app.render();
        return { deleted };
    }

    _cmdMoveComponent(params) {
        const app = window.app;
        const comp = this._findComponent(params.id);
        app.pushUndo();
        comp.x = Math.max(0, Math.min(GRID_COLS - comp.w, params.col));
        comp.y = Math.max(0, Math.min(GRID_ROWS - comp.h, params.row));
        app.render();
        return this._serializeComponent(comp);
    }

    _cmdResizeComponent(params) {
        const app = window.app;
        const comp = this._findComponent(params.id);
        const min = comp.getMinSize();
        app.pushUndo();
        comp.w = Math.max(min.minW, params.w);
        comp.h = Math.max(min.minH, params.h);
        // Clamp to grid
        if (comp.x + comp.w > GRID_COLS) comp.x = Math.max(0, GRID_COLS - comp.w);
        if (comp.y + comp.h > GRID_ROWS) comp.y = Math.max(0, GRID_ROWS - comp.h);
        app.render();
        return this._serializeComponent(comp);
    }

    _cmdSetProps(params) {
        const app = window.app;
        const comp = this._findComponent(params.id);
        const props = params.props || {};
        app.pushUndo();

        // Direct properties
        const directKeys = ['x', 'y', 'w', 'h', 'borderStyle', 'visible', 'locked', 'zIndex', 'name'];
        for (const key of directKeys) {
            if (key in props) comp[key] = props[key];
        }

        // Type-specific properties go into comp.props
        for (const [key, value] of Object.entries(props)) {
            if (!directKeys.includes(key)) {
                comp.props[key] = value;
            }
        }

        app.inspectorUI.update(app.selectedComponent);
        app.render();
        return this._serializeComponent(comp);
    }

    _cmdGetComponent(params) {
        const comp = this._findComponent(params.id);
        return this._serializeComponent(comp, true);
    }

    _cmdSelect(params) {
        const app = window.app;
        const ids = params.ids || [];
        app.selectedComponents.clear();
        for (const id of ids) {
            const comp = app.components.find(c => c.id === id);
            if (comp) app.selectedComponents.add(id);
        }
        app._updateSelectionUI();
        return { selected: [...app.selectedComponents] };
    }

    _cmdGroup(params) {
        const app = window.app;
        const { action, ids } = params;
        if (action === 'group') {
            if (!ids || ids.length < 2) throw new Error('Need at least 2 component IDs to group');
            const idSet = new Set(ids);
            app.mkGroup(idSet);
            const group = app.selectedComponent;
            return group ? this._serializeComponent(group) : { grouped: true };
        } else if (action === 'ungroup') {
            app.deGroup();
            return { ungrouped: true };
        } else {
            throw new Error(`Unknown group action: ${action}`);
        }
    }

    _cmdUndoRedo(params) {
        const app = window.app;
        const { action } = params;
        if (action === 'undo') {
            app.undo();
            return { action: 'undo', componentCount: app.components.filter(c => c.name !== '_freehand').length };
        } else if (action === 'redo') {
            app.redo();
            return { action: 'redo', componentCount: app.components.filter(c => c.name !== '_freehand').length };
        } else {
            throw new Error(`Unknown action: ${action}`);
        }
    }

    _cmdExport(params) {
        const app = window.app;
        const format = params.format || 'markdown';
        app.grid.composite(app.components.filter(c => c.visible));
        if (format === 'markdown') {
            return { format: 'markdown', content: ExportUtils.exportAsMarkdown(app.grid) };
        } else {
            return { format: 'text', content: ExportUtils.exportAsText(app.grid) };
        }
    }

    _cmdImportJson(params) {
        const app = window.app;
        const { data } = params;
        if (!data || !data.components) throw new Error('Invalid import data: missing components array');
        app.pushUndo();
        app.components = data.components.map(d => ComponentRegistry.deserialize(d));
        app.selectedComponents.clear();
        app.inspectorUI.update(null);
        app.layersUI.update();
        app.statusBarUI.updateCount(app.components.filter(c => c.name !== '_freehand').length);
        app.render();
        return { imported: app.components.filter(c => c.name !== '_freehand').length };
    }

    _cmdExportJson(params) {
        const app = window.app;
        const data = {
            version: 1,
            gridCols: GRID_COLS,
            gridRows: GRID_ROWS,
            components: app.components.filter(c => c.name !== '_freehand').map(c => c.serialize()),
            timestamp: new Date().toISOString()
        };
        return data;
    }

    _cmdClear() {
        const app = window.app;
        app.pushUndo();
        app.components = [];
        app.selectedComponents.clear();
        app.inspectorUI.update(null);
        app.layersUI.update();
        app.statusBarUI.updateCount(0);
        app.render();
        return { cleared: true };
    }

    _getOrCreateFreehand() {
        const app = window.app;
        let freehand = app.components.find(c => c.name === '_freehand');
        if (!freehand) {
            freehand = ComponentRegistry.create('textbox', 0, 0, {
                text: Array(GRID_ROWS).fill(' '.repeat(GRID_COLS)).join('\n')
            });
            freehand.name = '_freehand';
            freehand.w = GRID_COLS;
            freehand.h = GRID_ROWS;
            freehand.zIndex = -1000;
            app.components.push(freehand);
        }
        return freehand;
    }

    _cmdPencil(params) {
        const app = window.app;
        const cells = params.cells || [];
        if (cells.length === 0) throw new Error('No cells provided');

        const freehand = this._getOrCreateFreehand();
        app.pushUndo();

        const lines = freehand.props.text.split('\n');
        while (lines.length < GRID_ROWS) lines.push(' '.repeat(GRID_COLS));

        let count = 0;
        for (const cell of cells) {
            const col = parseInt(cell.col);
            const row = parseInt(cell.row);
            const ch = (cell.char || '*').charAt(0);
            if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) continue;
            let line = lines[row];
            while (line.length <= col) line += ' ';
            lines[row] = line.substring(0, col) + ch + line.substring(col + 1);
            count++;
        }

        freehand.props.text = lines.join('\n');
        app.render();
        return { drawn: count };
    }

    _cmdEraser(params) {
        const app = window.app;
        const cells = params.cells || [];
        if (cells.length === 0) throw new Error('No cells provided');

        const freehand = app.components.find(c => c.name === '_freehand');
        if (!freehand) return { erased: 0 };

        app.pushUndo();

        const lines = freehand.props.text.split('\n');
        let count = 0;
        for (const cell of cells) {
            const col = parseInt(cell.col);
            const row = parseInt(cell.row);
            if (row < 0 || row >= lines.length || col < 0 || col >= GRID_COLS) continue;
            let line = lines[row];
            if (col < line.length && line[col] !== ' ') {
                lines[row] = line.substring(0, col) + ' ' + line.substring(col + 1);
                count++;
            }
        }

        freehand.props.text = lines.join('\n');
        app.render();
        return { erased: count };
    }

    // --- Helpers ---

    _findComponent(id) {
        const comp = window.app.components.find(c => c.id === id);
        if (!comp) throw new Error(`Component ${id} not found`);
        return comp;
    }

    _serializeComponent(comp, includeProps = true) {
        const data = {
            id: comp.id,
            type: comp.type,
            name: comp.name,
            x: comp.x, y: comp.y,
            w: comp.w, h: comp.h,
            zIndex: comp.zIndex,
            visible: comp.visible,
            locked: comp.locked,
            borderStyle: comp.borderStyle
        };
        if (includeProps) data.props = { ...comp.props };
        return data;
    }
}

// Auto-connect after App initializes
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window._kaomojiBridge = new KaomojiBridge();
        window._kaomojiBridge.connect();
    }, 100);
});
