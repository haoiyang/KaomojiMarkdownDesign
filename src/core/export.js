// === Export utilities ===

const ExportUtils = {
    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        }
    },

    // Save project to a JSON file
    saveToFile(components, filename = 'wireframe.kaomoji.json') {
        const data = {
            version: 1,
            gridCols: GRID_COLS,
            gridRows: GRID_ROWS,
            components: components.map(c => c.serialize()),
            timestamp: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Load project from a JSON file (returns Promise<Component[]>)
    loadFromFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) { reject(new Error('No file selected')); return; }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        if (data.version !== 1) {
                            reject(new Error('Unsupported file version'));
                            return;
                        }
                        const components = data.components.map(d => ComponentRegistry.deserialize(d));
                        resolve(components);
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsText(file);
            };
            input.click();
        });
    },

    // Save to localStorage
    saveToLocalStorage(components, key = 'kaomoji_project') {
        const data = {
            version: 1,
            gridCols: GRID_COLS,
            gridRows: GRID_ROWS,
            components: components.map(c => c.serialize()),
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(data));
    },

    // Load from localStorage
    loadFromLocalStorage(key = 'kaomoji_project') {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            const data = JSON.parse(raw);
            if (data.version !== 1) return null;
            return data.components.map(d => ComponentRegistry.deserialize(d));
        } catch {
            return null;
        }
    },

    // Export as plain text (trimmed)
    exportAsText(grid) {
        const lines = grid.toText().split('\n');
        // Trim trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        return lines.join('\n');
    },

    // Export as markdown code block
    exportAsMarkdown(grid) {
        return '```\n' + this.exportAsText(grid) + '\n```';
    },
};
