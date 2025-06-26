from pydantic import BaseModel
from typing import Optional, Literal


class GameCreateRequest(BaseModel):
    grid: list


class GameJoinRequest(BaseModel):
    room_code: str


class MatchmakingRequest(BaseModel):
    pass  # Extend for more options


class MatchmakingResponse(BaseModel):
    game_id: str
    room_code: str
    opponent: str


class ValidationRequest(BaseModel):
    grid: list


class ValidationResponse(BaseModel):
    valid: bool
    errors: list


class GameMoveRequest(BaseModel):
    game_id: str
    x: int
    y: int


class MoveResponse(BaseModel):
    result: Literal["hit", "miss"]
    x: int
    y: int
    game_over: bool
    sunk_ship: Optional[str]


class GameResponse(BaseModel):
    game_id: str
    room_code: str
    players: list
    current_turn: Optional[str]
    status: str


class GameStateResponse(BaseModel):
    game_id: str
    status: str
    players: list
    grids: list
    current_turn: str


class GameOverResponse(BaseModel):
    game_id: str
    winner: Optional[str]
    over: bool


class AIRequest(BaseModel):
    game_id: str
    grid: list


class AIResponse(BaseModel):
    x: int
    y: int
