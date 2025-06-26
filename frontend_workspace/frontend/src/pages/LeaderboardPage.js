import React from "react";

// PUBLIC_INTERFACE
/**
 * Leaderboard of top players.
 */
function LeaderboardPage({ scores }) {
  return (
    <div className="container">
      <h2>Leaderboard</h2>
      <table className="leaderboard">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Wins</th>
            <th>Losses</th>
          </tr>
        </thead>
        <tbody>
          {scores && scores.length > 0 ? scores.map((s, idx) => (
            <tr key={s.username}>
              <td>{idx + 1}</td>
              <td>{s.username}</td>
              <td>{s.wins}</td>
              <td>{s.losses}</td>
            </tr>
          )) : <tr><td colSpan={4}>No records found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
export default LeaderboardPage;
