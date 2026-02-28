// === Layers Panel: component list with visibility/reorder ===

class LayersUI {
    constructor(app) {
        this.app = app;
        this._container = document.getElementById('layers-content');
    }

    update() {
        this._container.innerHTML = '';
        // Show components in reverse z-order (top first)
        const sorted = [...this.app.components]
            .filter(c => c.name !== '_freehand')
            .sort((a, b) => b.zIndex - a.zIndex);

        for (const comp of sorted) {
            const item = document.createElement('div');
            item.className = 'layer-item' + (this.app.selectedComponent === comp ? ' selected' : '');

            const vis = document.createElement('span');
            vis.className = 'vis-toggle';
            vis.textContent = comp.visible ? '■' : '□';
            vis.addEventListener('click', (e) => {
                e.stopPropagation();
                comp.visible = !comp.visible;
                this.app.render();
                this.update();
            });

            const name = document.createElement('span');
            name.className = 'layer-name';
            name.textContent = comp.name;

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

            item.appendChild(vis);
            item.appendChild(name);
            item.appendChild(actions);

            item.addEventListener('click', () => {
                this.app.selectComponent(comp);
            });

            this._container.appendChild(item);
        }

        if (sorted.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 10px; color: #6c7086; font-size: 11px;';
            empty.textContent = 'No components';
            this._container.appendChild(empty);
        }
    }
}
