export const BOARD_SIZE = 15;
export const WIN_LENGTH = 5;

export type Player = "human" | "machine";
export type Cell = Player | null;
export type Difficulty = "easy" | "medium" | "hard";

export type Position = {
  row: number;
  col: number;
};

export type Move = Position & {
  player: Player;
  moveNumber: number;
};

export type Winner = {
  player: Player;
  line: Position[];
};

export const difficulties: Array<{ value: Difficulty; label: string }> = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Vừa" },
  { value: "hard", label: "Khó" },
];

const directions: Position[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
];

const lineScores = [0, 6, 28, 160, 900, 12000];
const blockScores = [0, 4, 24, 140, 1050, 14000];

export function createEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(null));
}

export function isInside(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function hasAnyMove(board: Cell[][]): boolean {
  return board.some((row) => row.some(Boolean));
}

export function isBoardFull(board: Cell[][]): boolean {
  return board.every((row) => row.every(Boolean));
}

export function placeMove(board: Cell[][], move: Position, player: Player): Cell[][] {
  const nextBoard = board.slice();
  nextBoard[move.row] = board[move.row].slice();
  nextBoard[move.row][move.col] = player;
  return nextBoard;
}

export function findWinner(board: Cell[][]): Winner | null {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const player = board[row][col];
      if (!player) continue;

      for (const direction of directions) {
        const line = collectLine(board, { row, col }, direction, player);
        if (line.length >= WIN_LENGTH) {
          return { player, line: line.slice(0, WIN_LENGTH) };
        }
      }
    }
  }

  return null;
}

export function chooseMachineMove(board: Cell[][], difficulty: Difficulty): Position {
  if (!hasAnyMove(board)) {
    return { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
  }

  const candidates = getCandidateMoves(board);

  const winningMove = candidates.find((move) => wouldWin(board, move, "machine"));
  if (winningMove) return winningMove;

  const blockingMove = candidates.find((move) => wouldWin(board, move, "human"));
  if (blockingMove) return blockingMove;

  const scoredMoves = candidates
    .map((move) => ({
      move,
      score: scoreMove(board, move, "machine") + scoreMove(board, move, "human") * 0.9,
    }))
    .sort((a, b) => b.score - a.score);

  const poolSize = difficulty === "easy" ? 8 : difficulty === "medium" ? 4 : 2;
  const mistakeRate = difficulty === "easy" ? 0.35 : difficulty === "medium" ? 0.16 : 0.04;

  if (Math.random() < mistakeRate) {
    const pool = scoredMoves.slice(0, Math.min(poolSize, scoredMoves.length));
    return pool[Math.floor(Math.random() * pool.length)].move;
  }

  return scoredMoves[0].move;
}

export function getHintMove(board: Cell[][], difficulty: Difficulty): Position | null {
  if (findWinner(board) || isBoardFull(board)) return null;
  return chooseHumanHint(board, difficulty);
}

function chooseHumanHint(board: Cell[][], difficulty: Difficulty): Position {
  const candidates = getCandidateMoves(board);
  const winningMove = candidates.find((move) => wouldWin(board, move, "human"));
  if (winningMove) return winningMove;

  const blockingMove = candidates.find((move) => wouldWin(board, move, "machine"));
  if (blockingMove) return blockingMove;

  return candidates
    .map((move) => ({
      move,
      score:
        scoreMove(board, move, "human") +
        scoreMove(board, move, "machine") * (difficulty === "hard" ? 0.95 : 0.75),
    }))
    .sort((a, b) => b.score - a.score)[0].move;
}

function collectLine(board: Cell[][], start: Position, direction: Position, player: Player): Position[] {
  const line: Position[] = [];
  let row = start.row;
  let col = start.col;

  while (isInside(row, col) && board[row][col] === player) {
    line.push({ row, col });
    row += direction.row;
    col += direction.col;
  }

  return line;
}

function getCandidateMoves(board: Cell[][]): Position[] {
  const keyed = new Map<string, Position>();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!board[row][col]) continue;

      for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
        for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
          const nextRow = row + rowOffset;
          const nextCol = col + colOffset;
          if (!isInside(nextRow, nextCol) || board[nextRow][nextCol]) continue;
          keyed.set(`${nextRow}:${nextCol}`, { row: nextRow, col: nextCol });
        }
      }
    }
  }

  if (keyed.size === 0) {
    return [{ row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) }];
  }

  return [...keyed.values()];
}

function scoreMove(board: Cell[][], move: Position, player: Player): number {
  const scores = player === "machine" ? lineScores : blockScores;

  return directions.reduce((total, direction) => {
    const forward = countConsecutive(board, move, direction, player);
    const backward = countConsecutive(
      board,
      move,
      { row: -direction.row, col: -direction.col },
      player,
    );
    const openEnds =
      Number(isOpenEnd(board, move, direction, player)) +
      Number(isOpenEnd(board, move, { row: -direction.row, col: -direction.col }, player));
    const chain = Math.min(forward + backward + 1, WIN_LENGTH);

    if (chain >= WIN_LENGTH) return total + scores[WIN_LENGTH];
    return total + scores[chain] * (openEnds === 2 ? 1.4 : openEnds === 1 ? 1 : 0.35);
  }, 0);
}

function wouldWin(board: Cell[][], move: Position, player: Player): boolean {
  return directions.some((direction) => {
    const forward = countConsecutive(board, move, direction, player);
    const backward = countConsecutive(
      board,
      move,
      { row: -direction.row, col: -direction.col },
      player,
    );

    return forward + backward + 1 >= WIN_LENGTH;
  });
}

function countConsecutive(board: Cell[][], move: Position, direction: Position, player: Player): number {
  let count = 0;
  let row = move.row + direction.row;
  let col = move.col + direction.col;

  while (isInside(row, col) && board[row][col] === player) {
    count += 1;
    row += direction.row;
    col += direction.col;
  }

  return count;
}

function isOpenEnd(board: Cell[][], move: Position, direction: Position, player: Player): boolean {
  let row = move.row + direction.row;
  let col = move.col + direction.col;

  while (isInside(row, col) && board[row][col] === player) {
    row += direction.row;
    col += direction.col;
  }

  return isInside(row, col) && board[row][col] === null;
}
