# 2.4 Key Algorithms

> Extracted from [CLAUDE.md](../CLAUDE.md) Section 2.4. This is the single source of truth for all algorithm pseudocode.

#### 2.4.1 Grid Compositing (`CharGrid.composite`)
```
composite(components):
  clear all cells to ' '
  sorted = [...components].sort((a,b) => a.zIndex - b.zIndex)  // ascending
  for each comp in sorted:
    rendered = comp.render()  // returns char[][] (local coords, w×h)
    if !rendered: continue
    _blit(rendered, comp.x, comp.y)

_blit(charArray, offsetX, offsetY):
  for r in 0..charArray.length:
    gridRow = offsetY + r
    if gridRow out of bounds: continue
    for c in 0..charArray[r].length:
      gridCol = offsetX + c
      if gridCol out of bounds: continue
      if charArray[r][c] != ' ':      // space = transparent
        cells[gridRow][gridCol] = charArray[r][c]
```

#### 2.4.2 Mouse-to-Grid Conversion (`CanvasRenderer.pixelToGrid`)
```
pixelToGrid(px, py):
  col = floor(px / charWidth)
  row = floor(py / charHeight)
  return {col, row}
```
Mouse coordinates come from `e.clientX - canvas.getBoundingClientRect().left`.

#### 2.4.3 Hit Testing (`App.hitTest`)
```
hitTest(col, row):
  sorted = components.filter(visible && name != '_freehand')
                     .sort((a,b) => b.zIndex - a.zIndex)  // descending = top first
  for each comp in sorted:
    if comp.contains(col, row): return comp
  return null

contains(col, row):
  return col >= x && col < x+w && row >= y && row < y+h
```

#### 2.4.4 Resize Handles (`BaseComponent.getHandles`)
8 handles at bounding box corners/midpoints:
```
NW: (x, y)                 N: (x+floor(w/2), y)           NE: (x+w-1, y)
W:  (x, y+floor(h/2))                                     E:  (x+w-1, y+floor(h/2))
SW: (x, y+h-1)             S: (x+floor(w/2), y+h-1)       SE: (x+w-1, y+h-1)
```
Handle hit test: exact `col === handle.col && row === handle.row` match.

Resize logic (`SelectTool._applyResize`):
```
dir contains 'e': w = max(minW, origW + dx)
dir contains 'w': w = max(minW, origW - dx); x = origX + origW - w
dir contains 's': h = max(minH, origH + dy)
dir contains 'n': h = max(minH, origH - dy); y = origY + origH - h
clamp: x >= 0, y >= 0, x+w <= GRID_COLS, y+h <= GRID_ROWS
```

#### 2.4.5 Snapshot Undo (`UndoManager`)
```
push(components):
  snapshot = JSON.stringify(components.map(c => c.serialize()))
  undoStack.push(snapshot)
  if undoStack.length > 50: undoStack.shift()
  redoStack = []  // clear redo on new action

undo(currentComponents):
  if undoStack empty: return null
  redoStack.push(serialize(currentComponents))
  snapshot = undoStack.pop()
  return JSON.parse(snapshot).map(d => ComponentRegistry.deserialize(d))

redo(currentComponents): // mirror of undo
  if redoStack empty: return null
  undoStack.push(serialize(currentComponents))
  snapshot = redoStack.pop()
  return deserialize(snapshot)
```

#### 2.4.6 Box-Drawing Helpers

**`drawBox(chars, x, y, w, h, style)`**: Guard `w < 2 || h < 2`. Place tl/tr/bl/br at corners. Fill top/bottom edges with t/b. Fill left/right sides with l/r.

**`drawHDivider(chars, x, w, row, style)`**: Place `tee_right` at `[row][x]`, fill `h` chars, place `tee_left` at `[row][x+w-1]`.

**`drawVDivider(chars, col, y, h, style)`**: Place `tee_down` at `[y][col]`, fill `v` chars, place `tee_up` at `[y+h-1][col]`.

**`placeText(chars, x, y, text, maxWidth)`**: Write text chars left-to-right, truncate at `maxWidth` or row boundary. Skip if `y` out of bounds.

#### 2.4.7 Table Render Algorithm
```
render():
  draw outer box
  colWidth = floor((w - 1) / numCols)

  // Vertical dividers at c*colWidth for c=1..numCols-1
  for each vertical divider column cx:
    drawVDivider(chars, cx, 0, h, style)

  // Header divider at row 2
  drawHDivider(chars, 0, w, 2, style)

  // Fix intersection characters:
  for each cx at row 0:   chars[0][cx]   = tee_down
  for each cx at row 2:   chars[2][cx]   = cross
  for each cx at row h-1: chars[h-1][cx] = tee_up

  // Header text at row 1, each column offset cx+1
  for c in 0..numCols: placeText(chars, c*colWidth+1, 1, headers[c], colWidth-1)
```

#### 2.4.8 Modal Render Algorithm
```
render():
  if w < 10 || h < 6: return empty
  drawBox(chars, 0, 0, w, h, style)
  placeText(chars, 2, 1, title, w-6)     // title
  chars[1][w-3] = '×'                     // close button
  drawHDivider(chars, 0, w, 2, style)     // header divider
  actionRow = h - 3
  if actionRow > 2:
    drawHDivider(chars, 0, w, actionRow, style)
    cancelBtn = '[ Cancel ]'
    okBtn     = '[  OK  ]'
    placeText(chars, w-len(cancelBtn)-len(okBtn)-4, actionRow+1, cancelBtn)
    placeText(chars, w-len(okBtn)-2, actionRow+1, okBtn)
```

#### 2.4.9 Freehand Drawing (Pencil/Eraser/Brush)
All three tools use a hidden `_freehand` textbox component:
```
_freehand = TextBoxComponent at (0,0) with w=GRID_COLS, h=GRID_ROWS, zIndex=-1000
props.text = GRID_ROWS lines of GRID_COLS spaces, joined by '\n'
```
Drawing modifies individual characters in this text by splitting into lines, editing `lines[row]` at column position, then rejoining. Created on first draw if not exists.

- **Pencil**: Sets char at (col,row) to `'*'`
- **Eraser**: Sets char at (col,row) to `' '`
- **Brush**: Draws line from (fromCol,fromRow) to (toCol,toRow). Uses `h` char if `|dx| >= |dy|`, `v` char otherwise. Interpolates via `round(d*i/steps)`.

#### 2.4.10 SelectTool State Machine
```
mouseDown:
  if selected && !locked:
    handleDir = selected.getHandleAt(col, row)
    if handleDir: enter RESIZING, save orig x/y/w/h, pushUndo
  hit = hitTest(col, row)
  if hit: select(hit), if !locked: enter DRAGGING, save orig x/y, pushUndo
  else: deselect, enter MARQUEE

mouseMove:
  if RESIZING: _applyResize(dx, dy), render()
  if DRAGGING: comp.x = clamp(origX+dx), comp.y = clamp(origY+dy), render()
  if MARQUEE: update marquee x2/y2, render()

mouseUp:
  if MARQUEE with size > 1: find first component fully within rect, select it
  exit all states, render()
```

#### 2.4.11 Box-Drawing Character Merge (`mergeLineChars`)
When two components overlap on the grid, their border characters must merge into correct Unicode junctions instead of one simply overwriting the other.

**4-direction flag system** (`_BD_U=1, _BD_D=2, _BD_L=4, _BD_R=8`):
Each box-drawing character gets direction flags from `_BD_POS_DIRS`:
- Corners: `tl→D|R`, `tr→D|L`, `bl→U|R`, `br→U|L`
- Edges: `t/b/h→L|R`, `l/r/v→U|D`
- Tees: `tee_down→D|L|R`, `tee_up→U|L|R`, `tee_right→U|D|R`, `tee_left→U|D|L`
- Cross: `cross→U|D|L|R`

**Lookup tables** built dynamically from `BORDER_CHARS`:
- `_BOX_DIRS[char] → dirFlags` — direction flags for any box-drawing char (OR'd across all styles)
- `_BOX_STYLE[char] → styleName` — first style that defines the char
- `_BOX_RESULTS[style][dirFlags] → char` — result char for given direction combo in given style

**Merge algorithm**:
```
mergeLineChars(existing, incoming):
  1. If both are box-drawing chars (_BOX_DIRS has entries):
     combined = existingDirs | incomingDirs
     If combined == incomingDirs: return incoming (already covers all)
     Look up _BOX_RESULTS[incoming's style][combined]
     If found: return result
  2. Else fall back to diagonal line merge (_LINE_CHAR_DIRS):
     combined = existingLineDirs | incomingLineDirs
     Return _DIR_RESULT[combined] or incoming
  3. Default: incoming overwrites existing
```

**Examples**: `┐(D|L) + ┌(D|R) → ┬(D|L|R)`, `┤(U|D|L) + ├(U|D|R) → ┼(U|D|L|R)`
