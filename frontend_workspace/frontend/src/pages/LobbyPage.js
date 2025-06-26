import React from "react";

// PUBLIC_INTERFACE
/**
 * Lobby for matchmaking, creating/joining rooms.
 */
function LobbyPage({ onCreateRoom, onJoinRoom, joinRoomCode, setJoinRoomCode, error, username }) {
  return (
    <div className="container">
      <h2>Lobby</h2>
      <div>
        <button className="btn" onClick={onCreateRoom}>Create New Room</button>
      </div>
      <div>
        <form onSubmit={e => {e.preventDefault(); onJoinRoom(joinRoomCode);}}>
          <input
            type="text"
            placeholder="Enter Room Code"
            value={joinRoomCode}
            onChange={e => setJoinRoomCode(e.target.value)}
            maxLength={10}
            required
          />
          <button className="btn" type="submit">Join Room</button>
        </form>
      </div>
      {error && <p className="error">{error}</p>}
      <p className="subtitle">Logged in as <b>{username}</b></p>
    </div>
  );
}
export default LobbyPage;
