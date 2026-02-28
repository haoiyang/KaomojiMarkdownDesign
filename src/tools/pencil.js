// === Pencil Tool: freehand character drawing ===

class PencilTool extends BaseTool {
    constructor(app) {
        super('pencil', app);
        this._drawing = false;
        this._drawChar = '*';
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
        this._previewCells = [];
        this.app.pushUndo();
        this._drawAt(col, row);
    }

    onMouseMove(col, row, e) {
        if (this._drawing) {
            this._drawAt(col, row);
        } else {
            this._previewCells = [{ col, row }];
            this.app.render();
        }
    }

    onMouseUp(col, row, e) {
        this._drawing = false;
        this._previewCells = [];
        this.app.render();
    }

    _drawAt(col, row) {
        // Create or find the "freehand" textbox component that spans the grid
        let freehand = this.app.components.find(c => c.type === 'textbox' && c.name === '_freehand');
        if (!freehand) {
            freehand = ComponentRegistry.create('textbox', 0, 0, {
                text: '',
                name: '_freehand',
            });
            freehand.w = GRID_COLS;
            freehand.h = GRID_ROWS;
            freehand.name = '_freehand';
            freehand.zIndex = -1000; // Below everything
            // Initialize empty text grid
            const lines = [];
            for (let r = 0; r < GRID_ROWS; r++) {
                lines.push(' '.repeat(GRID_COLS));
            }
            freehand.props.text = lines.join('\n');
            this.app.components.push(freehand);
        }

        // Set the character at (col, row) in the freehand text
        const lines = freehand.props.text.split('\n');
        while (lines.length <= row) lines.push(' '.repeat(GRID_COLS));
        const line = lines[row].padEnd(GRID_COLS);
        lines[row] = line.substring(0, col) + this._drawChar + line.substring(col + 1);
        freehand.props.text = lines.join('\n');

        this.app.render();
    }

    getOverlays() {
        return { drawPreview: this._previewCells };
    }

    getCursor() { return 'crosshair'; }
}
