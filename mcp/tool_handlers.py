"""
Tool handlers for KaomojiMCP server.
Each function sends a command via the WebSocket bridge and returns the result.
"""

from typing import Dict, Any, List, Optional
from kaomoji_bridge import KaomojiBridge


async def tool_status() -> Dict[str, Any]:
    """Get connection status and canvas state"""
    bridge = KaomojiBridge.get_instance()
    if not bridge.is_connected():
        return {"connected": False, "error": "No browser connected"}
    try:
        result = await bridge.send_command("status", {})
        return {"connected": True, **result}
    except Exception as e:
        return {"connected": False, "error": str(e)}


async def tool_list_components(include_props: bool = False) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("list_components", {"include_props": include_props})
    return result


async def tool_add_component(type: str, col: int, row: int, props: Optional[Dict] = None) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    params = {"type": type, "col": col, "row": row}
    if props:
        params["props"] = props
    result = await bridge.send_command("add_component", params)
    return result


async def tool_delete_component(ids: List[int]) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("delete_component", {"ids": ids})
    return result


async def tool_move_component(id: int, col: int, row: int) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("move_component", {"id": id, "col": col, "row": row})
    return result


async def tool_resize_component(id: int, w: int, h: int) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("resize_component", {"id": id, "w": w, "h": h})
    return result


async def tool_set_props(id: int, props: Dict[str, Any]) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("set_props", {"id": id, "props": props})
    return result


async def tool_get_component(id: int) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("get_component", {"id": id})
    return result


async def tool_select(ids: Optional[List[int]] = None) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("select", {"ids": ids or []})
    return result


async def tool_group(action: str, ids: Optional[List[int]] = None) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    params = {"action": action}
    if ids:
        params["ids"] = ids
    result = await bridge.send_command("group", params)
    return result


async def tool_undo_redo(action: str) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("undo_redo", {"action": action})
    return result


async def tool_export(format: str = "markdown") -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("export", {"format": format})
    return result


async def tool_import_json(data: Dict[str, Any]) -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("import_json", {"data": data})
    return result


async def tool_export_json() -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("export_json", {})
    return result


async def tool_clear() -> Dict[str, Any]:
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("clear", {})
    return result


async def tool_pencil(cells: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Draw characters on the freehand layer at specified grid positions"""
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("pencil", {"cells": cells})
    return result


async def tool_eraser(cells: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Erase characters on the freehand layer at specified grid positions"""
    bridge = KaomojiBridge.get_instance()
    result = await bridge.send_command("eraser", {"cells": cells})
    return result


TOOL_REGISTRY = {
    "kaomoji_status": tool_status,
    "kaomoji_list_components": tool_list_components,
    "kaomoji_add_component": tool_add_component,
    "kaomoji_delete_component": tool_delete_component,
    "kaomoji_move_component": tool_move_component,
    "kaomoji_resize_component": tool_resize_component,
    "kaomoji_set_props": tool_set_props,
    "kaomoji_get_component": tool_get_component,
    "kaomoji_select": tool_select,
    "kaomoji_group": tool_group,
    "kaomoji_undo_redo": tool_undo_redo,
    "kaomoji_export": tool_export,
    "kaomoji_import_json": tool_import_json,
    "kaomoji_export_json": tool_export_json,
    "kaomoji_clear": tool_clear,
    "kaomoji_pencil": tool_pencil,
    "kaomoji_eraser": tool_eraser,
}
