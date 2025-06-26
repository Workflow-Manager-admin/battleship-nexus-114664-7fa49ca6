import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";

import "./App.css";
import Navbar from "./components/Navbar";
import ThemeToggle from "./components/ThemeToggle";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ReplaysPage from "./pages/ReplaysPage";
import ProfilePage from "./pages/ProfilePage";
import { useAuth } from "./hooks/useAuth";
import * as api from "./services/api";
import { BattleshipWebSocket } from "./services/websocket";
import { createEmptyBoard, applyShots } from "./utils/board";

/**
 * Central App for Battleship.
 * Handles global state, routing, theme, game, authentication, and WebSocket play.
 */
function App() {
  // Theme state
  const [theme, setTheme] = useState("dark");
  // Auth state
  const { token, login, logout, username, isAuthenticated } = useAuth();
  // Page-level error/feedback messages
  const [error, setError] = useState("");
  // Lobby join code input for user
  const [joinRoomCode, setJoinRoomCode] = useState("");
  // In-game state
  const [inGame, setInGame] = useState(false);
  const [boards, setBoards] = useState({
    player: createEmptyBoard(),
    opponent: createEmptyBoard(),
  });
  const [myTurn, setMyTurn] = useState(false);
  const [gameStatus, setGameStatus] = useState("");
  const [ws, setWs] = useState(null);

  // Leaderboard, replays, etc
  const [leaderboard, setLeaderboard] = useState([]);
  const [replays, setReplays] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Auth - login handler
  async function handleLogin(username, password) {
    setError("");
    try {
      const res = await api.login(username, password);
      login(res.access_token);
    } catch (e) {
      setError(e?.response?.data?.detail || "Login failed");
    }
  }

  // Auth - signup
  async function handleSignup(username, password) {
    setError("");
    try {
      const res = await api.signup(username, password);
      login(res.access_token);
    } catch (e) {
      setError(e?.response?.data?.detail || "Signup failed");
    }
  }

  // Auth - logout
  function handleLogout() {
    logout();
    setInGame(false);
    setBoards({
      player: createEmptyBoard(),
      opponent: createEmptyBoard(),
    });
    if (ws) ws.close();
    setWs(null);
  }

  // Lobby - create room
  async function handleCreateRoom() {
    setError("");
    try {
      const { room_code, board } = await api.createRoom();
      joinGameRoom(room_code, board);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to create room");
    }
  }

  async function handleJoinRoom(code) {
    setError("");
    try {
      const { board } = await api.joinRoom(code);
      joinGameRoom(code, board);
    } catch (e) {
      setError(e?.response?.data?.detail || "Join room failed");
    }
  }

  // Game join/setup
  function joinGameRoom(roomCode, initialBoard) {
    setInGame(true);
    setBoards({
      player: initialBoard ? initialBoard : createEmptyBoard(),
      opponent: createEmptyBoard(),
    });
    // Setup WS for room
    if (ws) ws.close();
    const socket = new BattleshipWebSocket(token, handleWsMessage, roomCode);
    setWs(socket);
    setGameStatus("Waiting for opponent...");
  }

  // WebSocket play event handler
  function handleWsMessage(data) {
    // Expected shape: { turn: <user>, boards: {...}, result: 'hit/miss/win/loss', message? }
    if (data.boards) {
      setBoards(data.boards);
    }
    if (data.turn && username)
      setMyTurn(data.turn === username);
    if (data.result) {
      setGameStatus(data.result);
      if (["win", "loss"].includes(data.result)) {
        setTimeout(() => setInGame(false), 3000); // Auto-exit after 3s
        if (ws) ws.close();
      }
    }
    if (data.message) setGameStatus(data.message);
  }

  // Player fires on opponent board
  function handleFire(r, c) {
    if (ws) ws.send({ action: "fire", row: r, col: c });
  }

  // Game exit
  function handleExitGame() {
    setInGame(false);
    setBoards({
      player: createEmptyBoard(),
      opponent: createEmptyBoard(),
    });
    if (ws) ws.close();
    setWs(null);
  }

  // Load leaderboard/replays
  useEffect(() => {
    if (isAuthenticated) {
      api.getLeaderboard().then(setLeaderboard).catch(() => {});
      api.getReplays().then(setReplays).catch(() => {});
    }
  }, [isAuthenticated]);

  // Theming
  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));

  return (
    <Router>
      <div className="App">
        <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/lobby" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/lobby" />
              ) : (
                <LoginPage onLogin={handleLogin} error={error} />
              )
            }
          />
          <Route
            path="/signup"
            element={
              isAuthenticated ? (
                <Navigate to="/lobby" />
              ) : (
                <SignupPage onSignup={handleSignup} error={error} />
              )
            }
          />
          <Route
            path="/lobby"
            element={
              isAuthenticated ? (
                <LobbyPage
                  onCreateRoom={handleCreateRoom}
                  onJoinRoom={handleJoinRoom}
                  joinRoomCode={joinRoomCode}
                  setJoinRoomCode={setJoinRoomCode}
                  error={error}
                  username={username}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/game"
            element={
              isAuthenticated && inGame ? (
                <GamePage
                  boards={boards}
                  onFire={handleFire}
                  myTurn={myTurn}
                  status={gameStatus}
                  onExit={handleExitGame}
                  disabled={!myTurn}
                />
              ) : (
                <Navigate to="/lobby" />
              )
            }
          />
          <Route
            path="/leaderboard"
            element={
              isAuthenticated ? (
                <LeaderboardPage scores={leaderboard} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/replays"
            element={
              isAuthenticated ? (
                <ReplaysPage replays={replays} onViewReplay={() => {}} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/profile"
            element={
              isAuthenticated ? (
                <ProfilePage username={username} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
