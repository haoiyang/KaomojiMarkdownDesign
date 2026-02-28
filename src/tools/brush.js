// === Brush Tool: draw with box-drawing characters ===

class BrushTool extends BaseTool {
    constructor(app) {
        super('brush', app);
        this._drawing = false;
        this._lastCol = -1;
        this._lastRow = -1;
        this._previewCells = [];
    }

    activate() {
        this._drawing = false;
        this._previewCells = [];
    }

    deactivate() {
        this._drawing = false;
        this._previewCells = [];
    }

    onMouseDown(col, row, e) {
        this._drawing = true;
        this._lastCol = col;
        this._lastRow = row;
        this.app.pushUndo();
        this._brushAt(col, row, col, row);
    }

    onMouseMove(col, row, e) {
        if (this._drawing) {
            this._brushAt(this._lastCol, this._lastRow, col, row);
            this._lastCol = col;
            this._lastRow = row;
        } else {
            this._previewCells = [{ col, row }];
            this.app.render();
        }
    }

    onMouseUp(col, row, e) {
        this._drawing = false;
        this._lastCol = -1;
        this._lastRow = -1;
        this._previewCells = [];
        this.app.render();
    }

    _brushAt(fromCol, fromRow, toCol, toRow) {
        // Get or create freehand layer
        let freehand = this.app.components.find(c => c.type === 'textbox' && c.name === '_freehand');
        if (!freehand) {
            freehand = ComponentRegistry.create('textbox', 0, 0, {
                text: '',
                name: '_freehand',
            });
            freehand.w = GRID_COLS;
            freehand.h = GRID_ROWS;
            freehand.name = '_freehand';
            freehand.zIndex = -1000;
            const lines = [];
            for (let r = 0; r < GRID_ROWS; r++) {
                lines.push(' '.repeat(GRID_COLS));
            }
            freehand.props.text = lines.join('\n');
            this.app.components.push(freehand);
        }

        const bc = BORDER_CHARS.single;
        const lines = freehand.props.text.split('\n');
        while (lines.length < GRID_ROWS) lines.push(' '.repeat(GRID_COLS));

        // Draw line from (fromCol,fromRow) to (toCol,toRow) using box chars
        const dx = toCol - fromCol;
        const dy = toRow - fromRow;

        if (Math.abs(dx) >= Math.abs(dy)) {
            // Mostly horizontal
            const steps = Math.max(1, Math.abs(dx));
            for (let i = 0; i <= steps; i++) {
                const c = fromCol + Math.round(dx * i / steps);
                const r = fromRow + Math.round(dy * i / steps);
                this._setChar(lines, c, r, bc.h);
            }
        } else {
            // Mostly vertical
            const steps = Math.max(1, Math.abs(dy));
            for (let i = 0; i <= steps; i++) {
                const c = fromCol + Math.round(dx * i / steps);
                const r = fromRow + Math.round(dy * i / steps);
                this._setChar(lines, c, r, bc.v);
            }
        }

        freehand.props.text = lines.join('\n');
        this.app.render();
    }

    _setChar(lines, col, row, ch) {
        if (row < 0 || row >= lines.length || col < 0 || col >= GRID_COLS) return;
        const line = lines[row].padEnd(GRID_COLS);
        lines[row] = line.substring(0, col) + ch + line.substring(col + 1);
    }

    getOverlays() {
        return { drawPreview: this._previewCells };
    }

    getCursor() { return 'crosshair'; }
}
