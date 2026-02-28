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
        this._origPositions = new Map(); // for multi-drag: id → {x, y}
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

        // Check resize handles — only when exactly 1 selected
        const single = app.selectedComponent; // getter: null if != 1
        if (single && !single.locked) {
            const handleDir = single.getHandleAt(col, row);
            if (handleDir) {
                this._resizing = true;
                this._resizeDir = handleDir;
                this._startCol = col;
                this._startRow = row;
                this._origX = single.x;
                this._origY = single.y;
                this._origW = single.w;
                this._origH = single.h;
                app.pushUndo();
                return;
            }
        }

        // Hit test: find topmost component under cursor
        const hit = app.hitTest(col, row);

        if (hit && e.shiftKey) {
            // Shift+click: toggle selection
            app.toggleSelect(hit);
            // Start dragging if the component is now selected and unlocked
            if (app.isSelected(hit) && !hit.locked) {
                this._startMultiDrag(col, row);
            }
            return;
        }

        if (hit) {
            // If not already selected, replace selection
            if (!app.isSelected(hit)) {
                app.selectComponent(hit);
            }
            if (!hit.locked) {
                this._startMultiDrag(col, row);
            }
        } else {
            // Click on empty space
            if (!e.shiftKey) {
                app.selectComponent(null);
            }
            this._marquee = { x1: col, y1: row, x2: col, y2: row };
        }
    }

    _startMultiDrag(col, row) {
        this._dragging = true;
        this._startCol = col;
        this._startRow = row;
        this._origPositions.clear();
        for (const comp of this.app.getSelectedComponents()) {
            this._origPositions.set(comp.id, { x: comp.x, y: comp.y });
        }
        this.app.pushUndo();
    }

    onMouseMove(col, row, e) {
        const app = this.app;

        if (this._resizing) {
            const single = app.selectedComponent;
            if (single) {
                const dx = col - this._startCol;
                const dy = row - this._startRow;
                const min = single.getMinSize();
                this._applyResize(single, dx, dy, min);
                app.render();
            }
            return;
        }

        if (this._dragging) {
            const dx = col - this._startCol;
            const dy = row - this._startRow;
            for (const comp of app.getSelectedComponents()) {
                if (comp.locked) continue;
                const orig = this._origPositions.get(comp.id);
                if (!orig) continue;
                const newX = Math.max(0, Math.min(GRID_COLS - comp.w, orig.x + dx));
                const newY = Math.max(0, Math.min(GRID_ROWS - comp.h, orig.y + dy));
                // Shift group children by the same delta
                if (comp.type === 'group' && comp.children) {
                    const shiftX = newX - comp.x;
                    const shiftY = newY - comp.y;
                    for (const child of comp.children) {
                        child.x += shiftX;
                        child.y += shiftY;
                    }
                }
                comp.x = newX;
                comp.y = newY;
            }
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
                const hits = this.app.components.filter(c =>
                    c.visible && c.name !== '_freehand' &&
                    c.x >= mx && c.y >= my &&
                    c.x + c.w <= mx + mw + 1 && c.y + c.h <= my + mh + 1
                );
                if (hits.length > 0) {
                    if (e.shiftKey) {
                        // Shift+marquee: add to existing selection
                        for (const h of hits) {
                            this.app.selectedComponents.add(h.id);
                        }
                        this.app._updateSelectionUI();
                    } else {
                        this.app.selectMultiple(hits);
                    }
                }
            }
            this._marquee = null;
        }
        this._dragging = false;
        this._resizing = false;
        this._resizeDir = null;
        this._origPositions.clear();
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
        const selectedComps = this.app.getSelectedComponents();

        if (selectedComps.length > 0) {
            // Draw selection rect for each selected component
            overlays.selections = selectedComps.map(c => c.getBounds());

            // Only show resize handles for single selection
            if (selectedComps.length === 1 && !selectedComps[0].locked) {
                overlays.handles = selectedComps[0].getHandles();
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
