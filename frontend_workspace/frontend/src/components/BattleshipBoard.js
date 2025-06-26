/**
 * BattleshipBoard.js -- interactive 10x10 grid board.
 * Handles placement, firing, and board state rendering.
 */
import React from "react";
import "./BattleshipBoard.css";

// PUBLIC_INTERFACE
/** 
 * Renders a Battleship board, can be used for both player and opponent.
 * @param {Object} props
 * @param {Array} props.grid - 2D array [row][col] of cells {'empty','ship','hit','miss'}
 * @param {Function} [props.onCellClick] - callback for cell clicks (col, row)
 * @param {Boolean} [props.isOpponent] - if true, don't show ships
 * @param {Boolean} [props.disabled] - disables interaction
 */
function BattleshipBoard({ grid, onCellClick, isOpponent, disabled }) {
  return (
    <div className="battleship-board">
      {grid.map((row, rIdx) => (
        <div key={rIdx} className="board-row">
          {row.map((cell, cIdx) => (
            <div
              key={cIdx}
              className={
                "board-cell " +
                (cell === "hit"
                  ? "hit"
                  : cell === "miss"
                  ? "miss"
                  : cell === "ship" && !isOpponent
                  ? "ship"
                  : "")
              }
              onClick={() => !disabled && onCellClick && onCellClick(rIdx, cIdx)}
              style={{ cursor: disabled || !onCellClick ? "default" : "pointer" }}
              data-testid={`cell-${rIdx}-${cIdx}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default BattleshipBoard;
