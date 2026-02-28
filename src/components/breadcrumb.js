// === Breadcrumb Component: Home > Docs > About ===
class BreadcrumbComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('breadcrumb', x, y, w || 24, h || 1, props);
        this.props.items = props.items || ['Home', 'Docs', 'About'];
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        const text = this.props.items.join(' > ');
        placeText(chars, 0, 0, text, this.w);
        return chars;
    }

    getMinSize() { return { minW: 5, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
        ];
    }
}
