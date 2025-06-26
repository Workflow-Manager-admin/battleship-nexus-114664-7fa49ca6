// PUBLIC_INTERFACE
/**
 * API wrapper for REST endpoints.
 * Handles authentication, leaderboard, replays, game room management, etc.
 */
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

let token = null;
export function setToken(newToken) { token = newToken; }
export function clearToken() { token = null; }

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// PUBLIC_INTERFACE
export async function login(username, password) {
  const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
  token = res.data.access_token;
  return res.data;
}

// PUBLIC_INTERFACE
export async function signup(username, password) {
  const res = await axios.post(`${API_BASE}/auth/signup`, { username, password });
  token = res.data.access_token;
  return res.data;
}

// PUBLIC_INTERFACE
export async function getLeaderboard() {
  const res = await axios.get(`${API_BASE}/leaderboard`, { headers: authHeaders() });
  return res.data;
}

// PUBLIC_INTERFACE
export async function getReplays() {
  const res = await axios.get(`${API_BASE}/games/replays`, { headers: authHeaders() });
  return res.data;
}

// PUBLIC_INTERFACE
export async function getProfile() {
  const res = await axios.get(`${API_BASE}/auth/me`, { headers: authHeaders() });
  return res.data;
}

// PUBLIC_INTERFACE
export async function createRoom() {
  const res = await axios.post(`${API_BASE}/rooms/create`, {}, { headers: authHeaders() });
  return res.data; // {room_code, ...}
}

// PUBLIC_INTERFACE
export async function joinRoom(code) {
  const res = await axios.post(`${API_BASE}/rooms/join`, { code }, { headers: authHeaders() });
  return res.data;
}
