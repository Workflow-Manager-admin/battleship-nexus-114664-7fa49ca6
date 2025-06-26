import { useState, useEffect } from "react";
import jwtDecode from "jwt-decode";
import { setToken, clearToken, getProfile } from "../services/api";

// PUBLIC_INTERFACE
/**
 * React hook to manage authentication (JWT-based).
 */
export function useAuth() {
  const [token, setTokenState] = useState(() => localStorage.getItem("jwt") || "");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (token) {
      setToken(token);
      localStorage.setItem("jwt", token);
      // Optionally fetch profile here
      getProfile()
        .then((data) => setProfile(data))
        .catch(() => setProfile(null));
    } else {
      clearToken();
      setProfile(null);
      localStorage.removeItem("jwt");
    }
  }, [token]);

  const login = (tok) => setTokenState(tok);
  const logout = () => setTokenState("");

  const username = profile?.username || (token ? jwtDecode(token).sub : null);

  return { token, login, logout, username, isAuthenticated: !!token, profile };
}
