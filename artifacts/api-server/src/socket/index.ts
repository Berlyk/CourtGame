import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import {
  createRoom,
  joinRoom,
  joinRunningGameAsWitness,
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
  setHostJudge,
  updatePlayerAvatar
} from "./roomManager.js";

function randomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

const DEFAULT_PREPARATION_STAGE_INDEX = 0;
const DEFAULT_OPENING_SPEECH_STAGE_INDEX = 1;
const PREPARATION_STAGE_NAME = "Подготовка";
const OPENING_SPEECH_STAGE_NAME = "Выступление истца";
const OPENING_SPEECH_FACT_LIMIT = 2;

function resolveStageIndex(
  stages: string[] | undefined,
  stageName: string,
  fallbackIndex: number,
): number {
  if (!stages || stages.length === 0) return fallbackIndex;
  const stageIndex = stages.indexOf(stageName);
  return stageIndex >= 0 ? stageIndex : fallbackIndex;
}

function mapGamePlayers(players: any[]) {
  return players.map((p: any) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    roleKey: p.roleKey,
    roleTitle: p.roleTitle
  }));
}

function getRoomState(room: any, playerId: string) {
  if (!room.game) {
    return {
      type: "room",
      code: room.code,
      hostId: room.hostId,
      players: room.players.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar })),
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
    stages: room.game.stages,
    stageIndex: room.game.stageIndex,
    revealedFacts: room.game.revealedFacts,
    usedCards: room.game.usedCards,
    finished: room.game.finished,
    verdict: room.game.verdict,
    verdictEvaluation: room.game.verdictEvaluation,
    players: mapGamePlayers(room.game.players),
    me: myPlayer ? {
      id: myPlayer.id,
      name: myPlayer.name,
      avatar: myPlayer.avatar,
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
    socket.on("create_room", ({ playerName, avatar }: { playerName: string; avatar?: string | null }) => {
      const code = randomCode();
      const playerId = crypto.randomUUID();
      const player = { id: playerId, name: playerName || "Игрок 1", socketId: socket.id, avatar: avatar || undefined };
      const room = createRoom(code, player);

      socketToRoom.set(socket.id, { roomCode: code, playerId });
      socket.join(code);
      socket.emit("room_joined", { playerId, state: getRoomState(room, playerId) });
    });

    socket.on("join_room", ({ code, playerName, avatar }: { code: string; playerName: string; avatar?: string | null }) => {
      const roomCode = code.trim().toUpperCase();
      const room = getRoom(roomCode);
      const trimmedName = (playerName || "").trim();

      if (!room) {
        socket.emit("error", { message: "\u041a\u043e\u043c\u043d\u0430\u0442\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043a\u043e\u0434." });
        return;
      }
      if (!trimmedName) {
        socket.emit("error", { message: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0438\u043a\u043d\u0435\u0439\u043c \u043f\u0435\u0440\u0435\u0434 \u0432\u0445\u043e\u0434\u043e\u043c." });
        return;
      }
      if (isNameTaken(roomCode, trimmedName)) {
        socket.emit("error", { message: `\u041d\u0438\u043a\u043d\u0435\u0439\u043c \u00ab${trimmedName}\u00bb \u0443\u0436\u0435 \u0437\u0430\u043d\u044f\u0442 \u0432 \u044d\u0442\u043e\u0439 \u043a\u043e\u043c\u043d\u0430\u0442\u0435.` });
        return;
      }

      const playerId = crypto.randomUUID();
      const player = { id: playerId, name: trimmedName, socketId: socket.id, avatar: avatar || undefined };

      if (room.started) {
        const updatedRoom = joinRunningGameAsWitness(roomCode, player);
        if (!updatedRoom?.game) {
          socket.emit("error", { message: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u043e\u0439\u0442\u0438 \u0432 \u0443\u0436\u0435 \u0438\u0434\u0443\u0449\u0438\u0439 \u043c\u0430\u0442\u0447." });
          return;
        }

        socketToRoom.set(socket.id, { roomCode, playerId });
        socket.join(roomCode);
        socket.emit("room_joined", { playerId, state: getRoomState(updatedRoom, playerId) });
        io.to(roomCode).emit("game_players_updated", {
          players: mapGamePlayers(updatedRoom.game.players)
        });
        return;
      }

      if (room.players.length >= 6) {
        socket.emit("error", { message: "\u041a\u043e\u043c\u043d\u0430\u0442\u0430 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430 (\u043c\u0430\u043a\u0441\u0438\u043c\u0443\u043c 6 \u0438\u0433\u0440\u043e\u043a\u043e\u0432)." });
        return;
      }

      const updatedRoom = joinRoom(roomCode, player);
      if (!updatedRoom) {
        socket.emit("error", { message: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u043e\u0439\u0442\u0438 \u0432 \u043a\u043e\u043c\u043d\u0430\u0442\u0443." });
        return;
      }

      socketToRoom.set(socket.id, { roomCode, playerId });
      socket.join(roomCode);
      socket.emit("room_joined", { playerId, state: getRoomState(updatedRoom, playerId) });

      socket.to(roomCode).emit("room_updated", {
        players: updatedRoom.players.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar })),
        hostId: updatedRoom.hostId
      });
    });

    socket.on("rejoin_room", ({ code, playerName, avatar }: { code: string; playerName: string; avatar?: string | null }) => {
      const roomCode = code.trim().toUpperCase();
      const result = rejoinRoom(roomCode, playerName, socket.id, avatar);

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
        players: room.players.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar })),
        hostId: room.hostId,
        isHostJudge
      });
    });

    socket.on(
      "update_avatar",
      ({ code, playerId, avatar }: { code: string; playerId: string; avatar?: string | null }) => {
        if (!avatar) return;
        const room = updatePlayerAvatar(code, playerId, avatar);
        if (!room) return;

        if (room.game) {
          io.to(code).emit("game_players_updated", {
            players: mapGamePlayers(room.game.players)
          });
          return;
        }

        io.to(code).emit("room_updated", {
          players: room.players.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar })),
          hostId: room.hostId,
          isHostJudge: room.isHostJudge
        });
      }
    );

    socket.on(
      "kick_player",
      ({ code, playerId, targetPlayerId }: { code: string; playerId: string; targetPlayerId: string }) => {
        const room = getRoom(code);
        if (!room) {
          socket.emit("error", { message: "Room not found." });
          return;
        }
        if (room.hostId !== playerId) {
          socket.emit("error", { message: "Only host can kick players." });
          return;
        }
        if (room.started || room.game) {
          socket.emit("error", { message: "Kick is available only in lobby before game starts." });
          return;
        }
        if (targetPlayerId === room.hostId) {
          socket.emit("error", { message: "Host cannot be kicked." });
          return;
        }

        const targetPlayer = room.players.find((p: any) => p.id === targetPlayerId);
        if (!targetPlayer) {
          socket.emit("error", { message: "Player not found in room." });
          return;
        }

        const targetSocketId = targetPlayer.socketId;
        const updatedRoom = removePlayer(code, targetPlayerId);

        const mappingEntry = [...socketToRoom.entries()].find(
          ([, value]) => value.roomCode === code && value.playerId === targetPlayerId
        );
        if (mappingEntry) {
          socketToRoom.delete(mappingEntry[0]);
        }
        if (targetSocketId) {
          socketToRoom.delete(targetSocketId);
          io.to(targetSocketId).emit("kicked", {
            message: "You were kicked from the room by the host."
          });
          io.in(targetSocketId).socketsLeave(code);
        }

        if (updatedRoom) {
          io.to(code).emit("room_updated", {
            players: updatedRoom.players.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar })),
            hostId: updatedRoom.hostId,
            isHostJudge: updatedRoom.isHostJudge
          });
        }
      }
    );

    socket.on("reveal_fact", ({ code, playerId, factId }: { code: string; playerId: string; factId: string }) => {
      const room = getRoom(code);
      if (!room?.game) return;
      const preparationStageIndex = resolveStageIndex(
        room.game.stages,
        PREPARATION_STAGE_NAME,
        DEFAULT_PREPARATION_STAGE_INDEX,
      );
      const openingSpeechStageIndex = resolveStageIndex(
        room.game.stages,
        OPENING_SPEECH_STAGE_NAME,
        DEFAULT_OPENING_SPEECH_STAGE_INDEX,
      );

      if (room.game.stageIndex === preparationStageIndex) {
        socket.emit("error", { message: "На этапе «Подготовка» раскрывать факты нельзя." });
        return;
      }

      if (room.game.stageIndex === openingSpeechStageIndex) {
        const openingSpeechRevealedFacts = room.game.revealedFacts.filter(
          (fact: any) => fact.stageIndex === openingSpeechStageIndex
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
      const preparationStageIndex = resolveStageIndex(
        room.game.stages,
        PREPARATION_STAGE_NAME,
        DEFAULT_PREPARATION_STAGE_INDEX,
      );
      if (room.game.stageIndex === preparationStageIndex) {
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
            players: updatedRoom.players.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar })),
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

