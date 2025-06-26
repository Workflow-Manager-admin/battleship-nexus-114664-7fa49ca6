"""
Main entrypoint for the Battleship backend FastAPI app.
Sets up modular routes for authentication, game logic, matchmaking,
leaderboard/history, and WebSocket endpoints.
Includes OpenAPI metadata and tags for documentation.

All configuration (database URLs, JWT secret, etc.) must be set via environment
variables.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from api.routers import auth, game, leaderboard, ws

app = FastAPI(
    title="Battleship Multiplayer Backend",
    description=(
        "Backend API for Battleship multiplayer game: REST, WebSocket, "
        "AI opponents, auth, realtime updates."
    ),
    version="1.0.0",
    openapi_tags=[
        {"name": "auth", "description": "User Signup/Login JWT Authentication"},
        {"name": "game", "description": "Game logic: room creation, moves, join, AI"},
        {
            "name": "ws",
            "description": "Real-time WebSocket endpoints (state sync/gameplay)",
        },
        {"name": "leaderboard", "description": "Leaderboard, history, replay endpoints"},
    ]
)

# CORS middleware (allow all origins for development, restrict in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(game.router, prefix="/game", tags=["game"])
app.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
app.include_router(ws.router, prefix="/ws", tags=["ws"])


@app.get("/")
def health_check():
    """Health check endpoint."""
    return {"message": "Healthy"}


@app.get("/docs/websockets", tags=["ws"])
def websocket_usage():
    """
    WebSocket API usage help.

    Connect using the /ws/game/{room_code} WebSocket endpoint.
    - Use JWT Bearer token for authentication (in query or header).
    - Send/receive JSON messages to play turns, sync game, get real-time events.
    """
    return JSONResponse({
        "websocket_endpoint": "/ws/game/{room_code}",
        "authentication": "JWT Bearer token required in Authorization header or query param",
        "message_format": "JSON: {\"action\": ..., \"payload\": ...}",
        "actions": ["join", "move", "sync", "chat", "leave"]
    })
