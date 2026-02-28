// === Inspector: right panel property editor ===

class InspectorUI {
    constructor(app) {
        this.app = app;
        this._container = document.getElementById('inspector-content');
    }

    update(component) {
        this._container.innerHTML = '';
        if (!component) {
            const count = this.app.selectedComponents.size;
            if (count > 1) {
                this._container.innerHTML = '<div style="padding: 10px; color: #6c7086; font-size: 11px;">' + count + ' items selected</div>';
            } else {
                this._container.innerHTML = '<div style="padding: 10px; color: #6c7086; font-size: 11px;">No selection</div>';
            }
            return;
        }

        // Type label
        const typeDiv = document.createElement('div');
        typeDiv.style.cssText = 'padding: 6px 10px; font-size: 12px; color: #89b4fa; font-weight: 600;';
        typeDiv.textContent = component.type.charAt(0).toUpperCase() + component.type.slice(1);
        this._container.appendChild(typeDiv);

        // Name
        this._addPropRow('Name', 'name', component.name, 'text', (val) => {
            component.name = val;
            this.app.bus.emit('componentChanged', component);
        });

        // Editable props
        const props = component.getEditableProps();
        for (const prop of props) {
            const currentVal = prop.propsBased ? component.props[prop.key] : component.getProp(prop.key);
            if (prop.type === 'select') {
                this._addSelectRow(prop.label, prop.key, currentVal, prop.options, (val) => {
                    if (prop.propsBased) {
                        // Handle boolean-ish strings
                        if (val === 'true') val = true;
                        else if (val === 'false') val = false;
                        component.props[prop.key] = val;
                    } else {
                        component.setProp(prop.key, val);
                    }
                    this.app.bus.emit('componentChanged', component);
                    this.app.render();
                });
            } else {
                const displayVal = Array.isArray(currentVal) ? currentVal.join(', ') : currentVal;
                this._addPropRow(prop.label, prop.key, displayVal, prop.type, (val) => {
                    if (prop.propsBased) {
                        if (prop.type === 'number') val = parseInt(val, 10) || 0;
                        else if (Array.isArray(component.props[prop.key])) val = val.split(',').map(s => s.trim());
                        component.props[prop.key] = val;
                    } else {
                        component.setProp(prop.key, val);
                    }
                    this.app.bus.emit('componentChanged', component);
                    this.app.render();
                });
            }
        }

        // Z-index
        this._addPropRow('Z-Index', 'zIndex', component.zIndex, 'number', (val) => {
            component.zIndex = parseInt(val, 10) || 0;
            this.app.bus.emit('componentChanged', component);
            this.app.render();
        });
    }

    _addPropRow(label, key, value, type, onChange) {
        const row = document.createElement('div');
        row.className = 'prop-row';

        const lbl = document.createElement('span');
        lbl.className = 'prop-label';
        lbl.textContent = label;

        const input = document.createElement('input');
        input.className = 'prop-input';
        input.type = type === 'number' ? 'number' : 'text';
        input.value = value !== undefined ? value : '';
        input.addEventListener('change', () => onChange(input.value));
        input.addEventListener('keydown', (e) => e.stopPropagation()); // prevent tool shortcuts

        row.appendChild(lbl);
        row.appendChild(input);
        this._container.appendChild(row);
    }

    _addSelectRow(label, key, value, options, onChange) {
        const row = document.createElement('div');
        row.className = 'prop-row';

        const lbl = document.createElement('span');
        lbl.className = 'prop-label';
        lbl.textContent = label;

        const select = document.createElement('select');
        select.className = 'prop-select';
        for (const opt of options) {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (String(value) === String(opt)) o.selected = true;
            select.appendChild(o);
        }
        select.addEventListener('change', () => onChange(select.value));

        row.appendChild(lbl);
        row.appendChild(select);
        this._container.appendChild(row);
    }
}
