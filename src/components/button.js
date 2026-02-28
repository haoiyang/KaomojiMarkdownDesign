// === Button Component: [ Label ] ===
class ButtonComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('button', x, y, w || 10, h || 1, props);
        this.props.label = props.label || 'Button';
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        const label = this.props.label;
        const inner = label.substring(0, this.w - 4);
        const text = `[ ${inner} ]`;
        placeText(chars, 0, 0, text, this.w);
        return chars;
    }

    getMinSize() { return { minW: 5, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'label', label: 'Label', type: 'text', propsBased: true },
        ];
    }
}
