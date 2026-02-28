// === Eraser Tool: click to delete a component, drag region to delete all within ===

class EraserTool extends BaseTool {
    constructor(app) {
        super('eraser', app);
        this._dragging = false;
        this._startCol = 0;
        this._startRow = 0;
        this._endCol = 0;
        this._endRow = 0;
        this._marquee = null;
    }

    activate() {
        this._dragging = false;
        this._marquee = null;
    }

    deactivate() {
        this._dragging = false;
        this._marquee = null;
    }

    onMouseDown(col, row, e) {
        this._dragging = true;
        this._startCol = col;
        this._startRow = row;
        this._endCol = col;
        this._endRow = row;
        this._marquee = null;
    }

    onMouseMove(col, row, e) {
        if (!this._dragging) return;
        this._endCol = col;
        this._endRow = row;

        // Build marquee rect
        const x = Math.min(this._startCol, this._endCol);
        const y = Math.min(this._startRow, this._endRow);
        const w = Math.abs(this._endCol - this._startCol) + 1;
        const h = Math.abs(this._endRow - this._startRow) + 1;
        this._marquee = { x, y, w, h };
        this.app.render();
    }

    onMouseUp(col, row, e) {
        if (!this._dragging) return;
        this._dragging = false;

        const x = Math.min(this._startCol, col);
        const y = Math.min(this._startRow, row);
        const w = Math.abs(col - this._startCol) + 1;
        const h = Math.abs(row - this._startRow) + 1;

        // Small region (≤ 2 cells) — treat as single click, use start position
        if (w <= 2 && h <= 2) {
            const hit = this.app.hitTest(this._startCol, this._startRow);
            if (hit && !hit.locked) {
                this.app.deleteComponent(hit);
            } else {
                this.app._toast('Nothing to erase here');
            }
        } else {
            // Region drag: delete all components that overlap the marquee
            const toDelete = this.app.components.filter(c =>
                c.visible && !c.locked && c.name !== '_freehand' &&
                c.x < x + w && c.x + c.w > x &&
                c.y < y + h && c.y + c.h > y
            );
            if (toDelete.length > 0) {
                this.app.pushUndo();
                for (const comp of toDelete) {
                    const idx = this.app.components.indexOf(comp);
                    if (idx >= 0) this.app.components.splice(idx, 1);
                }
                for (const comp of toDelete) {
                    this.app.selectedComponents.delete(comp.id);
                }
                this.app._updateSelectionUI();
                this.app.layersUI.update();
                this.app.statusBarUI.updateCount(
                    this.app.components.filter(c => c.name !== '_freehand').length
                );
                this.app._toast(`Deleted ${toDelete.length} component${toDelete.length > 1 ? 's' : ''}`);
            } else {
                this.app._toast('No components in region');
            }
        }

        this._marquee = null;
        this.app.render();
    }

    getOverlays() {
        const overlays = {};
        if (this._marquee) {
            overlays.selectionRect = this._marquee;
        }
        return overlays;
    }

    getCursor() { return 'crosshair'; }
}
