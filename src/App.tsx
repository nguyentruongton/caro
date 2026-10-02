import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { DEFAULT_SPATIAL_SPRING, FAST_EFFECTS_SPRING, FAST_SPATIAL_SPRING } from "@bug-on/m3-tokens";
import { MD3ThemeProvider, MaterialSymbolsPreconnect } from "@bug-on/m3-expressive/core";
import { Button, ButtonDistribute, ButtonGroup } from "@bug-on/m3-expressive/buttons";
import { Chip } from "@bug-on/m3-expressive/forms";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@bug-on/m3-expressive/overlays";
import { Card, Text } from "@bug-on/m3-expressive/layout";
import { ShapeSvg } from "@bug-on/m3-expressive/shapes";
import {
  BOARD_SIZE,
  type Cell,
  type Difficulty,
  type Move,
  type Player,
  type Position,
  type Winner,
  chooseMachineMove,
  createEmptyBoard,
  difficulties,
  findWinner,
  getHintMove,
  isBoardFull,
  placeMove,
} from "./game";

type GameStatus = "playing" | "thinking" | "won" | "draw";

type Score = Record<Player, number>;

const BOARD_GRID_STYLE = {
  gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
  gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
};

const playerLabel: Record<Player, string> = {
  human: "Bạn",
  machine: "Máy",
};

function App() {
  return (
    <MD3ThemeProvider sourceColor="#6750a4" defaultMode="light">
      <MaterialSymbolsPreconnect />
      <CaroGame />
    </MD3ThemeProvider>
  );
}

function CaroGame() {
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard());
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [status, setStatus] = useState<GameStatus>("playing");
  const [winner, setWinner] = useState<Winner | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [score, setScore] = useState<Score>({ human: 0, machine: 0 });
  const [hint, setHint] = useState<Position | null>(null);
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);

  const winningCells = useMemo(
    () => new Set(winner?.line.map((cell) => positionKey(cell)) ?? []),
    [winner],
  );

  const statusCopy = getStatusCopy(status, winner?.player);
  const canPlay = status === "playing" && !winner;
  const boardRef = useRef(board);
  const canPlayRef = useRef(canPlay);
  const difficultyRef = useRef(difficulty);
  const movesLengthRef = useRef(moves.length);

  boardRef.current = board;
  canPlayRef.current = canPlay;
  difficultyRef.current = difficulty;
  movesLengthRef.current = moves.length;

  useEffect(() => {
    if (status !== "thinking") return;

    const timeout = window.setTimeout(() => {
      if (findWinner(board) || isBoardFull(board)) return;

      const machineMove = chooseMachineMove(board, difficulty);
      const nextBoard = placeMove(board, machineMove, "machine");
      const move: Move = {
        ...machineMove,
        player: "machine",
        moveNumber: moves.length + 1,
      };
      const nextWinner = findWinner(nextBoard);

      setBoard(nextBoard);
      setMoves((currentMoves) => [...currentMoves, move]);
      setLastMove(move);
      setHint(null);

      if (nextWinner) {
        setWinner(nextWinner);
        setStatus("won");
        setWinnerDialogOpen(true);
        setScore((currentScore) => ({
          ...currentScore,
          [nextWinner.player]: currentScore[nextWinner.player] + 1,
        }));
      } else if (isBoardFull(nextBoard)) {
        setStatus("draw");
      } else {
        setStatus("playing");
      }
    }, 520);

    return () => window.clearTimeout(timeout);
  }, [board, difficulty, moves.length, status]);

  const playHumanMove = useCallback((move: Position) => {
    const currentBoard = boardRef.current;
    if (!canPlayRef.current || currentBoard[move.row][move.col]) return;

    const nextBoard = placeMove(currentBoard, move, "human");
    const humanMove: Move = {
      ...move,
      player: "human",
      moveNumber: movesLengthRef.current + 1,
    };
    const nextWinner = findWinner(nextBoard);

    setBoard(nextBoard);
    setMoves((currentMoves) => [...currentMoves, humanMove]);
    setLastMove(humanMove);
    setHint(null);

    if (nextWinner) {
      setWinner(nextWinner);
      setStatus("won");
      setWinnerDialogOpen(true);
      setScore((currentScore) => ({
        ...currentScore,
        [nextWinner.player]: currentScore[nextWinner.player] + 1,
      }));
    } else if (isBoardFull(nextBoard)) {
      setStatus("draw");
    } else {
      setStatus("thinking");
    }
  }, []);

  const resetRound = useCallback(() => {
    setBoard(createEmptyBoard());
    setStatus("playing");
    setWinner(null);
    setLastMove(null);
    setMoves([]);
    setHint(null);
    setWinnerDialogOpen(false);
  }, []);

  const showHint = useCallback(() => {
    setHint(getHintMove(boardRef.current, difficultyRef.current));
  }, []);

  return (
    <main className="min-h-screen px-3 py-3 text-m3-on-surface sm:px-6 sm:py-4 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-7xl flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <section className="flex flex-col items-center gap-3">
          <GameHeader status={statusCopy} />
          <Board
            board={board}
            canPlay={canPlay}
            hint={hint}
            lastMove={lastMove}
            winningCells={winningCells}
            onPlay={playHumanMove}
          />
          <ActionRail
            isThinking={status === "thinking"}
            onHint={showHint}
            onReset={resetRound}
            showHintDisabled={!canPlay}
          />
          <WinnerDialog
            open={winnerDialogOpen}
            winner={winner}
            onClose={() => setWinnerDialogOpen(false)}
            onReset={resetRound}
          />
        </section>

        <aside className="flex flex-col gap-3">
          <GameInfoPanel
            difficulty={difficulty}
            moves={moves}
            score={score}
            status={status}
            statusCopy={statusCopy}
            winner={winner}
            onDifficultyChange={setDifficulty}
            onReset={resetRound}
          />
        </aside>
      </div>
    </main>
  );
}

function GameHeader({ status }: { status: string }) {
  return (
    <header className="flex w-full max-w-3xl items-center justify-between gap-3">
      <div>
        <Text as="h1" variant="headline-sm" className="font-extrabold text-m3-on-surface">
          Cờ Caro
        </Text>
        <Text as="p" variant="body-sm" className="mt-1 text-m3-on-surface-variant">
          Người chơi với máy
        </Text>
      </div>
      <AnimatePresence mode="wait">
        <m.div
          key={status}
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.95 }}
          transition={FAST_EFFECTS_SPRING}
          className="shrink-0"
        >
          <Chip variant="assist" label={status} />
        </m.div>
      </AnimatePresence>
    </header>
  );
}

function Board({
  board,
  canPlay,
  hint,
  lastMove,
  winningCells,
  onPlay,
}: {
  board: Cell[][];
  canPlay: boolean;
  hint: Position | null;
  lastMove: Move | null;
  winningCells: Set<string>;
  onPlay: (move: Position) => void;
}) {
  return (
    <Card
      variant="filled"
      disableElevation
      morphRadius={{ rest: "large", hover: "extraLarge" }}
      forceMotion
      className="board-size aspect-square overflow-hidden rounded-m3-xl bg-m3-surface-container-low p-1.5 sm:p-2"
    >
      <div
        className="caro-board grid h-full w-full gap-px overflow-hidden rounded-m3-lg"
        style={BOARD_GRID_STYLE}
        role="grid"
        aria-label="Bàn cờ Caro 15 nhân 15"
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const position = { row: rowIndex, col: colIndex };
            const key = positionKey(position);

            return (
              <BoardCell
                key={key}
                cell={cell}
                canPlay={canPlay}
                colIndex={colIndex}
                isHint={Boolean(hint && positionKey(hint) === key)}
                isLast={Boolean(lastMove && positionKey(lastMove) === key)}
                isWinner={winningCells.has(key)}
                rowIndex={rowIndex}
                onPlay={onPlay}
              />
            );
          }),
        )}
      </div>
    </Card>
  );
}

const BoardCell = memo(function BoardCell({
  cell,
  canPlay,
  colIndex,
  isHint,
  isLast,
  isWinner,
  rowIndex,
  onPlay,
}: {
  cell: Cell;
  canPlay: boolean;
  colIndex: number;
  isHint: boolean;
  isLast: boolean;
  isWinner: boolean;
  rowIndex: number;
  onPlay: (move: Position) => void;
}) {
  const cornerRadius =
    rowIndex === 0 && colIndex === 0
      ? "rounded-tl-m3-xs"
      : rowIndex === 0 && colIndex === BOARD_SIZE - 1
        ? "rounded-tr-m3-xs"
        : rowIndex === BOARD_SIZE - 1 && colIndex === 0
          ? "rounded-bl-m3-xs"
          : rowIndex === BOARD_SIZE - 1 && colIndex === BOARD_SIZE - 1
            ? "rounded-br-m3-xs"
            : "";

  const handleClick = useCallback(() => {
    onPlay({ row: rowIndex, col: colIndex });
  }, [colIndex, onPlay, rowIndex]);

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={`Ô ${rowIndex + 1}, ${colIndex + 1}${cell ? `, ${cell === "human" ? "X" : "O"}` : ""}`}
      disabled={!canPlay || Boolean(cell)}
      onClick={handleClick}
      className={[
        "relative flex h-full min-h-0 w-full min-w-0 items-center justify-center bg-m3-surface text-[clamp(0.75rem,3.4vw,1.45rem)] font-black leading-none transition-colors",
        cornerRadius,
        "focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-m3-primary",
        !cell && canPlay ? "hover:bg-m3-primary/8" : "",
        isLast ? "bg-m3-primary-container" : "",
        isHint ? "bg-m3-tertiary-container/60" : "",
        isWinner && cell === "human" ? "z-1 bg-m3-primary-fixed-dim" : "",
        isWinner && cell === "machine" ? "z-1 bg-m3-tertiary-fixed-dim" : "",
      ].join(" ")}
    >
      {cell ? (
        <GamePiece player={cell} size="board" />
      ) : isHint ? (
        <span className="size-[34%] rounded-full border-2 border-dashed border-m3-tertiary" />
      ) : null}
    </button>
  );
});

function ActionRail({
  isThinking,
  onHint,
  onReset,
  showHintDisabled,
}: {
  isThinking: boolean;
  onHint: () => void;
  onReset: () => void;
  showHintDisabled: boolean;
}) {
  return (
    <div className="w-full max-w-3xl rounded-m3-xl bg-m3-surface-container-low p-1.5 sm:p-2">
      <ButtonDistribute mode="dynamic" className="w-full">
        <Button
          colorStyle="tonal"
          size="md"
          shape="square"
          onClick={onReset}
          className="flex-1"
        >
          Chơi lại
        </Button>
        <Button
          colorStyle="filled"
          size="md"
          shape="square"
          loading={isThinking}
          disabled={showHintDisabled}
          onClick={onHint}
          className="flex-1"
        >
          Gợi ý
        </Button>
      </ButtonDistribute>
    </div>
  );
}

function WinnerDialog({
  open,
  winner,
  onClose,
  onReset,
}: {
  open: boolean;
  winner: Winner | null;
  onClose: () => void;
  onReset: () => void;
}) {
  if (!winner) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? undefined : onClose())}>
      <DialogContent hideCloseButton className="max-w-[calc(100vw-2rem)] rounded-m3-xl">
        <DialogHeader>
          <DialogTitle>{playerLabel[winner.player]} chiến thắng</DialogTitle>
          <DialogDescription>Chuỗi 5 quân liên tiếp đã được tô sáng trên bàn cờ.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex items-center gap-3 rounded-m3-lg bg-m3-surface-container p-3">
            <GamePiece player={winner.player} size="marker" />
            <Text as="p" variant="body-md" className="font-semibold text-m3-on-surface">
              {winner.player === "human" ? "Bạn đã thắng ván này." : "Máy đã thắng ván này."}
            </Text>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button colorStyle="text" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button colorStyle="filled" size="sm" onClick={onReset}>
            Chơi lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GameInfoPanel({
  difficulty,
  moves,
  score,
  status,
  statusCopy,
  winner,
  onDifficultyChange,
  onReset,
}: {
  difficulty: Difficulty;
  moves: Move[];
  score: Score;
  status: GameStatus;
  statusCopy: string;
  winner: Winner | null;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onReset: () => void;
}) {
  const recentMoves = moves.slice(-3).reverse();

  return (
    <Card variant="filled" disableElevation className="rounded-m3-xl bg-m3-surface-container-low p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Text as="h2" variant="title-md" className="font-bold text-m3-on-surface">
            Ván đấu
          </Text>
          <Text as="p" variant="body-sm" className="mt-0.5 text-m3-on-surface-variant">
            {statusCopy}
          </Text>
        </div>
        {status !== "playing" && status !== "thinking" ? (
          <Button colorStyle="text" size="sm" onClick={onReset}>
            Ván mới
          </Button>
        ) : (
          <div className="flex shrink-0 gap-2">
            <Chip variant="assist" label={`Bạn ${score.human}`} />
            <Chip variant="assist" label={`Máy ${score.machine}`} />
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <PlayerSummary label="Bạn" marker="X" score={score.human} tone="human" />
        <PlayerSummary label="Máy" marker="O" score={score.machine} tone="machine" />
      </div>

      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <Text as="span" variant="label-md" className="font-bold text-m3-on-surface-variant">
            Độ khó
          </Text>
          {recentMoves.length > 0 ? (
            <Text as="span" variant="label-sm" className="text-m3-on-surface-variant">
              {moves.length} nước
            </Text>
          ) : null}
        </div>
        <ButtonGroup
          variant="connected"
          fullWidth
          size="sm"
          className="w-full"
          aria-label="Chọn độ khó"
        >
          {difficulties.map((item) => (
            <Button
              key={item.value}
              value={item.value}
              variant="toggle"
              selected={difficulty === item.value}
              colorStyle="tonal"
              shape="square"
              onClick={() => onDifficultyChange(item.value)}
              className="flex-1"
            >
              {item.label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <div className="mt-3 rounded-m3-lg bg-m3-surface-container px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <Text as="span" variant="label-md" className="font-bold text-m3-on-surface-variant">
            Gần nhất
          </Text>
          <div className="flex min-w-0 flex-1 justify-end gap-1.5 overflow-hidden">
            {recentMoves.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {recentMoves.map((move) => (
                  <m.div
                    key={`${move.moveNumber}-${move.player}-${move.row}-${move.col}`}
                    layout
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={DEFAULT_SPATIAL_SPRING}
                    className="shrink-0"
                  >
                    <Chip
                      variant="assist"
                      label={`${move.moveNumber}. ${move.player === "human" ? "X" : "O"}`}
                    />
                  </m.div>
                ))}
              </AnimatePresence>
            ) : (
              <Text as="span" variant="body-sm" className="text-m3-on-surface-variant">
                Chưa có nước
              </Text>
            )}
          </div>
        </div>
      </div>

      {winner ? (
        <Card variant="filled" disableElevation className="mt-3 rounded-m3-lg bg-m3-tertiary-container p-3">
          <Text as="p" variant="body-md" className="font-bold text-m3-on-tertiary-container">
            {playerLabel[winner.player]} thắng với 5 quân liên tiếp.
          </Text>
        </Card>
      ) : null}
    </Card>
  );
}

function PlayerSummary({
  label,
  marker,
  score,
  tone,
}: {
  label: string;
  marker: string;
  score: number;
  tone: Player;
}) {
  return (
    <Card
      variant="filled"
      disableElevation
      morphRadius={{ rest: "medium", hover: "large" }}
      forceMotion
      className="flex items-center justify-between gap-2 rounded-m3-lg bg-m3-surface-container px-3 py-2"
    >
      <div className="flex min-w-0 items-center gap-2">
        <GamePiece player={tone} size="marker" />
        <div className="min-w-0">
          <Text as="p" variant="label-md" className="text-m3-on-surface-variant">
            {label}
          </Text>
          <Text as="span" variant="title-sm" className="font-bold text-m3-on-surface">
            {marker}
          </Text>
        </div>
      </div>
      <m.div
        key={score}
        initial={{ scale: 1.35, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={FAST_SPATIAL_SPRING}
      >
        <Text as="span" variant="title-sm" className="font-bold text-m3-on-surface">
          {score}
        </Text>
      </m.div>
    </Card>
  );
}

const GamePiece = memo(function GamePiece({ player, size }: { player: Player; size: "board" | "marker" }) {
  const isHuman = player === "human";

  return (
    <m.span
      initial={{ scale: 0.45, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={FAST_SPATIAL_SPRING}
      className={[
        "grid shrink-0 place-items-center",
        size === "board" ? "size-[76%]" : "size-8",
      ].join(" ")}
      aria-hidden="true"
    >
      <ShapeSvg
        shape={isHuman ? "cookie4Sided" : "circle"}
        width={100}
        height={100}
        fill={isHuman ? "var(--md-sys-color-primary)" : "var(--md-sys-color-tertiary)"}
        className="h-full w-full"
      />
    </m.span>
  );
});

function getStatusCopy(status: GameStatus, winner?: Player): string {
  if (status === "thinking") return "Máy đang nghĩ";
  if (status === "draw") return "Hòa cờ";
  if (status === "won" && winner) return `${playerLabel[winner]} thắng`;
  return "Lượt của bạn";
}

function positionKey(position: Position): string {
  return `${position.row}:${position.col}`;
}

export default App;
