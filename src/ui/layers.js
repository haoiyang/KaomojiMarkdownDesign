// === Layers Panel: component list with visibility/reorder + group/ungroup ===

class LayersUI {
    constructor(app) {
        this.app = app;
        this._container = document.getElementById('layers-content');
        this._buildHeader();
    }

    _buildHeader() {
        const section = document.getElementById('layers-section');
        const header = section.querySelector('.panel-header');

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:4px; padding:2px 10px 4px;';

        const mkBtn = document.createElement('button');
        mkBtn.className = 'layer-btn';
        mkBtn.textContent = 'MkGroup';
        mkBtn.title = 'Group selected layers';
        mkBtn.style.cssText = 'font-size:10px; padding:2px 6px; border:1px solid #45475a; border-radius:3px;';
        mkBtn.addEventListener('click', () => {
            this.app.mkGroup(); // uses selectedComponents by default
        });

        const deBtn = document.createElement('button');
        deBtn.className = 'layer-btn';
        deBtn.textContent = 'DeGroup';
        deBtn.title = 'Ungroup selected group';
        deBtn.style.cssText = 'font-size:10px; padding:2px 6px; border:1px solid #45475a; border-radius:3px;';
        deBtn.addEventListener('click', () => {
            this.app.deGroup();
        });

        btnRow.appendChild(mkBtn);
        btnRow.appendChild(deBtn);
        header.after(btnRow);
    }

    update() {
        this._container.innerHTML = '';
        // Show components in reverse z-order (top first)
        const sorted = [...this.app.components]
            .filter(c => c.name !== '_freehand')
            .sort((a, b) => b.zIndex - a.zIndex);

        for (const comp of sorted) {
            this._buildLayerItem(comp, false);

            // If group, show children indented
            if (comp.type === 'group' && comp.children) {
                for (const child of comp.children) {
                    this._buildLayerItem(child, true);
                }
            }
        }

        if (sorted.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 10px; color: #6c7086; font-size: 11px;';
            empty.textContent = 'No components';
            this._container.appendChild(empty);
        }
    }

    _buildLayerItem(comp, isChild) {
        const isSelected = this.app.isSelected(comp);
        const item = document.createElement('div');
        item.className = 'layer-item' + (isSelected ? ' selected' : '');

        if (isChild) {
            // Indented child row — read-only
            const indent = document.createElement('span');
            indent.style.cssText = 'color:#6c7086; font-size:10px; width:28px; text-align:right; flex-shrink:0;';
            indent.textContent = '└';
            item.appendChild(indent);
        }

        const vis = document.createElement('span');
        vis.className = 'vis-toggle';
        vis.textContent = comp.visible ? '■' : '□';
        if (!isChild) {
            vis.addEventListener('click', (e) => {
                e.stopPropagation();
                comp.visible = !comp.visible;
                this.app.render();
                this.update();
            });
        }

        const name = document.createElement('span');
        name.className = 'layer-name';
        name.textContent = comp.name;
        if (isChild) {
            name.style.color = '#6c7086';
            name.style.fontSize = '11px';
        }

        item.appendChild(vis);
        item.appendChild(name);

        if (!isChild) {
            const actions = document.createElement('span');
            actions.className = 'layer-actions';

            const upBtn = document.createElement('button');
            upBtn.className = 'layer-btn';
            upBtn.textContent = '▲';
            upBtn.title = 'Move up';
            upBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                comp.zIndex++;
                this.app.render();
                this.update();
            });

            const downBtn = document.createElement('button');
            downBtn.className = 'layer-btn';
            downBtn.textContent = '▼';
            downBtn.title = 'Move down';
            downBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                comp.zIndex--;
                this.app.render();
                this.update();
            });

            const delBtn = document.createElement('button');
            delBtn.className = 'layer-btn';
            delBtn.textContent = '×';
            delBtn.title = 'Delete';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.app.deleteComponent(comp);
            });

            actions.appendChild(upBtn);
            actions.appendChild(downBtn);
            actions.appendChild(delBtn);
            item.appendChild(actions);

            item.addEventListener('click', (e) => {
                if (e.shiftKey) {
                    this.app.toggleSelect(comp);
                } else {
                    this.app.selectComponent(comp);
                }
            });
        }

        this._container.appendChild(item);
    }
}
