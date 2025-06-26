"""
WebSocket router: Handles real-time connections for gameplay, room sync,
and chat using Redis pub/sub.
"""

from fastapi import APIRouter, WebSocket, Query
from api.services import ws as ws_service
from api.services.auth import get_current_user_from_ws

router = APIRouter()


# PUBLIC_INTERFACE
@router.websocket("/game/{room_code}", name="gameplay_ws")
async def gameplay_ws(websocket: WebSocket, room_code: str, token: str = Query(None)):
    """
    WebSocket endpoint for real-time gameplay state and moves.
    - Requires JWT token (as query param ?token=...).
    """
    user = await get_current_user_from_ws(websocket, token)
    await ws_service.handle_game_ws(websocket, room_code, user)
