import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

// PUBLIC_INTERFACE
/**
 * Simple, minimalistic navbar for navigation between pages.
 */
export default function Navbar({ isAuthenticated, onLogout }) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">Battleship</div>
      <div className="navbar-links">
        {isAuthenticated && (
          <>
            <Link to="/lobby" className={location.pathname === "/lobby" ? "active" : ""}>Lobby</Link>
            <Link to="/leaderboard" className={location.pathname === "/leaderboard" ? "active" : ""}>Leaderboard</Link>
            <Link to="/replays" className={location.pathname === "/replays" ? "active" : ""}>Replays</Link>
            <Link to="/profile" className={location.pathname === "/profile" ? "active" : ""}>Profile</Link>
            <button className="btn btn-logout" onClick={onLogout}>Logout</button>
          </>
        )}
        {!isAuthenticated && (
          <>
            <Link to="/login" className={location.pathname === "/login" ? "active" : ""}>Login</Link>
            <Link to="/signup" className={location.pathname === "/signup" ? "active" : ""}>Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
}
