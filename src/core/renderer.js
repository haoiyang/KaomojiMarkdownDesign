// === CanvasRenderer: draws CharGrid onto HTML5 Canvas ===

class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.charWidth = 0;
        this.charHeight = 0;
        this.fontSize = DEFAULT_FONT_SIZE;
        this.fontFamily = DEFAULT_FONT_FAMILY;
        this._measureFont();
    }

    _measureFont() {
        this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        const m = this.ctx.measureText('M');
        this._fontCharWidth = Math.ceil(m.width);
        // Square cells: use font size as cell dimension
        const cellSize = this.fontSize + 2;
        this.charWidth = cellSize;
        this.charHeight = cellSize;
    }

    // Get total pixel dimensions for a grid
    getGridPixelSize(cols, rows) {
        return {
            width: cols * this.charWidth,
            height: rows * this.charHeight,
        };
    }

    // Resize canvas to fit grid
    resizeToGrid(cols, rows) {
        const dpr = window.devicePixelRatio || 1;
        const size = this.getGridPixelSize(cols, rows);
        this.canvas.width = size.width * dpr;
        this.canvas.height = size.height * dpr;
        this.canvas.style.width = size.width + 'px';
        this.canvas.style.height = size.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._measureFont();
    }

    // Convert pixel position to grid coordinates
    pixelToGrid(px, py) {
        return {
            col: Math.floor(px / this.charWidth),
            row: Math.floor(py / this.charHeight),
        };
    }

    // Render the full grid
    render(grid, overlays = {}) {
        const ctx = this.ctx;
        const cw = this.charWidth;
        const ch = this.charHeight;
        const cols = grid.cols;
        const rows = grid.rows;

        // Background
        ctx.fillStyle = COLORS.cellBg;
        ctx.fillRect(0, 0, cols * cw, rows * ch);

        // Grid lines (subtle)
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 0.5;
        for (let c = 0; c <= cols; c++) {
            ctx.beginPath();
            ctx.moveTo(c * cw, 0);
            ctx.lineTo(c * cw, rows * ch);
            ctx.stroke();
        }
        for (let r = 0; r <= rows; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * ch);
            ctx.lineTo(cols * cw, r * ch);
            ctx.stroke();
        }

        // Characters (centered in square cells)
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = COLORS.text;
        const xPad = Math.floor((cw - this._fontCharWidth) / 2);
        const yPad = Math.floor((ch - this.fontSize) / 2);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const ch_ = grid.getChar(c, r);
                if (ch_ !== ' ') {
                    ctx.fillText(ch_, c * cw + xPad, r * ch + yPad);
                }
            }
        }

        // Overlays
        if (overlays.cursor) {
            this._drawCursor(overlays.cursor.col, overlays.cursor.row);
        }
        if (overlays.selection) {
            this._drawSelection(overlays.selection);
        }
        if (overlays.handles) {
            for (const h of overlays.handles) {
                this._drawHandle(h.col, h.row);
            }
        }
        if (overlays.selectionRect) {
            this._drawSelectionRect(overlays.selectionRect);
        }
        if (overlays.drawPreview) {
            this._drawPreviewCells(overlays.drawPreview);
        }
        if (overlays.linePreview) {
            this._drawLinePreview(overlays.linePreview);
        }
    }

    _drawCursor(col, row) {
        const ctx = this.ctx;
        ctx.strokeStyle = COLORS.cursor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(
            col * this.charWidth, row * this.charHeight,
            this.charWidth, this.charHeight
        );
        ctx.setLineDash([]);
    }

    _drawSelection(rect) {
        const ctx = this.ctx;
        const x = rect.x * this.charWidth;
        const y = rect.y * this.charHeight;
        const w = rect.w * this.charWidth;
        const h = rect.h * this.charHeight;
        ctx.fillStyle = COLORS.selection;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = COLORS.selectionBorder;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
    }

    _drawHandle(col, row) {
        const ctx = this.ctx;
        const cx = col * this.charWidth + this.charWidth / 2;
        const cy = row * this.charHeight + this.charHeight / 2;
        const r = 3;
        ctx.fillStyle = COLORS.handleFill;
        ctx.strokeStyle = COLORS.handle;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _drawSelectionRect(rect) {
        const ctx = this.ctx;
        const x = rect.x * this.charWidth;
        const y = rect.y * this.charHeight;
        const w = rect.w * this.charWidth;
        const h = rect.h * this.charHeight;
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
    }

    _drawPreviewCells(cells) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(166, 227, 161, 0.3)';
        for (const { col, row } of cells) {
            ctx.fillRect(
                col * this.charWidth, row * this.charHeight,
                this.charWidth, this.charHeight
            );
        }
    }

    _drawLinePreview(p) {
        const ctx = this.ctx;
        const x = p.x * this.charWidth;
        const y = p.y * this.charHeight;
        const w = p.w * this.charWidth;
        const h = p.h * this.charHeight;
        ctx.fillStyle = 'rgba(137, 180, 250, 0.2)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#89b4fa';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
    }
}
