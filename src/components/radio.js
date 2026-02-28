// === Radio Component: (o) Label ===
class RadioComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('radio', x, y, w || 12, h || 1, props);
        this.props.label = props.label || 'Option';
        this.props.selected = props.selected !== undefined ? props.selected : true;
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        const mark = this.props.selected ? 'o' : ' ';
        const text = `(${mark}) ${this.props.label}`;
        placeText(chars, 0, 0, text, this.w);
        return chars;
    }

    getMinSize() { return { minW: 4, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'label', label: 'Label', type: 'text', propsBased: true },
            { key: 'selected', label: 'Selected', type: 'select', options: ['true', 'false'], propsBased: true },
        ];
    }
}
