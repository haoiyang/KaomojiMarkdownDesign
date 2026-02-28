// === Constants ===
const GRID_COLS = 80;
const GRID_ROWS = 40;
const DEFAULT_FONT_FAMILY = '"Courier New", "Courier", monospace';
const DEFAULT_FONT_SIZE = 14;
const MAX_UNDO_LEVELS = 50;

// Colors (dark theme)
const COLORS = {
    bg: '#1e1e2e',
    gridLine: '#313244',
    cellBg: '#181825',
    text: '#cdd6f4',
    textDim: '#6c7086',
    cursor: '#f5c2e7',
    selection: 'rgba(137, 180, 250, 0.25)',
    selectionBorder: '#89b4fa',
    handle: '#f38ba8',
    handleFill: '#1e1e2e',
    panelBg: '#1e1e2e',
    panelBorder: '#313244',
    panelText: '#cdd6f4',
    panelTextDim: '#6c7086',
    panelHover: '#313244',
    panelActive: '#45475a',
    accent: '#89b4fa',
    accentHover: '#b4befe',
    toolbarBg: '#11111b',
    statusBg: '#11111b',
    statusText: '#a6adc8',
    error: '#f38ba8',
    success: '#a6e3a1',
    warning: '#f9e2af',
};

// Keyboard shortcuts
const SHORTCUTS = {
    'ctrl+z': 'undo',
    'meta+z': 'undo',
    'ctrl+shift+z': 'redo',
    'meta+shift+z': 'redo',
    'ctrl+y': 'redo',
    'meta+y': 'redo',
    'ctrl+c': 'copy',
    'meta+c': 'copy',
    'ctrl+v': 'paste',
    'meta+v': 'paste',
    'ctrl+x': 'cut',
    'meta+x': 'cut',
    'ctrl+a': 'selectAll',
    'meta+a': 'selectAll',
    'ctrl+s': 'save',
    'meta+s': 'save',
    'ctrl+shift+s': 'saveAs',
    'meta+shift+s': 'saveAs',
    'ctrl+n': 'new',
    'meta+n': 'new',
    'ctrl+shift+c': 'copyMarkdown',
    'meta+shift+c': 'copyMarkdown',
    'ctrl+shift+v': 'pasteMarkdown',
    'meta+shift+v': 'pasteMarkdown',
    'Delete': 'delete',
    'Backspace': 'delete',
    'Escape': 'deselect',
    'v': 'tool:select',
    't': 'tool:text',
    'l': 'tool:line',
    'a': 'tool:arrow',
    'e': 'tool:eraser',
    'r': 'rotate',
};

// Tool definitions
const TOOL_DEFS = [
    { id: 'select', label: 'Select', shortcut: 'V', icon: '⊹' },
    { id: 'text', label: 'Text', shortcut: 'T', icon: 'T' },
    { id: 'line', label: 'Line', shortcut: 'L', icon: '━' },
    { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: '➜' },
    { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: '⌫' },
];

// Border style names
const BORDER_STYLES = ['single', 'heavy', 'double', 'rounded', 'ascii'];
