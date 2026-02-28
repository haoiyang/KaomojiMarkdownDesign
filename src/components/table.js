// === Table Component: multi-column grid ===
class TableComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('table', x, y, w || 24, h || 7, props);
        this.props.cols = props.cols || 3;
        this.props.rows = props.rows || 3;
        this.props.headers = props.headers || ['Col1', 'Col2', 'Col3'];
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        if (this.w < 5 || this.h < 4) return chars;

        const bc = BORDER_CHARS[this.borderStyle] || BORDER_CHARS.single;
        // Clamp cols so each column is at least 3 chars wide (border + 1 char + border)
        const maxCols = Math.max(1, Math.floor((this.w - 1) / 3));
        const numCols = Math.min(Math.max(1, this.props.cols), maxCols);
        const colWidth = Math.floor((this.w - 1) / numCols);
        const numRows = Math.max(1, this.props.rows);
        const rowHeight = 2; // each data row = 1 content line + 1 divider line

        // Draw outer box
        drawBox(chars, 0, 0, this.w, this.h, this.borderStyle);

        // Vertical dividers (full height)
        for (let c = 1; c < numCols; c++) {
            const cx = c * colWidth;
            if (cx > 0 && cx < this.w - 1) {
                drawVDivider(chars, cx, 0, this.h, this.borderStyle);
            }
        }

        // Header row divider at row 2
        if (this.h > 2) {
            drawHDivider(chars, 0, this.w, 2, this.borderStyle);
            // Fix intersections at header divider
            for (let c = 1; c < numCols; c++) {
                const cx = c * colWidth;
                if (cx > 0 && cx < this.w - 1) {
                    chars[2][cx] = bc.cross;
                }
            }
        }

        // Data row dividers
        for (let r = 1; r < numRows; r++) {
            const ry = 2 + r * rowHeight; // header takes rows 0-2, then each data row is 2 high
            if (ry > 0 && ry < this.h - 1) {
                drawHDivider(chars, 0, this.w, ry, this.borderStyle);
                // Fix intersections with vertical dividers
                for (let c = 1; c < numCols; c++) {
                    const cx = c * colWidth;
                    if (cx > 0 && cx < this.w - 1) {
                        chars[ry][cx] = bc.cross;
                    }
                }
            }
        }

        // Fix top-row intersections (tee_down where vertical meets top border)
        for (let c = 1; c < numCols; c++) {
            const cx = c * colWidth;
            if (cx > 0 && cx < this.w - 1) {
                chars[0][cx] = bc.tee_down;
            }
        }
        // Fix bottom-row intersections (tee_up where vertical meets bottom border)
        for (let c = 1; c < numCols; c++) {
            const cx = c * colWidth;
            if (cx > 0 && cx < this.w - 1) {
                chars[this.h - 1][cx] = bc.tee_up;
            }
        }

        // Header text
        const headers = this.props.headers || [];
        for (let c = 0; c < numCols; c++) {
            const cx = c * colWidth + 1;
            const header = headers[c] || `Col${c+1}`;
            placeText(chars, cx, 1, header, colWidth - 1);
        }

        return chars;
    }

    getMinSize() { return { minW: 5, minH: 4 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'cols', label: 'Cols', type: 'number', propsBased: true },
            { key: 'rows', label: 'Rows', type: 'number', propsBased: true },
            { key: 'headers', label: 'Headers', type: 'text', propsBased: true },
        ];
    }
}
