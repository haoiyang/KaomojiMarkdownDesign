#!/usr/bin/env python3
"""
MCP Server for KaomojiMarkdownDesign ASCII Wireframe Editor.
Bridges Claude Code to the browser app via WebSocket.
"""

import asyncio
import json
import sys
import os
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from kaomoji_bridge import KaomojiBridge
from tool_handlers import tool_status, TOOL_REGISTRY

server = Server("kaomoji")
bridge = None


async def start_bridge():
    """Start the WebSocket bridge server"""
    global bridge
    bridge = KaomojiBridge.get_instance()
    host = os.environ.get("KAOMOJI_WS_HOST", "localhost")
    port = int(os.environ.get("KAOMOJI_WS_PORT", "9878"))
    await bridge.start(host, port)


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="kaomoji_status",
            description="Get connection status and canvas state (grid size, component count). Works even when no browser is connected.",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="kaomoji_list_components",
            description="List all components on the canvas with their type, position, and size",
            inputSchema={
                "type": "object",
                "properties": {
                    "include_props": {
                        "type": "boolean",
                        "description": "Include type-specific properties in output (default: false)",
                        "default": False
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="kaomoji_add_component",
            description="Add a UI component to the canvas at a specific grid position. Available types: textbox, box, button, input, line, arrow, card, table, modal, tabs, navbar, dropdown, search, checkbox, radio, toggle, progress, breadcrumb, pagination, separator, circle, group",
            inputSchema={
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "description": "Component type",
                        "enum": ["textbox", "box", "button", "input", "line", "arrow", "card", "table", "modal", "tabs", "navbar", "dropdown", "search", "checkbox", "radio", "toggle", "progress", "breadcrumb", "pagination", "separator", "circle", "group"]
                    },
                    "col": {
                        "type": ["integer", "string"],
                        "description": "Grid column (0-79)"
                    },
                    "row": {
                        "type": ["integer", "string"],
                        "description": "Grid row (0-39)"
                    },
                    "props": {
                        "description": "Type-specific properties. Examples: {title:'...'} for card, {label:'...'} for button, {text:'...'} for textbox, {cols:3, rows:3, headers:['A','B','C']} for table"
                    }
                },
                "required": ["type", "col", "row"]
            }
        ),
        Tool(
            name="kaomoji_delete_component",
            description="Delete one or more components by their IDs",
            inputSchema={
                "type": "object",
                "properties": {
                    "ids": {
                        "type": ["array", "string"],
                        "items": {"type": ["integer", "string"]},
                        "description": "Component IDs to delete"
                    }
                },
                "required": ["ids"]
            }
        ),
        Tool(
            name="kaomoji_move_component",
            description="Move a component to a new grid position",
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {"type": ["integer", "string"], "description": "Component ID"},
                    "col": {"type": ["integer", "string"], "description": "New grid column (0-79)"},
                    "row": {"type": ["integer", "string"], "description": "New grid row (0-39)"}
                },
                "required": ["id", "col", "row"]
            }
        ),
        Tool(
            name="kaomoji_resize_component",
            description="Resize a component to new dimensions",
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {"type": ["integer", "string"], "description": "Component ID"},
                    "w": {"type": ["integer", "string"], "description": "New width in grid cells"},
                    "h": {"type": ["integer", "string"], "description": "New height in grid cells"}
                },
                "required": ["id", "w", "h"]
            }
        ),
        Tool(
            name="kaomoji_set_props",
            description="Set properties on a component. Direct props: x, y, w, h, borderStyle, visible, locked, zIndex, name. Type-specific: title, label, text, placeholder, value, checked, selected, on, items, tabs, links, logo, action, cols, rows, headers, pages, current, orientation, direction",
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {"type": ["integer", "string"], "description": "Component ID"},
                    "props": {"description": "Properties to set as key-value pairs"}
                },
                "required": ["id", "props"]
            }
        ),
        Tool(
            name="kaomoji_get_component",
            description="Get full details of a component including all properties",
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {"type": ["integer", "string"], "description": "Component ID"}
                },
                "required": ["id"]
            }
        ),
        Tool(
            name="kaomoji_select",
            description="Select or deselect components on the canvas. Pass empty array to deselect all.",
            inputSchema={
                "type": "object",
                "properties": {
                    "ids": {
                        "type": ["array", "string"],
                        "items": {"type": ["integer", "string"]},
                        "description": "Component IDs to select (empty array to deselect all)",
                        "default": []
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="kaomoji_group",
            description="Group selected components together or ungroup a group",
            inputSchema={
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["group", "ungroup"],
                        "description": "'group' to group components, 'ungroup' to ungroup"
                    },
                    "ids": {
                        "type": ["array", "string"],
                        "items": {"type": ["integer", "string"]},
                        "description": "Component IDs to group (required for 'group' action)"
                    }
                },
                "required": ["action"]
            }
        ),
        Tool(
            name="kaomoji_undo_redo",
            description="Undo or redo the last action",
            inputSchema={
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["undo", "redo"],
                        "description": "Action to perform"
                    }
                },
                "required": ["action"]
            }
        ),
        Tool(
            name="kaomoji_export",
            description="Export the canvas as ASCII art text or markdown code block",
            inputSchema={
                "type": "object",
                "properties": {
                    "format": {
                        "type": "string",
                        "enum": ["markdown", "text"],
                        "description": "Output format (default: markdown)",
                        "default": "markdown"
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="kaomoji_import_json",
            description="Import a wireframe from JSON data (replaces current canvas)",
            inputSchema={
                "type": "object",
                "properties": {
                    "data": {
                        "description": "Wireframe data with {version: 1, components: [...]}"
                    }
                },
                "required": ["data"]
            }
        ),
        Tool(
            name="kaomoji_export_json",
            description="Export the current wireframe as JSON data",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="kaomoji_clear",
            description="Clear the entire canvas (removes all components)",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="kaomoji_pencil",
            description="Draw characters on the freehand layer at specified grid positions. Use this for freehand ASCII art drawing. Each cell specifies col (0-79), row (0-39), and optional char (default '*'). Use char=' ' to erase.",
            inputSchema={
                "type": "object",
                "properties": {
                    "cells": {
                        "type": ["array", "string"],
                        "description": "Array of {col, row, char?} objects. col: 0-79, row: 0-39, char: single character (default '*')"
                    }
                },
                "required": ["cells"]
            }
        ),
        Tool(
            name="kaomoji_eraser",
            description="Erase characters on the freehand layer at specified grid positions. Sets characters back to space.",
            inputSchema={
                "type": "object",
                "properties": {
                    "cells": {
                        "type": ["array", "string"],
                        "description": "Array of {col, row} objects specifying positions to erase. col: 0-79, row: 0-39"
                    }
                },
                "required": ["cells"]
            }
        ),
    ]


def _coerce_arguments(arguments: dict) -> dict:
    """Coerce string values to proper types.

    MCP clients sometimes serialize integers as strings or objects as
    JSON strings.  This normalises them before dispatching to handlers.
    """
    coerced = {}
    for key, value in arguments.items():
        if isinstance(value, str):
            # Try integer conversion for known integer fields
            if key in ("id", "col", "row", "w", "h"):
                try:
                    coerced[key] = int(value)
                    continue
                except ValueError:
                    pass
            # Try JSON parse for object/array fields
            if key in ("props", "data", "ids", "cells"):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, (dict, list)):
                        # For ids, also coerce inner strings to int
                        if key == "ids" and isinstance(parsed, list):
                            parsed = [int(v) if isinstance(v, str) and v.isdigit() else v for v in parsed]
                        coerced[key] = parsed
                        continue
                except (json.JSONDecodeError, TypeError):
                    pass
        if isinstance(value, list) and key == "ids":
            coerced[key] = [int(v) if isinstance(v, str) and v.isdigit() else v for v in value]
            continue
        coerced[key] = value
    return coerced


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        # Status works without browser connection
        if name == "kaomoji_status":
            result = await tool_status()
            return [TextContent(type="text", text=str(result))]

        # All other tools require browser connection
        if bridge is None or not bridge.is_connected():
            return [TextContent(
                type="text",
                text=str({
                    "success": False,
                    "error": "No browser connected. Open KaomojiMarkdownDesign in a browser to connect."
                })
            )]

        # Coerce string values to proper types before dispatching
        arguments = _coerce_arguments(arguments)

        if name in TOOL_REGISTRY:
            result = await TOOL_REGISTRY[name](**arguments)
            return [TextContent(type="text", text=str(result))]
        else:
            return [TextContent(
                type="text",
                text=str({"success": False, "error": f"Unknown tool: {name}"})
            )]

    except Exception as e:
        return [TextContent(
            type="text",
            text=str({"success": False, "error": f"Tool execution failed: {str(e)}"})
        )]


async def main():
    print("Starting KaomojiMCP server...", file=sys.stderr)
    await start_bridge()
    print("Ready — waiting for browser connection on ws://localhost:9878", file=sys.stderr)

    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
