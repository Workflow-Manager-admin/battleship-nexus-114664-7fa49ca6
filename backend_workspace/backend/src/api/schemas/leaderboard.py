from pydantic import BaseModel
from typing import List


class LeaderboardEntry(BaseModel):
    username: str
    wins: int
    losses: int


class LeaderboardListResponse(BaseModel):
    entries: List[LeaderboardEntry]


class GameHistoryResponse(BaseModel):
    games: list


class ReplayListResponse(BaseModel):
    replays: list


class ReplayResponse(BaseModel):
    game_id: str
    moves: list
