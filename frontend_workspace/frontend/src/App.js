import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./App.css";

// --- Theming ---
const themeColors = {
  primary: "#1976d2",
  secondary: "#424242",
  accent: "#ff9800",
};

// --- API Endpoints ---
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";
const WS_BASE = process.env.REACT_APP_WS_BASE || "ws://localhost:3001/ws";

// --- Contexts for Auth and Game State ---
const AuthContext = React.createContext();
const GameContext = React.createContext();

function setDarkTheme() {
  document.documentElement.setAttribute("data-theme", "dark");
}

// --------- API Helpers ----------
async function apiRequest(path, method = "GET", body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}

// --------- Auth Components ----------

// PUBLIC_INTERFACE
function LoginSignupScreen() {
  const { setUser, token, setToken } = React.useContext(AuthContext);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (token) navigate("/lobby");
    // eslint-disable-next-line
  }, [token]);

  // PUBLIC_INTERFACE
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
      const res = await apiRequest(endpoint, "POST", form);
      setToken(res.token);
      setUser(res.user);
      navigate("/lobby");
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h2 style={{ color: themeColors.primary, fontWeight: 700 }}>Battleship</h2>
        <div className="tab-switcher">
          <button
            className={mode === "login" ? "tab-selected" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "tab-selected" : ""}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            required
            placeholder="Username"
            autoComplete="username"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            disabled={loading}
          />
          <input
            required
            placeholder="Password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            disabled={loading}
          />
          {error && <div className="error-msg">{error}</div>}
          <button
            className="btn-accent"
            style={{ marginTop: 16 }}
            disabled={loading}
            type="submit"
          >
            {loading ? "Loading..." : mode === "signup" ? "Sign Up" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --------- Lobby / Matchmaking ----------

// PUBLIC_INTERFACE
function LobbyScreen() {
  const { user, token, logout } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [joinErr, setJoinErr] = useState("");
  const [loading, setLoading] = useState(false);

  // PUBLIC_INTERFACE
  useEffect(() => {
    let active = true;
    async function fetchRooms() {
      try {
        setRooms(await apiRequest("/rooms", "GET", undefined, token));
      } catch {
        setRooms([]);
      }
    }
    fetchRooms();
    return () => {
      active = false;
    };
  }, [token]);

  // PUBLIC_INTERFACE
  async function handleJoinRoom(e) {
    e.preventDefault();
    setJoinErr("");
    setLoading(true);
    try {
      const res = await apiRequest(`/rooms/join`, "POST", { room_code: roomCode }, token);
      navigate(`/game/${res.room_id}`);
    } catch (e) {
      setJoinErr("Invalid code or join error.");
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function handleQuickMatch() {
    setJoinErr("");
    setLoading(true);
    try {
      const res = await apiRequest("/rooms/quick-match", "POST", undefined, token);
      navigate(`/game/${res.room_id}`);
    } catch {
      setJoinErr("Failed to join match.");
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function handleCreateRoom() {
    setJoinErr("");
    setLoading(true);
    try {
      const res = await apiRequest("/rooms/create", "POST", undefined, token);
      navigate(`/game/${res.room_id}`);
    } catch {
      setJoinErr("Error creating room.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lobby-screen">
      <header className="lobby-header">
        <div>
          <span className="user-avatar">{user?.username?.[0]?.toUpperCase()}</span>
          <span style={{ marginLeft: 8 }}>{user?.username}</span>
        </div>
        <button onClick={logout} style={{ float: "right" }} className="btn-secondary">
          Log out
        </button>
      </header>
      <div style={{ margin: "32px auto", maxWidth: 400 }}>
        <h2>Lobby</h2>
        <form className="joinroom" onSubmit={handleJoinRoom} style={{ marginBottom: 16 }}>
          <input
            placeholder="Enter room code"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            Join
          </button>
        </form>
        <button
          className="btn-accent"
          onClick={handleQuickMatch}
          disabled={loading}
          style={{ width: "100%" }}
        >
          {loading ? "Matching..." : "Join Quick Match"}
        </button>
        <button
          className="btn-primary"
          onClick={handleCreateRoom}
          disabled={loading}
          style={{ width: "100%", marginTop: 8 }}
        >
          Create New Room
        </button>
        {joinErr && <div className="error-msg" style={{ marginTop: 16 }}>{joinErr}</div>}
        <div className="divider" />
        <button onClick={() => navigate("/leaderboard")} className="btn-secondary">
          View Leaderboard
        </button>
        <button onClick={() => navigate("/replays")} className="btn-secondary">
          Past Games & Replays
        </button>
      </div>
      <footer className="footer-lobby">Battleship Multiplayer ({user?.username})</footer>
    </div>
  );
}

// --------- Game Screen ----------

// Basic Ships Array for grid placement
const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

// PUBLIC_INTERFACE
function GameScreen() {
  const { user, token } = React.useContext(AuthContext);
  const [game, setGame] = useState(null);
  const [ws, setWs] = useState(null);
  const [myBoard, setMyBoard] = useState(createEmptyBoard());
  const [opBoard, setOpBoard] = useState(createEmptyBoard());
  const [placing, setPlacing] = useState({ ship: 0, direction: "horizontal" });
  const [myTurn, setMyTurn] = useState(false);
  const [status, setStatus] = useState("setup"); // setup, playing, won, lost, waiting, etc
  const [winner, setWinner] = useState(null);
  const navigate = useNavigate();
  const params = window.location.pathname.split("/");
  const roomId = params[params.length - 1];

  // Initial game info fetch + WebSocket connection
  useEffect(() => {
    setDarkTheme();

    let wsClient;
    async function init() {
      try {
        // Fetch initial game state from backend REST
        let gameState = await apiRequest(`/rooms/${roomId}`, "GET", undefined, token);
        setGame(gameState);
        setStatus(gameState.status);

        // WebSocket connection
        wsClient = new window.WebSocket(`${WS_BASE}/game/${roomId}?token=${token}`);
        wsClient.onopen = () => {
          // Optionally: wsClient.send(JSON.stringify({ type: "hello", user: user.username }));
        };
        wsClient.onmessage = (ev) => {
          const data = JSON.parse(ev.data);
          // Handle various push updates
          if (data.type === "state") {
            setGame(data.game);
            setStatus(data.game.status);
            setMyTurn(data.game.current_turn === user.username);
            setWinner(data.game.winner);
          } else if (data.type === "move") {
            // Board update is handled by refetching or from payload
            if (data.meBoard) setMyBoard(data.meBoard);
            if (data.opponentBoard) setOpBoard(data.opponentBoard);
          } else if (data.type === "end") {
            setWinner(data.winner);
            setStatus("ended");
          }
        };
        setWs(wsClient);
      } catch (err) {
        navigate("/lobby");
      }
    }
    init();
    return () => {
      if (wsClient) wsClient.close();
    };
    // eslint-disable-next-line
  }, [roomId, token]);

  // --- Ship Placement Logic ---
  function handleCellClick(x, y) {
    if (status !== "setup") return;
    const ship = SHIPS[placing.ship];
    if (!ship) return;
    const board = placeShipOnBoard(myBoard, ship.size, x, y, placing.direction);
    if (board) setMyBoard(board);
  }

  function nextShip() {
    setPlacing(p => ({ ...p, ship: p.ship + 1 }));
  }

  // When finished placing all ships, send to backend to start game
  async function handleReady() {
    await apiRequest(`/rooms/${roomId}/place`, "POST", { board: myBoard }, token);
    setStatus("waiting");
    if (ws) ws.send(JSON.stringify({ type: "ready" }));
  }

  // --- Handle player move (fire shot) ---
  async function handleOpponentCellClick(x, y) {
    if (!myTurn || status !== "playing") return;
    try {
      await apiRequest(`/rooms/${roomId}/move`, "POST", { x, y }, token);
      // Result handled via WebSocket update
    } catch (e) {
      // Error is minor; ignore for now
    }
  }

  function shipPlacementRemaining() {
    return placing.ship < SHIPS.length;
  }

  // --- Modal for win/loss state ---
  function WinLossModal() {
    if (!["won", "lost", "ended"].includes(status)) return null;
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <h2>
            {winner === user.username
              ? "You Won! 🎉"
              : winner
              ? "You Lost 😢"
              : "Game Over"}
          </h2>
          <button className="btn-accent" onClick={() => navigate("/lobby")}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="game-screen">
      <WinLossModal />
      <header className="game-header">
        <span className="game-name" style={{ color: themeColors.accent }}>
          Battleship Game
        </span>
        <button className="btn-secondary" onClick={() => navigate("/lobby")}>
          Lobby
        </button>
      </header>
      <div className="game-body">
        <section className="board-section">
          <h4 className="section-label">
            {status === "setup"
              ? "Your Board (Place Ships)"
              : "Your Board"}
          </h4>
          <BattleshipGrid
            board={myBoard}
            editable={status === "setup" && shipPlacementRemaining()}
            onClick={handleCellClick}
            highlightShip={shipPlacementRemaining() ? SHIPS[placing.ship] : null}
            highlightDir={placing.direction}
          />
          {status === "setup" && shipPlacementRemaining() && (
            <div className="placement-controls">
              <div>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setPlacing(p => ({
                      ...p,
                      direction: p.direction === "horizontal" ? "vertical" : "horizontal",
                    }))
                  }
                >
                  Rotate ({placing.direction})
                </button>
                <span style={{ marginLeft: 16 }}>
                  {SHIPS[placing.ship].name} ({SHIPS[placing.ship].size})
                </span>
                <button
                  className="btn-primary"
                  style={{ marginLeft: 12 }}
                  onClick={nextShip}
                  disabled={!canPlaceShip(myBoard, SHIPS[placing.ship], placing.direction)}
                >
                  Place & Next
                </button>
              </div>
              {placing.ship === SHIPS.length - 1 && (
                <button className="btn-accent" onClick={handleReady}>
                  Ready (All Ships Placed)
                </button>
              )}
            </div>
          )}
        </section>
        <section className="board-section">
          <h4 className="section-label">
            {status === "setup"
              ? "Opponent Board"
              : myTurn
              ? "Attack! (Your Turn)"
              : "Opponent's Turn"}
          </h4>
          <BattleshipGrid
            board={opBoard}
            editable={myTurn && status === "playing"}
            onClick={handleOpponentCellClick}
            opponent
          />
        </section>
        <section className="game-sidebar">
          <GameStatusPanel game={game} status={status} myTurn={myTurn} />
        </section>
      </div>
    </div>
  );
}

// -------- Game Grid/Boards ----------
function createEmptyBoard() {
  const board = [];
  for (let y = 0; y < 10; ++y) board.push(Array(10).fill(""));
  return board;
}

// Place ship logic for 10x10 grid
function placeShipOnBoard(board, size, x, y, dir) {
  const b = JSON.parse(JSON.stringify(board));
  // Check if placement is valid
  for (let i = 0; i < size; ++i) {
    const xi = dir === "horizontal" ? x + i : x;
    const yi = dir === "vertical" ? y + i : y;
    if (xi >= 10 || yi >= 10 || b[yi][xi]) return null;
  }
  // Place
  for (let i = 0; i < size; ++i) {
    const xi = dir === "horizontal" ? x + i : x;
    const yi = dir === "vertical" ? y + i : y;
    b[yi][xi] = "S";
  }
  return b;
}
function canPlaceShip(board, ship, dir) {
  // Basic check: at least one location is available
  for (let y = 0; y < 10; ++y)
    for (let x = 0; x < 10; ++x)
      if (placeShipOnBoard(board, ship.size, x, y, dir)) return true;
  return false;
}

// PUBLIC_INTERFACE
function BattleshipGrid({ board, editable, onClick, highlightShip, highlightDir, opponent }) {
  return (
    <div className="bship-grid">
      {board.map((row, y) =>
        row.map((cell, x) => {
          let cellClass = "bcell";
          if (cell === "H") cellClass += " hit";
          else if (cell === "M") cellClass += " miss";
          else if (cell === "S") cellClass += opponent ? "" : " ship";
          return (
            <div
              key={x + "" + y}
              className={cellClass}
              onClick={() => editable && onClick(x, y)}
              tabIndex={0}
              aria-label={opponent ? `Enemy cell ${x},${y}` : `Your cell ${x},${y}`}
            ></div>
          );
        })
      )}
    </div>
  );
}

// ------- Sidebar / Game Status -------
function GameStatusPanel({ game, status, myTurn }) {
  if (!game)
    return (
      <div className="status-panel">
        <div>Loading game ...</div>
      </div>
    );
  return (
    <div className="status-panel">
      <h4>Status</h4>
      <p>Room: <b>{game.room_code}</b></p>
      <p>
        Players:
        <br />
        {game.players?.map(p => (
          <span key={p}>
            <span className="user-avatar">{p[0]}</span> {p}
            <br />
          </span>
        ))}
      </p>
      <div>
        {status === "setup" && <span style={{ color: themeColors.primary }}>Place your ships...</span>}
        {status === "waiting" && <span style={{ color: themeColors.secondary }}>Waiting for opponent...</span>}
        {status === "playing" &&
          (myTurn ? <span style={{ color: themeColors.accent }}>Your turn!</span> : <span>Waiting for opponent...</span>)}
        {status === "ended" && <b>Game ended</b>}
      </div>
    </div>
  );
}

// --------- Leaderboard ----------

// PUBLIC_INTERFACE
function LeaderboardScreen() {
  const { token } = React.useContext(AuthContext);
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setData(await apiRequest("/stats/leaderboard", "GET", undefined, token));
      } catch {
        setData([]);
      }
    }
    fetchLeaderboard();
  }, [token]);

  return (
    <div className="leaderboard-page">
      <header>
        <h2>Leaderboard</h2>
      </header>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Wins</th>
            <th>Games</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.username}>
              <td>{i + 1}</td>
              <td>{row.username}</td>
              <td>{row.wins}</td>
              <td>{row.games}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --------- Replays / Past Games ----------

// PUBLIC_INTERFACE
function ReplaysScreen() {
  const { token } = React.useContext(AuthContext);
  const [games, setGames] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function fetchPast() {
      try {
        setGames(await apiRequest("/stats/past-games", "GET", undefined, token));
      } catch {
        setGames([]);
      }
    }
    fetchPast();
  }, [token]);

  return (
    <div className="replay-page">
      <header>
        <h2>Past Games & Replays</h2>
      </header>
      {!selected ? (
        <table className="replay-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Opponent</th>
              <th>Result</th>
              <th>Replay</th>
            </tr>
          </thead>
          <tbody>
            {games.map(row => (
              <tr key={row.game_id}>
                <td>{new Date(row.created_at).toLocaleString()}</td>
                <td>{row.opponent}</td>
                <td>
                  {row.result === "win"
                    ? "Win"
                    : row.result === "loss"
                    ? "Loss"
                    : row.result}
                </td>
                <td>
                  <button className="btn-secondary" onClick={() => setSelected(row)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ReplayViewer game={selected} goBack={() => setSelected(null)} />
      )}
    </div>
  );
}

function ReplayViewer({ game, goBack }) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState([]);
  useEffect(() => {
    // Fetch replay data from backend (moves, board states)
    async function fetchReplay() {
      try {
        const res = await apiRequest(`/stats/replay/${game.game_id}`);
        setHistory(res.moves || []);
      } catch {
        setHistory([]);
      }
    }
    fetchReplay();
  }, [game]);
  if (!history.length) return <div>Loading replay...</div>;
  const cur = history[step] || {};
  return (
    <div className="replay-viewer">
      <button className="btn-secondary" onClick={goBack}>
        ⬅ Back
      </button>
      <h3>Replay: {game.opponent} ({game.result})</h3>
      <div className="replay-boards">
        <BattleshipGrid board={cur.my_board || createEmptyBoard()} />
        <BattleshipGrid board={cur.opp_board || createEmptyBoard()} opponent />
      </div>
      <div>
        <button className="btn-secondary" disabled={step === 0} onClick={() => setStep(Math.max(step - 1, 0))}>Prev</button>
        <span style={{ margin: 8 }}>
          Step {step + 1} / {history.length}
        </span>
        <button className="btn-secondary" disabled={step === history.length - 1} onClick={() => setStep(Math.min(step + 1, history.length - 1))}>Next</button>
      </div>
    </div>
  );
}

// --------- Routing, Providers, Auth State ---------

// PUBLIC_INTERFACE
function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);
  // PUBLIC_INTERFACE
  const logout = () => {
    setToken("");
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ token, setToken, user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function RequireAuth({ children }) {
  const { token } = React.useContext(AuthContext);
  if (!token) return <Navigate to="/" />;
  return children;
}

// PUBLIC_INTERFACE
function App() {
  useEffect(() => setDarkTheme(), []);
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginSignupScreen />} />
          <Route path="/lobby" element={
            <RequireAuth>
              <LobbyScreen />
            </RequireAuth>
          } />
          <Route path="/game/:roomId" element={
            <RequireAuth>
              <GameScreen />
            </RequireAuth>
          } />
          <Route path="/leaderboard" element={
            <RequireAuth>
              <LeaderboardScreen />
            </RequireAuth>
          } />
          <Route path="/replays" element={
            <RequireAuth>
              <ReplaysScreen />
            </RequireAuth>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
