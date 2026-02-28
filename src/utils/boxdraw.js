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

// === Line Intersection Merging ===
// Each line character implies directional axes passing through the cell:
//   H = horizontal, V = vertical, D = forward diagonal (/), B = back diagonal (\)
// When two line characters occupy the same cell, merge their directions.

const _LINE_DIR_H = 1;
const _LINE_DIR_V = 2;
const _LINE_DIR_D = 4;  // /
const _LINE_DIR_B = 8;  // \

const _LINE_CHAR_DIRS = {
    // ASCII line chars (from line/arrow components)
    '-': _LINE_DIR_H, '>': _LINE_DIR_H, '<': _LINE_DIR_H,
    '|': _LINE_DIR_V, '^': _LINE_DIR_V, 'v': _LINE_DIR_V,
    '/': _LINE_DIR_D,
    '\\': _LINE_DIR_B,
    '+': _LINE_DIR_H | _LINE_DIR_V,
    'X': _LINE_DIR_D | _LINE_DIR_B,
    '*': _LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_D | _LINE_DIR_B,
    // Unicode box-drawing (from box/card/table/modal components)
    '─': _LINE_DIR_H, '━': _LINE_DIR_H, '═': _LINE_DIR_H,
    '│': _LINE_DIR_V, '┃': _LINE_DIR_V, '║': _LINE_DIR_V,
    '┼': _LINE_DIR_H | _LINE_DIR_V,
    '╋': _LINE_DIR_H | _LINE_DIR_V,
    '╬': _LINE_DIR_H | _LINE_DIR_V,
};

// Map combined direction flags → result character
const _DIR_RESULT = {
    [_LINE_DIR_H]: '-',
    [_LINE_DIR_V]: '|',
    [_LINE_DIR_D]: '/',
    [_LINE_DIR_B]: '\\',
    [_LINE_DIR_H | _LINE_DIR_V]: '+',
    [_LINE_DIR_D | _LINE_DIR_B]: 'X',
    [_LINE_DIR_H | _LINE_DIR_D]: '+',
    [_LINE_DIR_H | _LINE_DIR_B]: '+',
    [_LINE_DIR_V | _LINE_DIR_D]: '+',
    [_LINE_DIR_V | _LINE_DIR_B]: '+',
    [_LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_D]: '*',
    [_LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_B]: '*',
    [_LINE_DIR_H | _LINE_DIR_D | _LINE_DIR_B]: '*',
    [_LINE_DIR_V | _LINE_DIR_D | _LINE_DIR_B]: '*',
    [_LINE_DIR_H | _LINE_DIR_V | _LINE_DIR_D | _LINE_DIR_B]: '*',
};

// Merge two characters that overlap on the grid.
// If both are line/arrow chars, returns the intersection character.
// Otherwise returns the incoming char (normal overwrite behavior).
function mergeLineChars(existing, incoming) {
    const ed = _LINE_CHAR_DIRS[existing];
    const id = _LINE_CHAR_DIRS[incoming];
    // Both must be recognized line chars to merge
    if (ed === undefined || id === undefined) return incoming;
    // Same direction — incoming wins (no intersection)
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
