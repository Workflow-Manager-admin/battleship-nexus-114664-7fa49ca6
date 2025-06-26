"""
Leaderboard and history router: get leaderboards, player stats, list/retrieve replays.
"""

from fastapi import APIRouter, Depends
from api.services import leaderboard as leaderboard_service
from api.services.auth import get_current_user
from api.schemas.leaderboard import (
    LeaderboardListResponse, GameHistoryResponse, ReplayListResponse, ReplayResponse
)

router = APIRouter()


# PUBLIC_INTERFACE
@router.get("/", summary="Get top players/leaderboard", response_model=LeaderboardListResponse)
async def get_leaderboard(limit: int = 20):
    """
    Returns global leaderboard.
    """
    return await leaderboard_service.get_leaderboard(limit)


# PUBLIC_INTERFACE
@router.get("/history", summary="Get personal game history", response_model=GameHistoryResponse)
async def get_history(current_user=Depends(get_current_user)):
    """
    Returns current user's completed games.
    """
    return await leaderboard_service.get_user_history(current_user)


# PUBLIC_INTERFACE
@router.get("/replay/{game_id}", summary="Replay a finished game", response_model=ReplayResponse)
async def replay_game(game_id: str):
    """
    Replay state for a completed game (move-by-move).
    """
    return await leaderboard_service.get_replay(game_id)


# PUBLIC_INTERFACE
@router.get("/replays", summary="List replays", response_model=ReplayListResponse)
async def replay_list(limit: int = 10):
    """
    List several recent finished games.
    """
    return await leaderboard_service.list_replays(limit)
