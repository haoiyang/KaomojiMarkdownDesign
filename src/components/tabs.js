// === Tabs Component: [Active] Tab2 Tab3 + underline ===
class TabsComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('tabs', x, y, w || 30, h || 2, props);
        this.props.tabs = props.tabs || ['Tab 1', 'Tab 2', 'Tab 3'];
        this.props.activeIndex = props.activeIndex || 0;
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        const tabs = this.props.tabs;
        const active = this.props.activeIndex;
        let col = 0;
        for (let i = 0; i < tabs.length && col < this.w; i++) {
            const label = tabs[i];
            if (i === active) {
                const text = `[${label}]`;
                placeText(chars, col, 0, text, this.w - col);
                col += text.length + 1;
            } else {
                placeText(chars, col, 0, label, this.w - col);
                col += label.length + 1;
            }
        }
        // Underline
        if (this.h >= 2) {
            const bc = BORDER_CHARS[this.borderStyle] || BORDER_CHARS.single;
            for (let c = 0; c < this.w; c++) {
                chars[1][c] = bc.h;
            }
        }
        return chars;
    }

    getMinSize() { return { minW: 8, minH: 2 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'activeIndex', label: 'Active', type: 'number', propsBased: true },
        ];
    }
}
