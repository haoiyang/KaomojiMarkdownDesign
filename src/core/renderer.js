// === CanvasRenderer: draws CharGrid onto HTML5 Canvas ===

// Box-drawing characters → direction flags (t=top, b=bottom, l=left, r=right)
// Used to render these chars with canvas lines instead of fillText for seamless connections
const _CANVAS_BOX_DIRS = {
    // Single
    '─': 'lr', '│': 'tb',
    '┌': 'rb', '┐': 'lb', '└': 'rt', '┘': 'lt',
    '├': 'trb', '┤': 'tlb', '┬': 'lrb', '┴': 'lrt', '┼': 'tlrb',
    // Heavy
    '━': 'lr', '┃': 'tb',
    '┏': 'rb', '┓': 'lb', '┗': 'rt', '┛': 'lt',
    '┣': 'trb', '┫': 'tlb', '┳': 'lrb', '┻': 'lrt', '╋': 'tlrb',
    // Double
    '═': 'lr', '║': 'tb',
    '╔': 'rb', '╗': 'lb', '╚': 'rt', '╝': 'lt',
    '╠': 'trb', '╣': 'tlb', '╦': 'lrb', '╩': 'lrt', '╬': 'tlrb',
    // Rounded (straight lines, same geometry as single)
    '╭': 'rb', '╮': 'lb', '╰': 'rt', '╯': 'lt',
};

const _BOX_HEAVY = new Set('━┃┏┓┗┛┣┫┳┻╋'.split(''));
const _BOX_DOUBLE = new Set('═║╔╗╚╝╠╣╦╩╬'.split(''));

// Diagonal and intersection characters → flags: f=forward(/), b=back(\), h=horiz, v=vert
const _CANVAS_DIAG_CHARS = {
    '/': 'f', '\\': 'b',
    '+': 'hv', 'X': 'fb', '*': 'hvfb',
    // PUA chars for unique direction combos (from mergeLineChars)
    '\uE001': 'hf',    // H|D
    '\uE002': 'hb',    // H|B
    '\uE003': 'vf',    // V|D
    '\uE004': 'vb',    // V|B
    '\uE005': 'hvf',   // H|V|D
    '\uE006': 'hvb',   // H|V|B
    '\uE007': 'hfb',   // H|D|B
    '\uE008': 'vfb',   // V|D|B
};

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
                    if (!this._drawBoxChar(c, r, ch_)) {
                        ctx.fillStyle = COLORS.text;
                        ctx.fillText(ch_, c * cw + xPad, r * ch + yPad);
                    }
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
        if (overlays.selections) {
            for (const sel of overlays.selections) {
                this._drawSelection(sel);
            }
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

    // Draw a box-drawing or line character using canvas lines (returns true if handled)
    _drawBoxChar(col, row, ch_) {
        const dirs = _CANVAS_BOX_DIRS[ch_];
        if (dirs) {
            if (_BOX_DOUBLE.has(ch_)) {
                this._drawDoubleBox(col, row, ch_);
            } else {
                this._drawSingleBox(col, row, dirs, _BOX_HEAVY.has(ch_));
            }
            return true;
        }
        // Diagonal and intersection characters
        const diag = _CANVAS_DIAG_CHARS[ch_];
        if (diag) {
            this._drawDiagChar(col, row, diag);
            return true;
        }
        return false;
    }

    // Draw single/heavy/rounded box char with one line per direction
    _drawSingleBox(col, row, dirs, isHeavy) {
        const ctx = this.ctx;
        const cw = this.charWidth;
        const ch = this.charHeight;
        const x = col * cw;
        const y = row * ch;
        const cx = Math.floor(x + cw / 2) + 0.5;
        const cy = Math.floor(y + ch / 2) + 0.5;

        ctx.strokeStyle = COLORS.text;
        ctx.lineWidth = isHeavy ? 2.5 : 1;
        ctx.lineCap = 'square';
        ctx.beginPath();

        if (dirs.includes('t')) { ctx.moveTo(cx, y); ctx.lineTo(cx, cy); }
        if (dirs.includes('b')) { ctx.moveTo(cx, cy); ctx.lineTo(cx, y + ch); }
        if (dirs.includes('l')) { ctx.moveTo(x, cy); ctx.lineTo(cx, cy); }
        if (dirs.includes('r')) { ctx.moveTo(cx, cy); ctx.lineTo(x + cw, cy); }

        ctx.stroke();
    }

    // Draw diagonal / intersection characters with canvas lines
    _drawDiagChar(col, row, flags) {
        const ctx = this.ctx;
        const cw = this.charWidth;
        const ch = this.charHeight;
        const x = col * cw;
        const y = row * ch;
        const cx = Math.floor(x + cw / 2) + 0.5;
        const cy = Math.floor(y + ch / 2) + 0.5;

        ctx.strokeStyle = COLORS.text;
        ctx.lineWidth = 1;
        ctx.lineCap = 'square';
        ctx.beginPath();

        if (flags.includes('f')) { ctx.moveTo(x, y + ch); ctx.lineTo(x + cw, y); }
        if (flags.includes('b')) { ctx.moveTo(x, y); ctx.lineTo(x + cw, y + ch); }
        if (flags.includes('h')) { ctx.moveTo(x, cy); ctx.lineTo(x + cw, cy); }
        if (flags.includes('v')) { ctx.moveTo(cx, y); ctx.lineTo(cx, y + ch); }

        ctx.stroke();
    }

    // Draw double box char with two parallel lines per direction
    _drawDoubleBox(col, row, ch_) {
        const ctx = this.ctx;
        const cw = this.charWidth;
        const chh = this.charHeight;
        const x = col * cw;
        const y = row * chh;
        const cx = Math.floor(x + cw / 2) + 0.5;
        const cy = Math.floor(y + chh / 2) + 0.5;
        const g = Math.max(2, Math.floor(cw / 6));
        const r = x + cw;
        const b = y + chh;

        ctx.strokeStyle = COLORS.text;
        ctx.lineWidth = 1;
        ctx.lineCap = 'square';
        ctx.beginPath();

        switch (ch_) {
            case '═':
                ctx.moveTo(x, cy-g); ctx.lineTo(r, cy-g);
                ctx.moveTo(x, cy+g); ctx.lineTo(r, cy+g);
                break;
            case '║':
                ctx.moveTo(cx-g, y); ctx.lineTo(cx-g, b);
                ctx.moveTo(cx+g, y); ctx.lineTo(cx+g, b);
                break;
            case '╔':
                ctx.moveTo(cx-g, cy-g); ctx.lineTo(r, cy-g);
                ctx.moveTo(cx-g, cy-g); ctx.lineTo(cx-g, b);
                ctx.moveTo(cx+g, cy+g); ctx.lineTo(r, cy+g);
                ctx.moveTo(cx+g, cy+g); ctx.lineTo(cx+g, b);
                break;
            case '╗':
                ctx.moveTo(x, cy-g); ctx.lineTo(cx+g, cy-g);
                ctx.moveTo(cx+g, cy-g); ctx.lineTo(cx+g, b);
                ctx.moveTo(x, cy+g); ctx.lineTo(cx-g, cy+g);
                ctx.moveTo(cx-g, cy+g); ctx.lineTo(cx-g, b);
                break;
            case '╚':
                ctx.moveTo(cx-g, y); ctx.lineTo(cx-g, cy+g);
                ctx.moveTo(cx-g, cy+g); ctx.lineTo(r, cy+g);
                ctx.moveTo(cx+g, y); ctx.lineTo(cx+g, cy-g);
                ctx.moveTo(cx+g, cy-g); ctx.lineTo(r, cy-g);
                break;
            case '╝':
                ctx.moveTo(cx+g, y); ctx.lineTo(cx+g, cy+g);
                ctx.moveTo(x, cy+g); ctx.lineTo(cx+g, cy+g);
                ctx.moveTo(cx-g, y); ctx.lineTo(cx-g, cy-g);
                ctx.moveTo(x, cy-g); ctx.lineTo(cx-g, cy-g);
                break;
            case '╠':
                ctx.moveTo(cx-g, y); ctx.lineTo(cx-g, b);
                ctx.moveTo(cx+g, y); ctx.lineTo(cx+g, b);
                ctx.moveTo(cx-g, cy-g); ctx.lineTo(r, cy-g);
                ctx.moveTo(cx-g, cy+g); ctx.lineTo(r, cy+g);
                break;
            case '╣':
                ctx.moveTo(cx-g, y); ctx.lineTo(cx-g, b);
                ctx.moveTo(cx+g, y); ctx.lineTo(cx+g, b);
                ctx.moveTo(x, cy-g); ctx.lineTo(cx+g, cy-g);
                ctx.moveTo(x, cy+g); ctx.lineTo(cx+g, cy+g);
                break;
            case '╦':
                ctx.moveTo(x, cy-g); ctx.lineTo(r, cy-g);
                ctx.moveTo(x, cy+g); ctx.lineTo(r, cy+g);
                ctx.moveTo(cx-g, cy-g); ctx.lineTo(cx-g, b);
                ctx.moveTo(cx+g, cy-g); ctx.lineTo(cx+g, b);
                break;
            case '╩':
                ctx.moveTo(x, cy-g); ctx.lineTo(r, cy-g);
                ctx.moveTo(x, cy+g); ctx.lineTo(r, cy+g);
                ctx.moveTo(cx-g, y); ctx.lineTo(cx-g, cy+g);
                ctx.moveTo(cx+g, y); ctx.lineTo(cx+g, cy+g);
                break;
            case '╬':
                ctx.moveTo(cx-g, y); ctx.lineTo(cx-g, b);
                ctx.moveTo(cx+g, y); ctx.lineTo(cx+g, b);
                ctx.moveTo(x, cy-g); ctx.lineTo(r, cy-g);
                ctx.moveTo(x, cy+g); ctx.lineTo(r, cy+g);
                break;
        }

        ctx.stroke();
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
