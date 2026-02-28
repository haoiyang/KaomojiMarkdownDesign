"""Tests for tool_handlers.py — 17 MCP tool handler functions"""
import asyncio
import json
import pytest
import sys
import os
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tool_handlers import (
    tool_status, tool_list_components, tool_add_component,
    tool_delete_component, tool_move_component, tool_resize_component,
    tool_set_props, tool_get_component, tool_select, tool_group,
    tool_undo_redo, tool_export, tool_import_json, tool_export_json,
    tool_clear, tool_pencil, tool_eraser, TOOL_REGISTRY
)
from kaomoji_bridge import KaomojiBridge


@pytest.fixture(autouse=True)
def reset_singleton():
    KaomojiBridge._instance = None
    yield
    KaomojiBridge._instance = None


@pytest.fixture
def mock_bridge():
    """Create a mock bridge with send_command"""
    bridge = KaomojiBridge.get_instance()
    bridge.client = MagicMock()  # Simulate connected
    bridge.send_command = AsyncMock()
    return bridge


class TestToolRegistry:
    def test_all_17_tools_registered(self):
        assert len(TOOL_REGISTRY) == 17

    def test_tool_names(self):
        expected = [
            "kaomoji_status", "kaomoji_list_components", "kaomoji_add_component",
            "kaomoji_delete_component", "kaomoji_move_component", "kaomoji_resize_component",
            "kaomoji_set_props", "kaomoji_get_component", "kaomoji_select",
            "kaomoji_group", "kaomoji_undo_redo", "kaomoji_export",
            "kaomoji_import_json", "kaomoji_export_json", "kaomoji_clear",
            "kaomoji_pencil", "kaomoji_eraser"
        ]
        for name in expected:
            assert name in TOOL_REGISTRY, f"Missing tool: {name}"

    def test_all_handlers_are_coroutines(self):
        import inspect
        for name, handler in TOOL_REGISTRY.items():
            assert inspect.iscoroutinefunction(handler), f"{name} is not async"


class TestToolStatus:
    @pytest.mark.asyncio
    async def test_status_not_connected(self):
        """Status returns connected=False when no browser"""
        result = await tool_status()
        assert result["connected"] is False

    @pytest.mark.asyncio
    async def test_status_connected(self, mock_bridge):
        mock_bridge.send_command.return_value = {
            "gridCols": 80, "gridRows": 40, "componentCount": 3
        }
        result = await tool_status()
        assert result["connected"] is True
        assert result["gridCols"] == 80
        mock_bridge.send_command.assert_called_once_with("status", {})


class TestToolAddComponent:
    @pytest.mark.asyncio
    async def test_add_basic(self, mock_bridge):
        mock_bridge.send_command.return_value = {"id": 1, "type": "card"}
        result = await tool_add_component(type="card", col=10, row=5)
        assert result["type"] == "card"
        mock_bridge.send_command.assert_called_once_with(
            "add_component", {"type": "card", "col": 10, "row": 5}
        )

    @pytest.mark.asyncio
    async def test_add_with_props(self, mock_bridge):
        mock_bridge.send_command.return_value = {"id": 2, "type": "button"}
        result = await tool_add_component(type="button", col=0, row=0, props={"label": "Click"})
        mock_bridge.send_command.assert_called_once_with(
            "add_component", {"type": "button", "col": 0, "row": 0, "props": {"label": "Click"}}
        )


class TestToolDeleteComponent:
    @pytest.mark.asyncio
    async def test_delete(self, mock_bridge):
        mock_bridge.send_command.return_value = {"deleted": [1, 2]}
        result = await tool_delete_component(ids=[1, 2])
        assert result["deleted"] == [1, 2]


class TestToolMoveComponent:
    @pytest.mark.asyncio
    async def test_move(self, mock_bridge):
        mock_bridge.send_command.return_value = {"id": 1, "x": 20, "y": 10}
        result = await tool_move_component(id=1, col=20, row=10)
        mock_bridge.send_command.assert_called_once_with(
            "move_component", {"id": 1, "col": 20, "row": 10}
        )


class TestToolResizeComponent:
    @pytest.mark.asyncio
    async def test_resize(self, mock_bridge):
        mock_bridge.send_command.return_value = {"id": 1, "w": 30, "h": 15}
        result = await tool_resize_component(id=1, w=30, h=15)
        mock_bridge.send_command.assert_called_once_with(
            "resize_component", {"id": 1, "w": 30, "h": 15}
        )


class TestToolSetProps:
    @pytest.mark.asyncio
    async def test_set_props(self, mock_bridge):
        mock_bridge.send_command.return_value = {"id": 1, "type": "card"}
        result = await tool_set_props(id=1, props={"title": "New Title"})
        mock_bridge.send_command.assert_called_once_with(
            "set_props", {"id": 1, "props": {"title": "New Title"}}
        )


class TestToolGetComponent:
    @pytest.mark.asyncio
    async def test_get(self, mock_bridge):
        mock_bridge.send_command.return_value = {"id": 1, "type": "card", "props": {"title": "Test"}}
        result = await tool_get_component(id=1)
        assert result["type"] == "card"


class TestToolSelect:
    @pytest.mark.asyncio
    async def test_select(self, mock_bridge):
        mock_bridge.send_command.return_value = {"selected": [1, 3]}
        result = await tool_select(ids=[1, 3])
        assert result["selected"] == [1, 3]

    @pytest.mark.asyncio
    async def test_deselect_all(self, mock_bridge):
        mock_bridge.send_command.return_value = {"selected": []}
        result = await tool_select()
        mock_bridge.send_command.assert_called_once_with("select", {"ids": []})


class TestToolGroup:
    @pytest.mark.asyncio
    async def test_group(self, mock_bridge):
        mock_bridge.send_command.return_value = {"id": 5, "type": "group"}
        result = await tool_group(action="group", ids=[1, 2, 3])
        mock_bridge.send_command.assert_called_once_with(
            "group", {"action": "group", "ids": [1, 2, 3]}
        )

    @pytest.mark.asyncio
    async def test_ungroup(self, mock_bridge):
        mock_bridge.send_command.return_value = {"ungrouped": True}
        result = await tool_group(action="ungroup")
        mock_bridge.send_command.assert_called_once_with(
            "group", {"action": "ungroup"}
        )


class TestToolUndoRedo:
    @pytest.mark.asyncio
    async def test_undo(self, mock_bridge):
        mock_bridge.send_command.return_value = {"action": "undo", "componentCount": 2}
        result = await tool_undo_redo(action="undo")
        assert result["action"] == "undo"

    @pytest.mark.asyncio
    async def test_redo(self, mock_bridge):
        mock_bridge.send_command.return_value = {"action": "redo", "componentCount": 3}
        result = await tool_undo_redo(action="redo")
        assert result["action"] == "redo"


class TestToolExport:
    @pytest.mark.asyncio
    async def test_export_markdown(self, mock_bridge):
        mock_bridge.send_command.return_value = {"format": "markdown", "content": "```\n...\n```"}
        result = await tool_export(format="markdown")
        assert result["format"] == "markdown"

    @pytest.mark.asyncio
    async def test_export_text(self, mock_bridge):
        mock_bridge.send_command.return_value = {"format": "text", "content": "..."}
        result = await tool_export(format="text")
        assert result["format"] == "text"


class TestToolImportExportJson:
    @pytest.mark.asyncio
    async def test_import(self, mock_bridge):
        mock_bridge.send_command.return_value = {"imported": 3}
        data = {"version": 1, "components": []}
        result = await tool_import_json(data=data)
        assert result["imported"] == 3

    @pytest.mark.asyncio
    async def test_export_json(self, mock_bridge):
        mock_bridge.send_command.return_value = {"version": 1, "components": []}
        result = await tool_export_json()
        assert result["version"] == 1


class TestToolClear:
    @pytest.mark.asyncio
    async def test_clear(self, mock_bridge):
        mock_bridge.send_command.return_value = {"cleared": True}
        result = await tool_clear()
        assert result["cleared"] is True


class TestToolPencil:
    @pytest.mark.asyncio
    async def test_pencil_draw(self, mock_bridge):
        mock_bridge.send_command.return_value = {"drawn": 3}
        cells = [{"col": 5, "row": 5, "char": "*"}, {"col": 6, "row": 5, "char": "o"}, {"col": 7, "row": 5}]
        result = await tool_pencil(cells=cells)
        mock_bridge.send_command.assert_called_once_with("pencil", {"cells": cells})
        assert result["drawn"] == 3


class TestToolEraser:
    @pytest.mark.asyncio
    async def test_eraser(self, mock_bridge):
        mock_bridge.send_command.return_value = {"erased": 2}
        cells = [{"col": 5, "row": 5}, {"col": 6, "row": 5}]
        result = await tool_eraser(cells=cells)
        mock_bridge.send_command.assert_called_once_with("eraser", {"cells": cells})
        assert result["erased"] == 2
