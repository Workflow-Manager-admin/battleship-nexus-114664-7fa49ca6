import os
import asyncio
import hashlib
import secrets
import json
from datetime import datetime, timedelta
from uuid import uuid4, UUID
from typing import List, Dict, Optional, Any

from fastapi import (
    FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import asyncpg
import aioredis
import jwt


# PUBLIC_INTERFACE
def get_env_var(name: str, default=None):
    """Helper to load environment variables."""
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


POSTGRES_DSN = get_env_var(
    "POSTGRES_DSN",
    "postgresql://postgres:postgres@localhost:5432/battleship"
)
REDIS_URL = get_env_var("REDIS_URL", "redis://localhost:6379")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week
JWT_SECRET = get_env_var("JWT_SECRET", "super-secret-key")
JWT_ALGORITHM = "HS256"


app = FastAPI(
    title="Battleship Game Backend",
    description=(
        "Backend for multiplayer Battleship game. Runs REST and WebSocket APIs, "
        "manages Battleship logic, and stores persistent game/user data."
    ),
    version="1.0.0",
    openapi_tags=[
        {"name": "auth", "description": "User authentication"},
        {"name": "game", "description": "Game creation/join/play/matchmaking"},
        {"name": "ws", "description": "WebSocket game event stream"},
        {"name": "leaderboard", "description": "Leaderboards and game history"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set specific domains in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db_pool: Optional[asyncpg.pool.Pool] = None
redis: Optional[aioredis.Redis] = None


@app.on_event("startup")
async def startup():
    global db_pool, redis
    db_pool = await asyncpg.create_pool(dsn=POSTGRES_DSN)
    redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    await ensure_tables(db_pool)


@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()
    if redis:
        await redis.close()


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class UserInDB(BaseModel):
    id: int
    username: str
    password_hash: str
    win_count: int
    loss_count: int
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


# PUBLIC_INTERFACE
def hash_password(password: str) -> str:
    """Simple SHA256 hash for demonstration."""
    return hashlib.sha256(password.encode()).hexdigest()


# PUBLIC_INTERFACE
def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash


# PUBLIC_INTERFACE
def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


# PUBLIC_INTERFACE
async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid auth payload")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_row = await db_pool.fetchrow(
        "SELECT * FROM users WHERE username=$1", username
    )
    if user_row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserInDB(**user_row)


GRID_SIZE = 10
SHIP_SIZES = {
    "carrier": 5,
    "battleship": 4,
    "cruiser": 3,
    "submarine": 3,
    "destroyer": 2
}
ALL_SHIP_TYPES = set(SHIP_SIZES.keys())


class ShipPlacement(BaseModel):
    type: str = Field(
        ...,
        description="carrier/battleship/cruiser/submarine/destroyer"
    )
    x: int = Field(..., ge=0, le=GRID_SIZE - 1)
    y: int = Field(..., ge=0, le=GRID_SIZE - 1)
    horizontal: bool = Field(..., description="True=horizontal, False=vertical")


class PlayerBoard(BaseModel):
    ships: List[ShipPlacement]
    shots: List[List[int]]  # List of [x,y] guesses by opponent


class BattleshipGameState(BaseModel):
    id: UUID
    player1_id: int
    player2_id: Optional[int]
    boards: Dict[str, PlayerBoard]  # key = player_id
    turn: int  # user id for current turn
    winner: Optional[int]
    started: bool
    finished: bool
    created_at: datetime
    replay: List[Dict[str, Any]]  # log of moves

    def other_player_id(self, uid: int) -> int:
        return self.player2_id if self.player1_id == uid else self.player1_id


class CreateGameRoomRequest(BaseModel):
    quick_match: bool = False


class JoinGameRoomRequest(BaseModel):
    room_code: str


class GameRoomInfo(BaseModel):
    id: UUID
    code: str
    player_ids: List[int]
    started: bool
    finished: bool
    winner: Optional[int]


@app.get("/", tags=["health"])
def health_check():
    """
    Health check endpoint.
    """
    return {"message": "Healthy"}


@app.post("/auth/signup", response_model=Token, tags=["auth"], summary="Register new user")
async def signup(user: UserCreate):
    """
    Register a new user.
    """
    async with db_pool.acquire() as conn:
        exists = await conn.fetchval("SELECT COUNT(*) FROM users WHERE username=$1", user.username)
        if exists:
            raise HTTPException(status_code=409, detail="Username already exists")
        pw_hash = hash_password(user.password)
        await conn.fetchrow(
            "INSERT INTO users (username, password_hash, created_at) "
            "VALUES ($1, $2, now()) RETURNING id,username, password_hash, win_count, loss_count, created_at",
            user.username, pw_hash
        )
    access_token = create_access_token({"sub": user.username})
    return Token(access_token=access_token, token_type="bearer")


@app.post("/auth/login", response_model=Token, tags=["auth"], summary="User login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    """
    Login as existing user.
    """
    user_row = await db_pool.fetchrow("SELECT * FROM users WHERE username=$1", form.username)
    if not user_row or not verify_password(form.password, user_row['password_hash']):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token({"sub": form.username})
    return Token(access_token=access_token, token_type="bearer")


@app.get("/auth/me", response_model=UserInDB, tags=["auth"], summary="Get current user")
async def me(current_user: UserInDB = Depends(get_current_user)):
    """
    Get details for the logged in user.
    """
    return current_user


@app.post("/game/create", response_model=GameRoomInfo, tags=["game"], summary="Create a new game room")
async def create_game(req: CreateGameRoomRequest, current_user: UserInDB = Depends(get_current_user)):
    """
    Create a multiplayer game room or enter quick matchmaking.
    """
    game_id = uuid4()
    room_code = secrets.token_hex(3)
    async with db_pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO game_rooms (id, code, player1_id, created_at) VALUES ($1, $2, $3, now())",
            str(game_id), room_code, current_user.id
        )
    game_state = BattleshipGameState(
        id=game_id,
        player1_id=current_user.id,
        player2_id=None,
        boards={},
        turn=current_user.id,
        winner=None,
        started=False,
        finished=False,
        created_at=datetime.utcnow(),
        replay=[]
    )
    await redis.set(f"game:{game_id}:state", game_state.model_dump_json())
    return GameRoomInfo(
        id=game_id, code=room_code,
        player_ids=[current_user.id], started=False, finished=False, winner=None
    )


@app.post("/game/join", response_model=GameRoomInfo, tags=["game"], summary="Join a game room by code")
async def join_game(req: JoinGameRoomRequest, current_user: UserInDB = Depends(get_current_user)):
    """
    Join an existing game room via room code.
    """
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM game_rooms WHERE code=$1",
            req.room_code
        )
        if not row or row['player2_id']:
            raise HTTPException(
                status_code=404,
                detail="Room not found or game already started"
            )
        await conn.execute(
            "UPDATE game_rooms SET player2_id=$1, started_at=now() WHERE code=$2",
            current_user.id, req.room_code
        )
        game_id = UUID(row['id'])
        state_raw = await redis.get(f"game:{game_id}:state")
        if not state_raw:
            raise HTTPException(status_code=500, detail="Corrupt room state")
        game_state = BattleshipGameState.parse_raw(state_raw)
        game_state.player2_id = current_user.id
        await redis.set(f"game:{game_id}:state", game_state.model_dump_json())
    return GameRoomInfo(
        id=game_state.id,
        code=req.room_code,
        player_ids=[game_state.player1_id, current_user.id],
        started=False,
        finished=False,
        winner=None
    )


@app.get("/game/{room_code}", response_model=GameRoomInfo, tags=["game"], summary="Get game room info by code")
async def get_room(room_code: str, current_user: UserInDB = Depends(get_current_user)):
    """
    Get details of a game by room code.
    """
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM game_rooms WHERE code=$1", room_code)
        if not row:
            raise HTTPException(status_code=404, detail="Room not found")
        return GameRoomInfo(
            id=UUID(row['id']),
            code=row['code'],
            player_ids=[row['player1_id']] + ([row['player2_id']] if row['player2_id'] else []),
            started=(row['started_at'] is not None),
            finished=(row['ended_at'] is not None),
            winner=row['winner_id']
        )


class ShipPlacementBody(BaseModel):
    ships: List[ShipPlacement]


@app.post("/game/{room_code}/place", tags=["game"], summary="Place ships (start of game)")
async def place_ships(room_code: str, body: ShipPlacementBody, current_user: UserInDB = Depends(get_current_user)):
    """
    Place ships for the current game before first move.
    """
    types = set(ship.type for ship in body.ships)
    if types != ALL_SHIP_TYPES:
        raise HTTPException(status_code=400, detail="All ships required")
    if len(body.ships) != len(ALL_SHIP_TYPES):
        raise HTTPException(status_code=400, detail="Duplicate ships found")
    if not check_ship_placement(body.ships):
        raise HTTPException(status_code=400, detail="Overlapping/invalid placement detected")
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM game_rooms WHERE code=$1", room_code)
        if not row or (
            current_user.id not in [row['player1_id'], row['player2_id']]
        ):
            raise HTTPException(
                status_code=404,
                detail="Room not found or unauthorized"
            )
        game_id = UUID(row['id'])
    state_raw = await redis.get(f"game:{game_id}:state")
    if not state_raw:
        raise HTTPException(status_code=404, detail="Game state not found")
    gs = BattleshipGameState.parse_raw(state_raw)
    player_id_str = str(current_user.id)
    if player_id_str not in gs.boards:
        gs.boards[player_id_str] = PlayerBoard(ships=body.ships, shots=[])
    else:
        raise HTTPException(status_code=409, detail="Ships already placed")
    if gs.player1_id and gs.player2_id and str(gs.player2_id) in gs.boards:
        gs.started = True
    await redis.set(f"game:{game_id}:state", gs.model_dump_json())
    await redis.publish(
        f"game:{game_id}:events",
        json.dumps({"event": "ships_placed", "by": current_user.id})
    )
    return {"result": "ok"}


class FireBody(BaseModel):
    x: int
    y: int


@app.post("/game/{room_code}/fire", tags=["game"], summary="Take a turn (fire at grid)")
async def fire(room_code: str, body: FireBody, current_user: UserInDB = Depends(get_current_user)):
    """
    Take a turn in this game by firing at a grid position.
    """
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM game_rooms WHERE code=$1", room_code)
        if not row or (
            current_user.id not in [row['player1_id'], row['player2_id']]
        ):
            raise HTTPException(
                status_code=404,
                detail="Game room not found or unauthorized"
            )
        game_id = UUID(row['id'])
    state_raw = await redis.get(f"game:{game_id}:state")
    if not state_raw:
        raise HTTPException(status_code=404, detail="Game not found or not setup")
    gs = BattleshipGameState.parse_raw(state_raw)
    if not gs.started or gs.finished:
        raise HTTPException(status_code=409, detail="Game not started/finished")
    if gs.turn != current_user.id:
        raise HTTPException(status_code=409, detail="Not your turn")
    opp_id = gs.other_player_id(current_user.id)
    opp_id_str = str(opp_id)
    if opp_id_str not in gs.boards:
        raise HTTPException(status_code=409, detail="Opponent not ready yet")
    if [body.x, body.y] in gs.boards[opp_id_str].shots:
        raise HTTPException(status_code=409, detail="Already fired here")
    gs.replay.append(
        {
            "turn": current_user.id,
            "type": "fire",
            "x": body.x,
            "y": body.y,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    gs.boards[opp_id_str].shots.append([body.x, body.y])
    hit = check_for_hit(gs.boards[opp_id_str].ships, body.x, body.y)
    if hit:
        sunk_ship = all_ship_sunk(
            gs.boards[opp_id_str].ships, gs.boards[opp_id_str].shots
        )
        if sunk_ship:
            gs.finished = True
            gs.winner = current_user.id
            await update_win_loss(current_user.id, opp_id)
            await set_game_result(game_id, current_user.id, opp_id)
            await redis.publish(
                f"game:{game_id}:events",
                json.dumps(
                    {
                        "event": "game_over",
                        "winner": current_user.id,
                        "move": {
                            "x": body.x,
                            "y": body.y,
                            "hit": True,
                            "sunk": True
                        }
                    }
                )
            )
            await redis.set(f"game:{game_id}:state", gs.model_dump_json())
            return {"result": "win", "hit": True, "sunk": True}
    gs.turn = opp_id
    await redis.set(f"game:{game_id}:state", gs.model_dump_json())
    await redis.publish(
        f"game:{game_id}:events",
        json.dumps(
            {
                "event": "turn",
                "by": current_user.id,
                "move": {"x": body.x, "y": body.y, "hit": hit}
            }
        )
    )
    return {"result": "ok", "hit": hit}


@app.get("/leaderboard", tags=["leaderboard"], summary="List top players")
async def leaderboard():
    """
    See the leaderboard (top players).
    """
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT username, win_count, loss_count FROM users "
            "ORDER BY win_count DESC, loss_count ASC, created_at ASC LIMIT 20"
        )
        return [
            {
                "username": r['username'],
                "wins": r['win_count'],
                "losses": r['loss_count']
            }
            for r in rows
        ]


@app.get("/games/me", tags=["leaderboard"], summary="List past played games")
async def my_games(current_user: UserInDB = Depends(get_current_user)):
    """
    List user's played games.
    """
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, player1_id, player2_id, winner_id, started_at, ended_at "
            "FROM game_rooms WHERE player1_id = $1 OR player2_id=$1 "
            "ORDER BY ended_at DESC NULLS LAST, started_at DESC LIMIT 20",
            current_user.id
        )
        return [
            {
                "id": r['id'],
                "player1": r['player1_id'],
                "player2": r['player2_id'],
                "winner": r['winner_id'],
                "started": r['started_at'],
                "ended": r['ended_at']
            }
            for r in rows
        ]


@app.get("/games/{game_id}/replay", tags=["leaderboard"], summary="Replay a finished game")
async def replay(game_id: UUID, current_user: UserInDB = Depends(get_current_user)):
    """
    Replay a completed game.
    """
    state_raw = await redis.get(f"game:{game_id}:state")
    if not state_raw:
        raise HTTPException(status_code=404, detail="Not found")
    gs = BattleshipGameState.parse_raw(state_raw)
    if not gs.finished:
        raise HTTPException(status_code=409, detail="Game not finished yet")
    return {"id": str(gs.id), "replay": gs.replay}


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.active_connections:
            if websocket in self.active_connections[game_id]:
                self.active_connections[game_id].remove(websocket)

    async def broadcast(self, game_id: str, message: str):
        if game_id in self.active_connections:
            for ws in self.active_connections[game_id]:
                await ws.send_text(message)


manager = ConnectionManager()


@app.websocket("/ws/game/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    """
    WebSocket endpoint for receiving and sending real-time game events.
    Connect and receive events as text.
    """
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM game_rooms WHERE code=$1", room_code)
        if not row:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        game_id = row["id"]
    await manager.connect(game_id, websocket)
    try:
        pubsub = redis.pubsub()
        channel = f"game:{game_id}:events"
        await pubsub.subscribe(channel)
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=10)
            if message is not None and message['type'] == 'message':
                await websocket.send_text(message['data'])
            try:
                await websocket.receive_text()
            except asyncio.TimeoutError:
                continue
            except WebSocketDisconnect:
                break
    except Exception:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        manager.disconnect(game_id, websocket)


def check_ship_placement(ships: List[ShipPlacement]) -> bool:
    """Validate no overlap, stay in bounds."""
    grid = [[0] * GRID_SIZE for _ in range(GRID_SIZE)]
    for ship in ships:
        size = SHIP_SIZES[ship.type]
        x, y = ship.x, ship.y
        for i in range(size):
            xi = x + i if ship.horizontal else x
            yi = y if ship.horizontal else y + i
            if xi >= GRID_SIZE or yi >= GRID_SIZE or grid[xi][yi]:
                return False
            grid[xi][yi] = 1
    return True


def check_for_hit(ships: List[ShipPlacement], x: int, y: int) -> bool:
    """Is this cell a hit?"""
    for ship in ships:
        size = SHIP_SIZES[ship.type]
        for i in range(size):
            xi = ship.x + i if ship.horizontal else ship.x
            yi = ship.y if ship.horizontal else ship.y + i
            if xi == x and yi == y:
                return True
    return False


def all_ship_sunk(ships: List[ShipPlacement], shots: List[List[int]]) -> bool:
    """All ships sunk?"""
    occupied = set()
    for ship in ships:
        size = SHIP_SIZES[ship.type]
        for i in range(size):
            xi = ship.x + i if ship.horizontal else ship.x
            yi = ship.y if ship.horizontal else ship.y + i
            occupied.add((xi, yi))
    shot_set = set(tuple(s) for s in shots)
    return occupied.issubset(shot_set)


async def update_win_loss(winner_id: int, loser_id: int):
    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET win_count = win_count + 1 WHERE id=$1",
            winner_id
        )
        await conn.execute(
            "UPDATE users SET loss_count = loss_count + 1 WHERE id=$1",
            loser_id
        )


async def set_game_result(game_id: UUID, winner_id: int, loser_id: int):
    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE game_rooms SET winner_id=$1, ended_at=now() WHERE id=$2",
            winner_id, str(game_id)
        )


async def ensure_tables(conn):
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            win_count INTEGER DEFAULT 0,
            loss_count INTEGER DEFAULT 0,
            created_at TIMESTAMP NOT NULL
        );
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS game_rooms (
            id UUID PRIMARY KEY,
            code TEXT NOT NULL,
            player1_id INTEGER REFERENCES users(id),
            player2_id INTEGER REFERENCES users(id),
            winner_id INTEGER REFERENCES users(id),
            started_at TIMESTAMP,
            ended_at TIMESTAMP,
            created_at TIMESTAMP
        );
        """
    )


@app.get("/docs/ws", tags=["ws"])
async def websocket_api_docs():
    """WebSocket usage documentation."""
    return JSONResponse(
        content={
            "endpoint": "/ws/game/{room_code}",
            "description": (
                "Connect with WebSocket to receive real-time game events "
                "for a given game room. Use token as part of REST auth for "
                "relevant REST actions."
            ),
            "sample": "ws://<host>/ws/game/ROOM_CODE"
        }
    )
