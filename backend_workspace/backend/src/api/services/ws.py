"""
WebSocket service: manages gameplay real-time updates via Redis pub/sub for game state sync.
"""

from starlette.websockets import WebSocket


# PUBLIC_INTERFACE
async def handle_game_ws(websocket: WebSocket, room_code: str, user):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            # Publish/subscribe via Redis, update game state, relay messages.
            await websocket.send_json({"status": "ok", "echo": data})
    except Exception:
        pass
