// === Box-Drawing Character Lookup Tables ===
// BORDER_CHARS[style][position] → character
// Positions: tl, t, tr, l, r, bl, b, br, h, v, cross, tee_down, tee_up, tee_right, tee_left

const BORDER_CHARS = {
    single: {
        tl: '┌', t: '─', tr: '┐',
        l: '│', r: '│',
        bl: '└', b: '─', br: '┘',
        h: '─', v: '│',
        cross: '┼',
        tee_down: '┬', tee_up: '┴',
        tee_right: '├', tee_left: '┤',
    },
    heavy: {
        tl: '┏', t: '━', tr: '┓',
        l: '┃', r: '┃',
        bl: '┗', b: '━', br: '┛',
        h: '━', v: '┃',
        cross: '╋',
        tee_down: '┳', tee_up: '┻',
        tee_right: '┣', tee_left: '┫',
    },
    double: {
        tl: '╔', t: '═', tr: '╗',
        l: '║', r: '║',
        bl: '╚', b: '═', br: '╝',
        h: '═', v: '║',
        cross: '╬',
        tee_down: '╦', tee_up: '╩',
        tee_right: '╠', tee_left: '╣',
    },
    rounded: {
        tl: '╭', t: '─', tr: '╮',
        l: '│', r: '│',
        bl: '╰', b: '─', br: '╯',
        h: '─', v: '│',
        cross: '┼',
        tee_down: '┬', tee_up: '┴',
        tee_right: '├', tee_left: '┤',
    },
    ascii: {
        tl: '+', t: '-', tr: '+',
        l: '|', r: '|',
        bl: '+', b: '-', br: '+',
        h: '-', v: '|',
        cross: '+',
        tee_down: '+', tee_up: '+',
        tee_right: '+', tee_left: '+',
    },
};

// Arrow characters for line endings
const ARROW_CHARS = {
    right: '→',
    left: '←',
    up: '↑',
    down: '↓',
};

// Helper: safe char set — only writes if within bounds
function _safeSet(chars, r, c, ch) {
    if (r >= 0 && r < chars.length && c >= 0 && c < chars[r].length) {
        chars[r][c] = ch;
    }
}

// Helper: draw a box outline onto a 2D char array
function drawBox(chars, x, y, w, h, style = 'single') {
    const bc = BORDER_CHARS[style] || BORDER_CHARS.single;
    if (w < 2 || h < 2) return;

    // Top edge
    _safeSet(chars, y, x, bc.tl);
    for (let c = x + 1; c < x + w - 1; c++) _safeSet(chars, y, c, bc.t);
    _safeSet(chars, y, x + w - 1, bc.tr);

    // Sides
    for (let r = y + 1; r < y + h - 1; r++) {
        _safeSet(chars, r, x, bc.l);
        _safeSet(chars, r, x + w - 1, bc.r);
    }

    // Bottom edge
    _safeSet(chars, y + h - 1, x, bc.bl);
    for (let c = x + 1; c < x + w - 1; c++) _safeSet(chars, y + h - 1, c, bc.b);
    _safeSet(chars, y + h - 1, x + w - 1, bc.br);
}

// Helper: draw a horizontal divider across a box
function drawHDivider(chars, x, w, row, style = 'single') {
    const bc = BORDER_CHARS[style] || BORDER_CHARS.single;
    if (row < 0 || row >= chars.length) return;
    _safeSet(chars, row, x, bc.tee_right);
    for (let c = x + 1; c < x + w - 1; c++) _safeSet(chars, row, c, bc.h);
    _safeSet(chars, row, x + w - 1, bc.tee_left);
}

// Helper: draw a vertical divider down a box
function drawVDivider(chars, col, y, h, style = 'single') {
    const bc = BORDER_CHARS[style] || BORDER_CHARS.single;
    if (col < 0 || (chars.length > 0 && col >= chars[0].length)) return;
    _safeSet(chars, y, col, bc.tee_down);
    for (let r = y + 1; r < y + h - 1; r++) _safeSet(chars, r, col, bc.v);
    _safeSet(chars, y + h - 1, col, bc.tee_up);
}

// Bresenham's line algorithm — returns array of {x, y} points
function bresenhamLine(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let cx = x0, cy = y0;

    while (true) {
        points.push({ x: cx, y: cy });
        if (cx === x1 && cy === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
    }
    return points;
}

// Pick ASCII char for a line segment based on local direction
function lineCharAt(points, i) {
    let dx, dy;
    if (i < points.length - 1) {
        dx = points[i + 1].x - points[i].x;
        dy = points[i + 1].y - points[i].y;
    } else if (i > 0) {
        dx = points[i].x - points[i - 1].x;
        dy = points[i].y - points[i - 1].y;
    } else {
        return '─';
    }
    if (dy === 0) return '─';
    if (dx === 0) return '│';
    if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) return '\\';
    return '/';
}

// Pick arrowhead char based on direction at the endpoint
function arrowHeadChar(points, atEnd) {
    let dx, dy;
    if (atEnd) {
        const n = points.length;
        if (n < 2) return '>';
        dx = points[n - 1].x - points[n - 2].x;
        dy = points[n - 1].y - points[n - 2].y;
    } else {
        if (points.length < 2) return '<';
        dx = points[0].x - points[1].x;
        dy = points[0].y - points[1].y;
    }
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? '>' : '<';
    if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'v' : '^';
    // True 45° diagonal — use horizontal arrow
    return dx > 0 ? '>' : '<';
}

// === Box-Drawing Character Merge (4-direction: U/D/L/R) ===
// When two box-drawing chars overlap (e.g. adjacent components sharing a border),
// merge their cardinal directions to produce the correct intersection character
// (corners → tees, tees → crosses, etc.)

const _BD_U = 1, _BD_D = 2, _BD_L = 4, _BD_R = 8;

// Direction flags for each BORDER_CHARS position
const _BD_POS_DIRS = {
    tl: _BD_D | _BD_R,  tr: _BD_D | _BD_L,
    bl: _BD_U | _BD_R,  br: _BD_U | _BD_L,
    t: _BD_L | _BD_R,   b: _BD_L | _BD_R,
    l: _BD_U | _BD_D,   r: _BD_U | _BD_D,
    h: _BD_L | _BD_R,   v: _BD_U | _BD_D,
    cross:     _BD_U | _BD_D | _BD_L | _BD_R,
    tee_down:  _BD_D | _BD_L | _BD_R,
    tee_up:    _BD_U | _BD_L | _BD_R,
    tee_right: _BD_U | _BD_D | _BD_R,
    tee_left:  _BD_U | _BD_D | _BD_L,
};

// Build lookup tables from BORDER_CHARS
const _BOX_DIRS = {};      // char → direction flags (OR'd across all positions)
const _BOX_STYLE = {};     // char → first style name that defines it
const _BOX_RESULTS = {};   // style → { dirFlags → char }

for (const style of Object.keys(BORDER_CHARS)) {
    const chars = BORDER_CHARS[style];
    const resultMap = {};
    for (const [pos, ch] of Object.entries(chars)) {
        const dirs = _BD_POS_DIRS[pos];
        if (dirs === undefined) continue;
        _BOX_DIRS[ch] = (_BOX_DIRS[ch] || 0) | dirs;
        if (!_BOX_STYLE[ch]) _BOX_STYLE[ch] = style;
        resultMap[dirs] = ch;
    }
    // Fill single-direction combos (no standard position maps to just U, D, L, or R)
    resultMap[_BD_L] = resultMap[_BD_L] || chars.h;
    resultMap[_BD_R] = resultMap[_BD_R] || chars.h;
    resultMap[_BD_U] = resultMap[_BD_U] || chars.v;
    resultMap[_BD_D] = resultMap[_BD_D] || chars.v;
    resultMap[_BD_L | _BD_R] = resultMap[_BD_L | _BD_R] || chars.h;
    resultMap[_BD_U | _BD_D] = resultMap[_BD_U | _BD_D] || chars.v;
    _BOX_RESULTS[style] = resultMap;
}

// === Diagonal Line Intersection Merging (for freehand / line / arrow tool) ===
const _LINE_DIR_H = 1;
const _LINE_DIR_V = 2;
const _LINE_DIR_D = 4;  // /
const _LINE_DIR_B = 8;  // \

const _PUA_HD  = '\uE001';
const _PUA_HB  = '\uE002';
const _PUA_VD  = '\uE003';
const _PUA_VB  = '\uE004';
const _PUA_HVD = '\uE005';
const _PUA_HVB = '\uE006';
const _PUA_HDB = '\uE007';
const _PUA_VDB = '\uE008';

const _LINE_CHAR_DIRS = {
    '-': _LINE_DIR_H, '>': _LINE_DIR_H, '<': _LINE_DIR_H,
    '|': _LINE_DIR_V, '^': _LINE_DIR_V, 'v': _LINE_DIR_V,
    '/': _LINE_DIR_D,
    '\\': _LINE_DIR_B,
    '+': _LINE_DIR_H | _LINE_DIR_V,
    'X': _LINE_DIR_D | _LINE_DIR_B,
    '*': _LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_D | _LINE_DIR_B,
    [_PUA_HD]:  _LINE_DIR_H | _LINE_DIR_D,
    [_PUA_HB]:  _LINE_DIR_H | _LINE_DIR_B,
    [_PUA_VD]:  _LINE_DIR_V | _LINE_DIR_D,
    [_PUA_VB]:  _LINE_DIR_V | _LINE_DIR_B,
    [_PUA_HVD]: _LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_D,
    [_PUA_HVB]: _LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_B,
    [_PUA_HDB]: _LINE_DIR_H | _LINE_DIR_D | _LINE_DIR_B,
    [_PUA_VDB]: _LINE_DIR_V | _LINE_DIR_D | _LINE_DIR_B,
};

const _DIR_RESULT = {
    [_LINE_DIR_H]: '-',
    [_LINE_DIR_V]: '|',
    [_LINE_DIR_D]: '/',
    [_LINE_DIR_B]: '\\',
    [_LINE_DIR_H | _LINE_DIR_V]: '+',
    [_LINE_DIR_D | _LINE_DIR_B]: 'X',
    [_LINE_DIR_H | _LINE_DIR_D]: _PUA_HD,
    [_LINE_DIR_H | _LINE_DIR_B]: _PUA_HB,
    [_LINE_DIR_V | _LINE_DIR_D]: _PUA_VD,
    [_LINE_DIR_V | _LINE_DIR_B]: _PUA_VB,
    [_LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_D]: _PUA_HVD,
    [_LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_B]: _PUA_HVB,
    [_LINE_DIR_H | _LINE_DIR_D | _LINE_DIR_B]: _PUA_HDB,
    [_LINE_DIR_V | _LINE_DIR_D | _LINE_DIR_B]: _PUA_VDB,
    [_LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_D | _LINE_DIR_B]: '*',
};

const _PUA_DISPLAY = {
    [_PUA_HD]: '+', [_PUA_HB]: '+', [_PUA_VD]: '+', [_PUA_VB]: '+',
    [_PUA_HVD]: '*', [_PUA_HVB]: '*', [_PUA_HDB]: '*', [_PUA_VDB]: '*',
};

// Merge two characters that overlap on the grid.
// 1) Box-drawing merge: combines U/D/L/R directions → correct Unicode junction
// 2) Diagonal merge: combines H/V/D/B for freehand ASCII lines
// 3) Fallback: incoming overwrites existing
function mergeLineChars(existing, incoming) {
    // Try box-drawing merge (corners/tees/crosses)
    const eDirs = _BOX_DIRS[existing];
    const iDirs = _BOX_DIRS[incoming];
    if (eDirs !== undefined && iDirs !== undefined) {
        const combined = eDirs | iDirs;
        if (combined === iDirs) return incoming; // incoming already covers all directions
        const style = _BOX_STYLE[incoming] || 'single';
        const result = _BOX_RESULTS[style][combined];
        if (result) return result;
    }

    // Fall back to diagonal line merge (for /, \, arrows, PUA combos)
    const ed = _LINE_CHAR_DIRS[existing];
    const id = _LINE_CHAR_DIRS[incoming];
    if (ed === undefined || id === undefined) return incoming;
    if (ed === id) return incoming;
    const combined = ed | id;
    return _DIR_RESULT[combined] || incoming;
}

// Helper: place text into char array, truncating to fit
function placeText(chars, x, y, text, maxWidth) {
    if (y < 0 || y >= chars.length) return;
    const row = chars[y];
    const len = Math.min(text.length, maxWidth || row.length - x);
    for (let i = 0; i < len; i++) {
        const col = x + i;
        if (col >= 0 && col < row.length) {
            row[col] = text[i];
        }
    }
}
