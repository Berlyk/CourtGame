import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import {
  createRoom,
  joinRoom,
  rejoinRoom,
  isNameTaken,
  removePlayer,
  startGame,
  revealFact,
  useCard,
  nextStage,
  prevStage,
  setVerdict,
  getRoom,
  setHostJudge
} from "./roomManager.js";

function randomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

const PREPARATION_STAGE_INDEX = 0;
const OPENING_SPEECH_STAGE_INDEX = 1;
const OPENING_SPEECH_FACT_LIMIT = 2;

function getRoomState(room: any, playerId: string) {
  if (!room.game) {
    return {
      type: "room",
      code: room.code,
      hostId: room.hostId,
      players: room.players.map((p: any) => ({ id: p.id, name: p.name })),
      started: room.started,
      isHostJudge: room.isHostJudge
    };
  }

  const myPlayer = room.game.players.find((p: any) => p.id === playerId);

  return {
    type: "game",
    code: room.code,
    hostId: room.hostId,
    caseData: room.game.caseData,
    stageIndex: room.game.stageIndex,
    revealedFacts: room.game.revealedFacts,
    usedCards: room.game.usedCards,
    finished: room.game.finished,
    verdict: room.game.verdict,
    verdictEvaluation: room.game.verdictEvaluation,
    players: room.game.players.map((p: any) => ({
      id: p.id,
      name: p.name,
      roleKey: p.roleKey,
      roleTitle: p.roleTitle
    })),
    me: myPlayer ? {
      id: myPlayer.id,
      name: myPlayer.name,
      roleKey: myPlayer.roleKey,
      roleTitle: myPlayer.roleTitle,
      goal: myPlayer.goal,
      facts: myPlayer.facts,
      cards: myPlayer.cards
    } : null
  };
}

export function setupSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    path: "/api/socket.io"
  });

  const socketToRoom = new Map<string, { roomCode: string; playerId: string }>();

  io.on("connection", (socket) => {
    socket.on("create_room", ({ playerName }: { playerName: string }) => {
      const code = randomCode();
      const playerId = crypto.randomUUID();
      const player = { id: playerId, name: playerName || "Игрок 1", socketId: socket.id };
      const room = createRoom(code, player);

      socketToRoom.set(socket.id, { roomCode: code, playerId });
      socket.join(code);
      socket.emit("room_joined", { playerId, state: getRoomState(room, playerId) });
    });

    socket.on("join_room", ({ code, playerName }: { code: string; playerName: string }) => {
      const roomCode = code.trim().toUpperCase();
      const room = getRoom(roomCode);
      const trimmedName = (playerName || "").trim();

      if (!room) {
        socket.emit("error", { message: "Комната не найдена. Проверьте код." });
        return;
      }
      if (room.started) {
        socket.emit("error", { message: "Игра уже началась. Используйте переподключение." });
        return;
      }
      if (room.players.length >= 6) {
        socket.emit("error", { message: "Комната заполнена (максимум 6 игроков)." });
        return;
      }
      if (!trimmedName) {
        socket.emit("error", { message: "Введите никнейм перед входом." });
        return;
      }
      if (isNameTaken(roomCode, trimmedName)) {
        socket.emit("error", { message: `Никнейм «${trimmedName}» уже занят в этой комнате.` });
        return;
      }

      const playerId = crypto.randomUUID();
      const player = { id: playerId, name: trimmedName, socketId: socket.id };
      const updatedRoom = joinRoom(roomCode, player);

      if (!updatedRoom) {
        socket.emit("error", { message: "Не удалось войти в комнату." });
        return;
      }

      socketToRoom.set(socket.id, { roomCode, playerId });
      socket.join(roomCode);

      socket.emit("room_joined", { playerId, state: getRoomState(updatedRoom, playerId) });

      socket.to(roomCode).emit("room_updated", {
        players: updatedRoom.players.map((p: any) => ({ id: p.id, name: p.name })),
        hostId: updatedRoom.hostId
      });
    });

    socket.on("rejoin_room", ({ code, playerName }: { code: string; playerName: string }) => {
      const roomCode = code.trim().toUpperCase();
      const result = rejoinRoom(roomCode, playerName, socket.id);

      if (!result) {
        socket.emit("rejoin_failed", { message: "Комната не найдена или вас нет в ней." });
        return;
      }

      const { room, playerId } = result;
      socketToRoom.set(socket.id, { roomCode, playerId });
      socket.join(roomCode);

      socket.emit("room_joined", { playerId, state: getRoomState(room, playerId) });

      if (room.game) {
        socket.to(roomCode).emit("player_rejoined", { playerId, playerName: playerName.trim() });
      }
    });

    socket.on("start_game", ({ code, playerId }: { code: string; playerId: string }) => {
      const room = getRoom(code);
      if (!room || room.hostId !== playerId) {
        socket.emit("error", { message: "Только ведущий может начать игру." });
        return;
      }
      if (room.players.length < 3) {
        socket.emit("error", { message: "Нужно минимум 3 игрока." });
        return;
      }

      const updatedRoom = startGame(code);
      if (!updatedRoom) {
        socket.emit("error", { message: "Не удалось начать игру." });
        return;
      }

      updatedRoom.players.forEach((p: any) => {
        const pSocketId = p.socketId;
        if (pSocketId) {
          io.to(pSocketId).emit("game_started", {
            state: getRoomState(updatedRoom, p.id)
          });
        }
      });
    });

    socket.on("set_host_judge", ({ code, playerId, isHostJudge }: { code: string; playerId: string; isHostJudge: boolean }) => {
      const room = getRoom(code);
      if (!room || room.hostId !== playerId) return;
      setHostJudge(code, isHostJudge);
      socket.to(code).emit("room_updated", {
        players: room.players.map((p: any) => ({ id: p.id, name: p.name })),
        hostId: room.hostId,
        isHostJudge
      });
    });

    socket.on("reveal_fact", ({ code, playerId, factId }: { code: string; playerId: string; factId: string }) => {
      const room = getRoom(code);
      if (!room?.game) return;

      if (room.game.stageIndex === PREPARATION_STAGE_INDEX) {
        socket.emit("error", { message: "На этапе «Подготовка» раскрывать факты нельзя." });
        return;
      }

      if (room.game.stageIndex === OPENING_SPEECH_STAGE_INDEX) {
        const openingSpeechRevealedFacts = room.game.revealedFacts.filter(
          (fact: any) => fact.stageIndex === OPENING_SPEECH_STAGE_INDEX
        ).length;
        if (openingSpeechRevealedFacts >= OPENING_SPEECH_FACT_LIMIT) {
          socket.emit("error", { message: "На этапе «Вступительная речь» можно раскрыть только 2 факта." });
          return;
        }
      }

      const updatedRoom = revealFact(code, playerId, factId);
      if (!updatedRoom) return;

      io.to(code).emit("facts_updated", {
        revealedFacts: updatedRoom.game!.revealedFacts,
        players: updatedRoom.game!.players.map((p: any) => ({ id: p.id, facts: p.facts }))
      });

      const myPlayer = updatedRoom.game!.players.find((p: any) => p.id === playerId);
      if (myPlayer) {
        io.to(myPlayer.socketId).emit("my_facts_updated", { facts: myPlayer.facts });
      }
    });

    socket.on("use_card", ({ code, playerId, cardId }: { code: string; playerId: string; cardId: string }) => {
      const room = getRoom(code);
      if (!room?.game) return;
      if (room.game.stageIndex === PREPARATION_STAGE_INDEX) {
        socket.emit("error", { message: "На этапе «Подготовка» карты механик использовать нельзя." });
        return;
      }

      const updatedRoom = useCard(code, playerId, cardId);
      if (!updatedRoom) return;

      io.to(code).emit("cards_updated", {
        usedCards: updatedRoom.game!.usedCards
      });

      const myPlayer = updatedRoom.game!.players.find((p: any) => p.id === playerId);
      if (myPlayer) {
        io.to(myPlayer.socketId).emit("my_cards_updated", { cards: myPlayer.cards });
      }
    });

    socket.on("next_stage", ({ code, playerId }: { code: string; playerId: string }) => {
      const room = getRoom(code);
      if (!room?.game) return;
      const judgePlayer = room.game.players.find((p: any) => p.roleKey === "judge");
      const canControl = room.hostId === playerId || judgePlayer?.id === playerId;
      if (!canControl) {
        socket.emit("error", { message: "Только ведущий или судья может менять этапы." });
        return;
      }

      const updatedRoom = nextStage(code);
      if (!updatedRoom) return;

      io.to(code).emit("stage_updated", { stageIndex: updatedRoom.game!.stageIndex });
    });

    socket.on("prev_stage", ({ code, playerId }: { code: string; playerId: string }) => {
      const room = getRoom(code);
      if (!room?.game) return;
      const judgePlayer = room.game.players.find((p: any) => p.roleKey === "judge");
      const canControl = room.hostId === playerId || judgePlayer?.id === playerId;
      if (!canControl) {
        socket.emit("error", { message: "Только ведущий или судья может менять этапы." });
        return;
      }

      const updatedRoom = prevStage(code);
      if (!updatedRoom) return;

      io.to(code).emit("stage_updated", { stageIndex: updatedRoom.game!.stageIndex });
    });

    socket.on("set_verdict", ({ code, playerId, verdict }: { code: string; playerId: string; verdict: string }) => {
      const room = getRoom(code);
      if (!room?.game) return;

      const judgePlayer = room.game.players.find((p: any) => p.roleKey === "judge");
      if (!judgePlayer || judgePlayer.id !== playerId) {
        socket.emit("error", { message: "Только судья может выносить вердикт." });
        return;
      }

      const updatedRoom = setVerdict(code, verdict);
      if (!updatedRoom) return;

      io.to(code).emit("verdict_set", {
        verdict: updatedRoom.game!.verdict,
        verdictEvaluation: updatedRoom.game!.verdictEvaluation,
        finished: true,
        truth: updatedRoom.game!.caseData.truth
      });
    });

    function handleLeave(socketId: string) {
      const info = socketToRoom.get(socketId);
      if (!info) return;

      socketToRoom.delete(socketId);

      const room = getRoom(info.roomCode);
      const leavingPlayer = room?.players.find((p: any) => p.id === info.playerId)
        || room?.game?.players.find((p: any) => p.id === info.playerId);
      const leavingName = leavingPlayer?.name || "Игрок";
      const wasInGame = !!room?.game;

      if (wasInGame) {
        if (leavingPlayer) leavingPlayer.socketId = "";
        socket.to(info.roomCode).emit("player_left", {
          playerId: info.playerId,
          playerName: leavingName
        });
      } else {
        const updatedRoom = removePlayer(info.roomCode, info.playerId);
        if (updatedRoom) {
          socket.to(info.roomCode).emit("room_updated", {
            players: updatedRoom.players.map((p: any) => ({ id: p.id, name: p.name })),
            hostId: updatedRoom.hostId
          });
        }
      }
    }

    socket.on("leave_room", () => {
      handleLeave(socket.id);
    });

    socket.on("disconnect", () => {
      handleLeave(socket.id);
    });
  });

  return io;
}
