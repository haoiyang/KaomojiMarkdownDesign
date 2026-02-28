// === CharGrid: 2D character buffer with compositing ===

class CharGrid {
    constructor(cols = GRID_COLS, rows = GRID_ROWS) {
        this.cols = cols;
        this.rows = rows;
        this.cells = this._createEmpty();
    }

    _createEmpty() {
        const cells = [];
        for (let r = 0; r < this.rows; r++) {
            cells.push(new Array(this.cols).fill(' '));
        }
        return cells;
    }

    clear() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.cells[r][c] = ' ';
            }
        }
    }

    getChar(col, row) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            return this.cells[row][col];
        }
        return ' ';
    }

    setChar(col, row, ch) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.cells[row][col] = ch;
        }
    }

    // Composite components onto grid (space = transparent)
    composite(components) {
        this.clear();
        // Sort by zIndex ascending (lowest first = drawn first)
        const sorted = [...components].sort((a, b) => a.zIndex - b.zIndex);
        for (const comp of sorted) {
            const rendered = comp.render();
            if (!rendered) continue;
            this._blit(rendered, comp.x, comp.y);
        }
    }

    // Blit a 2D char array onto the grid (space = transparent, line chars merge)
    _blit(charArray, offsetX, offsetY) {
        for (let r = 0; r < charArray.length; r++) {
            const gridRow = offsetY + r;
            if (gridRow < 0 || gridRow >= this.rows) continue;
            const srcRow = charArray[r];
            for (let c = 0; c < srcRow.length; c++) {
                const gridCol = offsetX + c;
                if (gridCol < 0 || gridCol >= this.cols) continue;
                const incoming = srcRow[c];
                if (incoming !== ' ') {
                    const existing = this.cells[gridRow][gridCol];
                    this.cells[gridRow][gridCol] = (existing !== ' ')
                        ? mergeLineChars(existing, incoming)
                        : incoming;
                }
            }
        }
    }

    // Export as plain text string
    toText() {
        return this.cells.map(row => row.join('').trimEnd()).join('\n');
    }

    // Export as markdown code block
    toMarkdown() {
        return '```\n' + this.toText() + '\n```';
    }

    // Resize the grid
    resize(newCols, newRows) {
        const newCells = [];
        for (let r = 0; r < newRows; r++) {
            const row = new Array(newCols).fill(' ');
            if (r < this.rows) {
                for (let c = 0; c < Math.min(newCols, this.cols); c++) {
                    row[c] = this.cells[r][c];
                }
            }
            newCells.push(row);
        }
        this.cols = newCols;
        this.rows = newRows;
        this.cells = newCells;
    }
}
