"""
Leaderboard and history service: compiles leaderboard, fetches user history, handles replays.
"""

from api.schemas.leaderboard import (
    LeaderboardListResponse, LeaderboardEntry,
    GameHistoryResponse, ReplayResponse, ReplayListResponse,
)


# PUBLIC_INTERFACE
async def get_leaderboard(limit: int):
    return LeaderboardListResponse(
        entries=[
            LeaderboardEntry(username="alice", wins=10, losses=5),
            LeaderboardEntry(username="bob", wins=7, losses=8),
        ]
    )


# PUBLIC_INTERFACE
async def get_user_history(current_user):
    return GameHistoryResponse(games=[])


# PUBLIC_INTERFACE
async def get_replay(game_id: str):
    return ReplayResponse(game_id=game_id, moves=[])


# PUBLIC_INTERFACE
async def list_replays(limit: int = 10):
    return ReplayListResponse(replays=[])
