import { describe, expect, it, vi } from "vitest";
import {
  chooseMachineMove,
  createEmptyBoard,
  findWinner,
  getHintMove,
  isBoardFull,
  placeMove,
} from "./game";

describe("caro game engine", () => {
  it("detects five consecutive human moves as a win", () => {
    let board = createEmptyBoard();

    for (let col = 3; col < 8; col += 1) {
      board = placeMove(board, { row: 7, col }, "human");
    }

    const winner = findWinner(board);

    expect(winner?.player).toBe("human");
    expect(winner?.line).toHaveLength(5);
  });

  it("chooses an immediate winning move for the machine", () => {
    let board = createEmptyBoard();

    for (let col = 3; col < 7; col += 1) {
      board = placeMove(board, { row: 7, col }, "machine");
    }

    const move = chooseMachineMove(board, "hard");
    const winner = findWinner(placeMove(board, move, "machine"));

    expect(winner?.player).toBe("machine");
  });

  it("blocks an immediate human win", () => {
    let board = createEmptyBoard();

    for (let col = 3; col < 7; col += 1) {
      board = placeMove(board, { row: 7, col }, "human");
    }

    const move = chooseMachineMove(board, "hard");

    expect(move.row).toBe(7);
    expect([2, 7]).toContain(move.col);
  });

  it("returns a hint for the player while the game is active", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const board = placeMove(createEmptyBoard(), { row: 7, col: 7 }, "human");

    expect(getHintMove(board, "medium")).toEqual(expect.objectContaining({ row: expect.any(Number), col: expect.any(Number) }));
  });

  it("identifies a full board", () => {
    const board = createEmptyBoard().map((row, rowIndex) =>
      row.map((_, colIndex) => ((rowIndex + colIndex) % 2 === 0 ? "human" : "machine")),
    );

    expect(isBoardFull(board)).toBe(true);
  });
});
