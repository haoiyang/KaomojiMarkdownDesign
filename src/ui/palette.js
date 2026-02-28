// === Palette: left panel with tools and element library ===

class PaletteUI {
    constructor(app) {
        this.app = app;
        this._buildTools();
        this._buildElements();
    }

    _buildTools() {
        const section = document.getElementById('tools-section');
        for (const tool of TOOL_DEFS) {
            const item = document.createElement('div');
            item.className = 'panel-item' + (tool.id === 'select' ? ' active' : '');
            item.dataset.tool = tool.id;
            item.innerHTML = `<span class="icon">${tool.icon}</span>${tool.label}<span class="shortcut">${tool.shortcut}</span>`;
            item.addEventListener('click', () => {
                this.app.setTool(tool.id);
            });
            section.appendChild(item);
        }
    }

    _buildElements() {
        const section = document.getElementById('elements-section');
        for (const elem of ELEMENT_PALETTE) {
            const item = document.createElement('div');
            item.className = 'elem-item';
            item.dataset.type = elem.type;
            item.draggable = true;
            item.innerHTML = `<span class="preview">${elem.preview}</span>${elem.label}`;

            // Click to add at center of visible area
            item.addEventListener('click', () => {
                this.app.addComponentAtCenter(elem.type);
            });

            // Drag to place
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', elem.type);
                e.dataTransfer.effectAllowed = 'copy';
            });

            section.appendChild(item);
        }
    }

    updateActiveTool(toolId) {
        const items = document.querySelectorAll('.panel-item[data-tool]');
        for (const item of items) {
            item.classList.toggle('active', item.dataset.tool === toolId);
        }
    }
}
