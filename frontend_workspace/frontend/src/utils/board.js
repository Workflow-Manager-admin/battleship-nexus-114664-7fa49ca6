/**
 * Utilities for rendering/validating 10x10 battleship grids.
 */

// PUBLIC_INTERFACE
export function createEmptyBoard() {
  return Array.from({ length: 10 }, () => Array(10).fill("empty"));
}

// PUBLIC_INTERFACE
export function applyShots(board, shots) {
  // shots: [{row, col, result: 'hit'|'miss'}]
  const out = board.map(row => [...row]);
  shots.forEach(({ row, col, result }) => {
    out[row][col] = result;
  });
  return out;
}
