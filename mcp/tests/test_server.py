"""Tests for server.py — MCP tool definitions"""
import asyncio
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kaomoji_bridge import KaomojiBridge


@pytest.fixture(autouse=True)
def reset_singleton():
    KaomojiBridge._instance = None
    yield
    KaomojiBridge._instance = None


class TestServerImport:
    def test_server_imports(self):
        """Verify server module imports without errors"""
        from server import server, list_tools, call_tool, start_bridge
        assert server is not None

    @pytest.mark.asyncio
    async def test_list_tools_returns_17(self):
        from server import list_tools
        tools = await list_tools()
        assert len(tools) == 17

    @pytest.mark.asyncio
    async def test_tool_names(self):
        from server import list_tools
        tools = await list_tools()
        names = [t.name for t in tools]
        expected = [
            "kaomoji_status", "kaomoji_list_components", "kaomoji_add_component",
            "kaomoji_delete_component", "kaomoji_move_component", "kaomoji_resize_component",
            "kaomoji_set_props", "kaomoji_get_component", "kaomoji_select",
            "kaomoji_group", "kaomoji_undo_redo", "kaomoji_export",
            "kaomoji_import_json", "kaomoji_export_json", "kaomoji_clear",
            "kaomoji_pencil", "kaomoji_eraser"
        ]
        for name in expected:
            assert name in names, f"Missing tool: {name}"

    @pytest.mark.asyncio
    async def test_all_tools_have_input_schema(self):
        from server import list_tools
        tools = await list_tools()
        for tool in tools:
            assert tool.inputSchema is not None
            assert "type" in tool.inputSchema
            assert tool.inputSchema["type"] == "object"

    @pytest.mark.asyncio
    async def test_call_tool_unknown(self):
        """Unknown tool returns 'Unknown tool' when bridge is connected, or
        'No browser connected' when bridge is None (connection check comes first
        in server.py for non-status tools)."""
        from unittest.mock import MagicMock
        import server as srv
        from server import call_tool

        # Simulate a connected bridge so the connection check passes
        # and we reach the "Unknown tool" branch
        original_bridge = srv.bridge
        try:
            mock_bridge = MagicMock()
            mock_bridge.is_connected.return_value = True
            srv.bridge = mock_bridge

            result = await call_tool("nonexistent_tool", {})
            assert len(result) == 1
            assert "Unknown tool" in result[0].text
        finally:
            srv.bridge = original_bridge

    @pytest.mark.asyncio
    async def test_call_tool_status_no_connection(self):
        from server import call_tool
        result = await call_tool("kaomoji_status", {})
        assert len(result) == 1
        assert "connected" in result[0].text.lower()


class TestCoerceArguments:
    """Test _coerce_arguments type coercion logic"""

    def test_string_to_int_for_id(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"id": "5", "col": "10", "row": "20"})
        assert result == {"id": 5, "col": 10, "row": 20}

    def test_string_to_int_for_dimensions(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"id": "1", "w": "14", "h": "5"})
        assert result == {"id": 1, "w": 14, "h": 5}

    def test_json_string_to_dict_for_props(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"id": 1, "props": '{"w": 14, "h": 5}'})
        assert result["id"] == 1
        assert result["props"] == {"w": 14, "h": 5}

    def test_json_string_to_dict_for_data(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"data": '{"version": 1, "components": []}'})
        assert result["data"] == {"version": 1, "components": []}

    def test_ids_list_string_to_int(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"ids": ["1", "2", "3"]})
        assert result["ids"] == [1, 2, 3]

    def test_already_correct_types_unchanged(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"id": 5, "props": {"text": "hello"}})
        assert result == {"id": 5, "props": {"text": "hello"}}

    def test_non_numeric_string_stays_string(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"type": "card", "format": "markdown"})
        assert result == {"type": "card", "format": "markdown"}

    def test_ids_json_string_to_list(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"ids": "[1, 2, 3]"})
        assert result["ids"] == [1, 2, 3]

    def test_ids_json_string_with_string_items(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"ids": '["1", "2"]'})
        assert result["ids"] == [1, 2]

    def test_cells_json_string_to_list(self):
        from server import _coerce_arguments
        result = _coerce_arguments({"cells": '[{"col": 5, "row": 5, "char": "*"}]'})
        assert isinstance(result["cells"], list)
        assert result["cells"][0]["col"] == 5

    def test_empty_arguments(self):
        from server import _coerce_arguments
        assert _coerce_arguments({}) == {}
