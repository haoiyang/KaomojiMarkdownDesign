"""Tests for kaomoji_bridge.py — WebSocket server bridge"""
import asyncio
import json
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kaomoji_bridge import KaomojiBridge


@pytest.fixture(autouse=True)
def reset_singleton():
    """Reset singleton between tests"""
    KaomojiBridge._instance = None
    yield
    KaomojiBridge._instance = None


class TestSingleton:
    def test_get_instance_returns_same(self):
        a = KaomojiBridge.get_instance()
        b = KaomojiBridge.get_instance()
        assert a is b

    def test_initial_state(self):
        bridge = KaomojiBridge.get_instance()
        assert bridge.client is None
        assert bridge.server is None
        assert bridge.is_connected() is False
        assert bridge.pending_responses == {}


class TestNotConnected:
    @pytest.mark.asyncio
    async def test_send_command_raises_when_no_client(self):
        bridge = KaomojiBridge.get_instance()
        with pytest.raises(ConnectionError, match="No browser connected"):
            await bridge.send_command("test", {})


class TestServerLifecycle:
    @pytest.mark.asyncio
    async def test_start_stop(self):
        bridge = KaomojiBridge.get_instance()
        await bridge.start("localhost", 19878)
        assert bridge.server is not None
        await bridge.stop()
        assert bridge.server is None

    @pytest.mark.asyncio
    async def test_client_connection(self):
        """Test that a WebSocket client can connect and exchange messages"""
        import websockets

        bridge = KaomojiBridge.get_instance()
        await bridge.start("localhost", 19879)

        try:
            # Connect a mock browser client
            async with websockets.connect("ws://localhost:19879") as ws:
                # Bridge should detect the connection
                await asyncio.sleep(0.1)
                assert bridge.is_connected()

                # Send a command from Python side
                cmd_task = asyncio.create_task(
                    bridge.send_command("test_cmd", {"key": "val"}, timeout=5.0)
                )

                # Receive it on the "browser" side
                raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
                msg = json.loads(raw)
                assert msg["command"] == "test_cmd"
                assert msg["params"] == {"key": "val"}
                assert "id" in msg

                # Send response back
                response = {"id": msg["id"], "success": True, "result": {"status": "ok"}}
                await ws.send(json.dumps(response))

                # Python side should get the result
                result = await asyncio.wait_for(cmd_task, timeout=2.0)
                assert result == {"status": "ok"}
        finally:
            await bridge.stop()

    @pytest.mark.asyncio
    async def test_send_command_timeout(self):
        """Test that commands time out if browser doesn't respond"""
        import websockets

        bridge = KaomojiBridge.get_instance()
        await bridge.start("localhost", 19880)

        try:
            async with websockets.connect("ws://localhost:19880") as ws:
                await asyncio.sleep(0.1)
                with pytest.raises(TimeoutError):
                    await bridge.send_command("slow_cmd", {}, timeout=0.5)
        finally:
            await bridge.stop()

    @pytest.mark.asyncio
    async def test_error_response_raises_runtime_error(self):
        """Test that error responses from browser raise RuntimeError"""
        import websockets

        bridge = KaomojiBridge.get_instance()
        await bridge.start("localhost", 19881)

        try:
            async with websockets.connect("ws://localhost:19881") as ws:
                await asyncio.sleep(0.1)

                cmd_task = asyncio.create_task(
                    bridge.send_command("bad_cmd", {}, timeout=5.0)
                )

                raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
                msg = json.loads(raw)

                # Send error response
                await ws.send(json.dumps({
                    "id": msg["id"],
                    "success": False,
                    "error": "Component 99 not found"
                }))

                with pytest.raises(RuntimeError, match="Component 99 not found"):
                    await cmd_task
        finally:
            await bridge.stop()

    @pytest.mark.asyncio
    async def test_client_disconnect_cleanup(self):
        """Test that pending futures are cleaned up when client disconnects"""
        import websockets

        bridge = KaomojiBridge.get_instance()
        await bridge.start("localhost", 19882)

        try:
            ws = await websockets.connect("ws://localhost:19882")
            await asyncio.sleep(0.1)
            assert bridge.is_connected()

            # Start a command but close connection before responding
            cmd_task = asyncio.create_task(
                bridge.send_command("abandoned_cmd", {}, timeout=5.0)
            )
            await asyncio.sleep(0.05)
            await ws.close()
            await asyncio.sleep(0.2)

            assert not bridge.is_connected()
            # The command should fail with ConnectionError
            with pytest.raises((ConnectionError, RuntimeError)):
                await cmd_task
        finally:
            await bridge.stop()
