// === Modal Component: Card + close button + action row ===
class ModalComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('modal', x, y, w || 30, h || 12, props);
        this.props.title = props.title || 'Modal Title';
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        if (this.w < 10 || this.h < 6) return chars;

        drawBox(chars, 0, 0, this.w, this.h, this.borderStyle);
        // Title + close button
        placeText(chars, 2, 1, this.props.title, this.w - 6);
        chars[1][this.w - 3] = '×';
        // Header divider
        drawHDivider(chars, 0, this.w, 2, this.borderStyle);
        // Action row divider (2 rows from bottom)
        const actionRow = this.h - 3;
        if (actionRow > 2) {
            drawHDivider(chars, 0, this.w, actionRow, this.borderStyle);
            // Action buttons — only render if enough width
            const cancelBtn = '[ Cancel ]';
            const okBtn = '[  OK  ]';
            const actionsY = actionRow + 1;
            const btnTotalWidth = cancelBtn.length + okBtn.length + 4;
            if (this.w >= btnTotalWidth) {
                placeText(chars, this.w - btnTotalWidth, actionsY, cancelBtn, cancelBtn.length);
                placeText(chars, this.w - okBtn.length - 2, actionsY, okBtn, okBtn.length);
            } else {
                // Narrow modal: just show OK button if it fits
                if (this.w >= okBtn.length + 3) {
                    placeText(chars, this.w - okBtn.length - 2, actionsY, okBtn, okBtn.length);
                }
            }
        }
        return chars;
    }

    getMinSize() { return { minW: 10, minH: 6 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'title', label: 'Title', type: 'text', propsBased: true },
        ];
    }
}
