"""
Game router: create/join/match/AI, moves, state, validate placement, and game-over endpoints.
"""

from fastapi import APIRouter, Depends
from api.services import game as game_service
from api.services.auth import get_current_user
from api.schemas.game import (
    GameCreateRequest, GameJoinRequest, GameMoveRequest, GameResponse, MoveResponse,
    GameStateResponse, GameOverResponse, ValidationRequest, ValidationResponse,
    MatchmakingRequest, MatchmakingResponse, AIRequest, AIResponse
)

router = APIRouter()


# PUBLIC_INTERFACE
@router.post("/create", summary="Create new game room", response_model=GameResponse)
async def create_game(payload: GameCreateRequest, current_user=Depends(get_current_user)):
    """
    Create a new game room. Returns game details and initial state.
    """
    return await game_service.create_game(payload, current_user)


# PUBLIC_INTERFACE
@router.post(
    "/join", summary="Join an existing game room", response_model=GameResponse
)
async def join_game(payload: GameJoinRequest, current_user=Depends(get_current_user)):
    """
    Join a game room by code.
    """
    return await game_service.join_game(payload, current_user)


# PUBLIC_INTERFACE
@router.post(
    "/matchmaking", summary="Quick match with another player", response_model=MatchmakingResponse
)
async def matchmaking(payload: MatchmakingRequest, current_user=Depends(get_current_user)):
    """
    Enter matchmaking pool for quick games.
    """
    return await game_service.matchmaking(payload, current_user)


# PUBLIC_INTERFACE
@router.post(
    "/validate", summary="Validate ship placement", response_model=ValidationResponse
)
async def validate_grid(payload: ValidationRequest, current_user=Depends(get_current_user)):
    """
    Validate player's 10x10 ship placement grid.
    """
    return await game_service.validate_grid(payload, current_user)


# PUBLIC_INTERFACE
@router.post(
    "/move", summary="Make a move in an active game", response_model=MoveResponse
)
async def make_move(payload: GameMoveRequest, current_user=Depends(get_current_user)):
    """
    Register a player's move, return outcome, and update game state.
    """
    return await game_service.make_move(payload, current_user)


# PUBLIC_INTERFACE
@router.get(
    "/{game_id}/state", summary="Get full game state", response_model=GameStateResponse
)
async def get_game_state(game_id: str, current_user=Depends(get_current_user)):
    """
    Query the current state of the specified game.
    """
    return await game_service.get_game_state(game_id, current_user)


# PUBLIC_INTERFACE
@router.get(
    "/{game_id}/over", summary="Get game over status", response_model=GameOverResponse
)
async def game_over(game_id: str, current_user=Depends(get_current_user)):
    """
    Check for and return game over event details.
    """
    return await game_service.get_game_over(game_id, current_user)


# PUBLIC_INTERFACE
@router.post(
    "/ai", summary="Request an AI opponent move", response_model=AIResponse
)
async def ai_move(payload: AIRequest, current_user=Depends(get_current_user)):
    """
    Request a move from the AI opponent given current game state.
    """
    return await game_service.ai_move(payload, current_user)
