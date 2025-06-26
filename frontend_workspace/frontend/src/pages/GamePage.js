import React from "react";
import BattleshipBoard from "../components/BattleshipBoard";

// PUBLIC_INTERFACE
/**
 * GamePage - displays player board, opponent board, and handles in-game status.
 */
function GamePage({ boards, onFire, myTurn, status, onExit, disabled }) {
  // boards: {player: 10x10, opponent: 10x10}
  return (
    <div className="game-container">
      <div className="grids">
        <div>
          <h4>Your Board</h4>
          <BattleshipBoard grid={boards.player} disabled />
        </div>
        <div>
          <h4>Opponent</h4>
          <BattleshipBoard grid={boards.opponent} isOpponent onCellClick={onFire} disabled={disabled || !myTurn} />
        </div>
      </div>
      <div className="game-status">
        <h5>Status:</h5>
        <p>{status}</p>
        <button className="btn" onClick={onExit}>Exit to Lobby</button>
      </div>
    </div>
  );
}
export default GamePage;
