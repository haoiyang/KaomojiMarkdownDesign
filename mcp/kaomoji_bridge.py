"""
WebSocket server for communicating with KaomojiMarkdownDesign browser app.
Key difference from GodotMCP: Python is the WebSocket SERVER, browser is CLIENT.
"""

import asyncio
import json
import uuid
import sys
from typing import Optional, Dict, Any
import websockets


class KaomojiBridge:
    """Singleton WebSocket server for Kaomoji browser communication"""

    _instance: Optional['KaomojiBridge'] = None

    def __init__(self):
        self.client = None  # websockets.ServerConnection when connected
        self.host = "localhost"
        self.port = 9878
        self.pending_responses: Dict[str, asyncio.Future] = {}
        self.server = None
        self._serve_task: Optional[asyncio.Task] = None

    @classmethod
    def get_instance(cls) -> 'KaomojiBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def start(self, host: str = "localhost", port: int = 9878):
        """Start WebSocket server"""
        self.host = host
        self.port = port
        self.server = await websockets.serve(
            self._handle_connection, host, port,
            ping_interval=20, ping_timeout=10
        )
        print(f"WebSocket server listening on ws://{host}:{port}", file=sys.stderr)

    async def stop(self):
        """Stop WebSocket server"""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.server = None

    def is_connected(self) -> bool:
        """Check if a browser client is connected"""
        return self.client is not None

    async def send_command(self, command: str, params: Dict[str, Any], timeout: float = 10.0) -> Dict[str, Any]:
        """Send command to browser and wait for response"""
        if not self.is_connected():
            raise ConnectionError("No browser connected. Open KaomojiMarkdownDesign in a browser.")

        request_id = str(uuid.uuid4())
        message = {
            "id": request_id,
            "command": command,
            "params": params
        }

        future = asyncio.Future()
        self.pending_responses[request_id] = future

        try:
            await self.client.send(json.dumps(message))
            response = await asyncio.wait_for(future, timeout=timeout)
            if not response.get("success", False):
                error_msg = response.get("error", "Unknown error from browser")
                raise RuntimeError(error_msg)
            return response.get("result", {})
        except asyncio.TimeoutError:
            if request_id in self.pending_responses:
                del self.pending_responses[request_id]
            raise TimeoutError(f"Command '{command}' timed out after {timeout}s")
        except websockets.exceptions.ConnectionClosed:
            self.client = None
            if request_id in self.pending_responses:
                del self.pending_responses[request_id]
            raise ConnectionError("Browser disconnected during command")
        except Exception:
            if request_id in self.pending_responses:
                del self.pending_responses[request_id]
            raise

    async def _handle_connection(self, websocket):
        """Handle a browser client connection"""
        # Only allow one client at a time
        if self.client is not None:
            try:
                await self.client.close()
            except Exception:
                pass
            # Fail any pending futures from old connection
            for fut in self.pending_responses.values():
                if not fut.done():
                    fut.set_exception(ConnectionError("Previous browser connection replaced"))
            self.pending_responses.clear()

        self.client = websocket
        print("Browser connected", file=sys.stderr)

        try:
            async for message in websocket:
                await self._handle_message(message)
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"Error in client connection: {e}", file=sys.stderr)
        finally:
            if self.client is websocket:
                self.client = None
                print("Browser disconnected", file=sys.stderr)
                # Fail any pending futures
                for fut in self.pending_responses.values():
                    if not fut.done():
                        fut.set_exception(ConnectionError("Browser disconnected"))
                self.pending_responses.clear()

    async def _handle_message(self, message: str):
        """Handle incoming message from browser"""
        try:
            data = json.loads(message)
            if "id" in data and data["id"] in self.pending_responses:
                future = self.pending_responses.pop(data["id"])
                if not future.done():
                    future.set_result(data)
        except json.JSONDecodeError as e:
            print(f"Invalid JSON from browser: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Error handling message: {e}", file=sys.stderr)
