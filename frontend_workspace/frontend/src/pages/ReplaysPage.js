import React from "react";

// PUBLIC_INTERFACE
/**
 * View and replay past games.
 */
function ReplaysPage({ replays, onViewReplay }) {
  return (
    <div className="container">
      <h2>Replays</h2>
      {(!replays || replays.length === 0) ? (
        <p>No replays available.</p>
      ) : (
        <ul>
          {replays.map((replay) => (
            <li key={replay.game_id}>
              Game #{replay.game_id} - {replay.status}
              <button className="btn" onClick={() => onViewReplay(replay.game_id)}>
                View Replay
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default ReplaysPage;
