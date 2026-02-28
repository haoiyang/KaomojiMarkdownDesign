// === Line Tool: click-drag to draw lines/arrows at any angle ===

class LineTool extends BaseTool {
    constructor(app, isArrow) {
        super(isArrow ? 'arrow' : 'line', app);
        this._isArrow = isArrow;
        this._drawing = false;
        this._startCol = 0;
        this._startRow = 0;
        this._endCol = 0;
        this._endRow = 0;
        this._preview = null;
    }

    activate() {
        this._drawing = false;
        this._preview = null;
    }

    deactivate() {
        this._drawing = false;
        this._preview = null;
    }

    onMouseDown(col, row, e) {
        this._drawing = true;
        this._startCol = col;
        this._startRow = row;
        this._endCol = col;
        this._endRow = row;
        this._updatePreview();
        this.app.render();
    }

    onMouseMove(col, row, e) {
        if (!this._drawing) return;
        this._endCol = col;
        this._endRow = row;
        this._updatePreview();
        this.app.render();
    }

    onMouseUp(col, row, e) {
        if (!this._drawing) return;
        this._drawing = false;
        this._endCol = col;
        this._endRow = row;
        this._updatePreview();

        if (!this._preview) {
            this._preview = null;
            this.app.render();
            return;
        }

        const p = this._preview;
        const type = this._isArrow ? 'arrow' : 'line';
        const props = { flipped: p.flipped };
        if (this._isArrow) {
            props.reversed = p.reversed;
        }

        this.app.pushUndo();
        const comp = ComponentRegistry.create(type, p.x, p.y, props);
        comp.w = p.w;
        comp.h = p.h;
        comp.zIndex = this.app.components.length;
        this.app.components.push(comp);
        this.app.selectComponent(comp);
        this.app._toast(`Added ${type}`);

        this._preview = null;
        this.app.setTool('select');
    }

    _updatePreview() {
        const dx = this._endCol - this._startCol;
        const dy = this._endRow - this._startRow;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < 1 && absDy < 1) {
            this._preview = null;
            return;
        }

        const x = Math.min(this._startCol, this._endCol);
        const y = Math.min(this._startRow, this._endRow);
        const w = Math.max(1, absDx + 1);
        const h = Math.max(1, absDy + 1);

        // flipped = TR→BL (dx and dy have opposite signs)
        const flipped = (dx > 0 && dy < 0) || (dx < 0 && dy > 0);

        // reversed = arrowhead at Bresenham start instead of end
        const eRelX = this._endCol - x;
        const eRelY = this._endRow - y;
        let reversed;
        if (!flipped) {
            reversed = (eRelX === 0 && eRelY === 0);
        } else {
            reversed = (eRelX === w - 1 && eRelY === 0);
        }

        this._preview = { x, y, w, h, flipped, reversed };
    }

    getOverlays() {
        const overlays = {};
        if (this._preview) {
            overlays.linePreview = this._preview;
        }
        return overlays;
    }

    getCursor() { return 'crosshair'; }
}
