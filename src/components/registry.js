// === Component Registry: factory + deserialization ===

const ComponentRegistry = {
    _types: {},

    register(type, cls, defaults) {
        this._types[type] = { cls, defaults };
    },

    create(type, x, y, props = {}) {
        const entry = this._types[type];
        if (!entry) throw new Error(`Unknown component type: ${type}`);
        const d = entry.defaults;
        return new entry.cls(x, y, d.w, d.h, { ...d.props, ...props });
    },

    deserialize(data) {
        const entry = this._types[data.type];
        if (!entry) throw new Error(`Unknown component type: ${data.type}`);
        const comp = new entry.cls(data.x, data.y, data.w, data.h, {
            borderStyle: data.borderStyle,
            name: data.name,
            ...data.props,
        });
        comp.applyData(data);
        return comp;
    },

    getTypes() {
        return Object.keys(this._types);
    },

    getDefaults(type) {
        const entry = this._types[type];
        return entry ? entry.defaults : null;
    },
};

// Register all component types with default dimensions
ComponentRegistry.register('textbox', TextBoxComponent, { w: 10, h: 1, props: { text: 'Text' } });
ComponentRegistry.register('box', BoxComponent, { w: 12, h: 6, props: {} });
ComponentRegistry.register('button', ButtonComponent, { w: 10, h: 1, props: { label: 'Button' } });
ComponentRegistry.register('input', InputComponent, { w: 16, h: 1, props: { placeholder: '' } });
ComponentRegistry.register('line', LineComponent, { w: 8, h: 1, props: { orientation: 'horizontal' } });
ComponentRegistry.register('arrow', ArrowComponent, { w: 8, h: 1, props: { orientation: 'horizontal', direction: 'right' } });
ComponentRegistry.register('card', CardComponent, { w: 20, h: 8, props: { title: 'Card Title' } });
ComponentRegistry.register('table', TableComponent, { w: 24, h: 7, props: { cols: 3, rows: 3, headers: ['Col1', 'Col2', 'Col3'] } });
ComponentRegistry.register('modal', ModalComponent, { w: 30, h: 12, props: { title: 'Modal Title' } });
ComponentRegistry.register('tabs', TabsComponent, { w: 30, h: 2, props: { tabs: ['Tab 1', 'Tab 2', 'Tab 3'], activeIndex: 0 } });
ComponentRegistry.register('navbar', NavBarComponent, { w: 40, h: 1, props: { logo: 'Logo', links: ['Home', 'About', 'Contact'], action: 'Sign In' } });
ComponentRegistry.register('dropdown', DropdownComponent, { w: 14, h: 1, props: { value: 'Option' } });
ComponentRegistry.register('search', SearchComponent, { w: 20, h: 1, props: { placeholder: 'Search...' } });
ComponentRegistry.register('checkbox', CheckboxComponent, { w: 12, h: 1, props: { label: 'Option', checked: true } });
ComponentRegistry.register('radio', RadioComponent, { w: 12, h: 1, props: { label: 'Option', selected: true } });
ComponentRegistry.register('toggle', ToggleComponent, { w: 8, h: 1, props: { on: true, label: '' } });
ComponentRegistry.register('progress', ProgressComponent, { w: 16, h: 1, props: { value: 50 } });
ComponentRegistry.register('breadcrumb', BreadcrumbComponent, { w: 24, h: 1, props: { items: ['Home', 'Docs', 'About'] } });
ComponentRegistry.register('pagination', PaginationComponent, { w: 16, h: 1, props: { pages: 5, current: 1 } });
ComponentRegistry.register('separator', SeparatorComponent, { w: 20, h: 1, props: {} });
ComponentRegistry.register('circle', CircleComponent, { w: 12, h: 7, props: {} });

// Element palette definitions (for UI)
const ELEMENT_PALETTE = [
    { type: 'button', label: 'Button', preview: '[ OK ]' },
    { type: 'input', label: 'Input', preview: '[______]' },
    { type: 'box', label: 'Box', preview: '┌───┐' },
    { type: 'table', label: 'Table', preview: '┌┬┬┐' },
    { type: 'dropdown', label: 'Dropdown', preview: '[Opt ▾]' },
    { type: 'search', label: 'Search', preview: '🔍 ...' },
    { type: 'checkbox', label: 'Checkbox', preview: '☑ Opt' },
    { type: 'radio', label: 'Radio', preview: '◉ Opt' },
    { type: 'toggle', label: 'Toggle', preview: '━━●' },
    { type: 'progress', label: 'Progress', preview: '▓▓▓░░' },
    { type: 'breadcrumb', label: 'Breadcrumb', preview: 'a › b' },
    { type: 'pagination', label: 'Pages', preview: '‹ 1 2 ›' },
    { type: 'circle', label: 'Circle', preview: '(  )' },
];
