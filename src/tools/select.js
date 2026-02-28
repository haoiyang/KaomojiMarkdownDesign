// === Select Tool: click to select, drag to move, handles to resize ===

class SelectTool extends BaseTool {
    constructor(app) {
        super('select', app);
        this._dragging = false;
        this._resizing = false;
        this._resizeDir = null;
        this._startCol = 0;
        this._startRow = 0;
        this._origX = 0;
        this._origY = 0;
        this._origW = 0;
        this._origH = 0;
        this._marquee = null;
    }

    activate() {
        this._dragging = false;
        this._resizing = false;
        this._marquee = null;
    }

    deactivate() {
        this._dragging = false;
        this._resizing = false;
        this._marquee = null;
    }

    onMouseDown(col, row, e) {
        const app = this.app;
        const selected = app.selectedComponent;

        // Check resize handles first
        if (selected && !selected.locked) {
            const handleDir = selected.getHandleAt(col, row);
            if (handleDir) {
                this._resizing = true;
                this._resizeDir = handleDir;
                this._startCol = col;
                this._startRow = row;
                this._origX = selected.x;
                this._origY = selected.y;
                this._origW = selected.w;
                this._origH = selected.h;
                app.pushUndo();
                return;
            }
        }

        // Hit test: find topmost component under cursor
        const hit = app.hitTest(col, row);
        if (hit) {
            app.selectComponent(hit);
            if (!hit.locked) {
                this._dragging = true;
                this._startCol = col;
                this._startRow = row;
                this._origX = hit.x;
                this._origY = hit.y;
                app.pushUndo();
            }
        } else {
            // Start marquee selection
            app.selectComponent(null);
            this._marquee = { x1: col, y1: row, x2: col, y2: row };
        }
    }

    onMouseMove(col, row, e) {
        const app = this.app;
        const selected = app.selectedComponent;

        if (this._resizing && selected) {
            const dx = col - this._startCol;
            const dy = row - this._startRow;
            const min = selected.getMinSize();
            this._applyResize(selected, dx, dy, min);
            app.render();
            return;
        }

        if (this._dragging && selected) {
            const dx = col - this._startCol;
            const dy = row - this._startRow;
            const newX = Math.max(0, Math.min(GRID_COLS - selected.w, this._origX + dx));
            const newY = Math.max(0, Math.min(GRID_ROWS - selected.h, this._origY + dy));
            // Shift group children by the same delta
            if (selected.type === 'group' && selected.children) {
                const shiftX = newX - selected.x;
                const shiftY = newY - selected.y;
                for (const child of selected.children) {
                    child.x += shiftX;
                    child.y += shiftY;
                }
            }
            selected.x = newX;
            selected.y = newY;
            app.render();
            return;
        }

        if (this._marquee) {
            this._marquee.x2 = col;
            this._marquee.y2 = row;
            app.render();
        }
    }

    onMouseUp(col, row, e) {
        if (this._marquee) {
            // Select all components within marquee rectangle
            const mx = Math.min(this._marquee.x1, this._marquee.x2);
            const my = Math.min(this._marquee.y1, this._marquee.y2);
            const mw = Math.abs(this._marquee.x2 - this._marquee.x1);
            const mh = Math.abs(this._marquee.y2 - this._marquee.y1);
            if (mw > 1 || mh > 1) {
                // Find first component within
                const hit = this.app.components.slice().reverse().find(c =>
                    c.visible && c.x >= mx && c.y >= my &&
                    c.x + c.w <= mx + mw + 1 && c.y + c.h <= my + mh + 1
                );
                if (hit) this.app.selectComponent(hit);
            }
            this._marquee = null;
        }
        this._dragging = false;
        this._resizing = false;
        this._resizeDir = null;
        this.app.render();
    }

    _applyResize(comp, dx, dy, min) {
        const dir = this._resizeDir;
        let x = this._origX, y = this._origY, w = this._origW, h = this._origH;

        if (dir.includes('e')) { w = Math.max(min.minW, this._origW + dx); }
        if (dir.includes('w')) { w = Math.max(min.minW, this._origW - dx); x = this._origX + this._origW - w; }
        if (dir.includes('s')) { h = Math.max(min.minH, this._origH + dy); }
        if (dir.includes('n')) { h = Math.max(min.minH, this._origH - dy); y = this._origY + this._origH - h; }

        // Clamp to grid
        x = Math.max(0, x);
        y = Math.max(0, y);
        if (x + w > GRID_COLS) w = GRID_COLS - x;
        if (y + h > GRID_ROWS) h = GRID_ROWS - y;

        // Shift group children when position changes (n/w resize)
        if (comp.type === 'group' && comp.children) {
            const shiftX = x - comp.x;
            const shiftY = y - comp.y;
            if (shiftX !== 0 || shiftY !== 0) {
                for (const child of comp.children) {
                    child.x += shiftX;
                    child.y += shiftY;
                }
            }
        }

        comp.x = x;
        comp.y = y;
        comp.w = w;
        comp.h = h;
    }

    getOverlays() {
        const overlays = {};
        const selected = this.app.selectedComponent;
        if (selected) {
            overlays.selection = selected.getBounds();
            if (!selected.locked) {
                overlays.handles = selected.getHandles();
            }
        }
        if (this._marquee) {
            const x = Math.min(this._marquee.x1, this._marquee.x2);
            const y = Math.min(this._marquee.y1, this._marquee.y2);
            overlays.selectionRect = {
                x, y,
                w: Math.abs(this._marquee.x2 - this._marquee.x1) + 1,
                h: Math.abs(this._marquee.y2 - this._marquee.y1) + 1,
            };
        }
        return overlays;
    }

    getCursor() { return 'default'; }
}
