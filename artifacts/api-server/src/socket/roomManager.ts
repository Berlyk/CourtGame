import { mechanicPool, cases, stages, roleOrderByCount } from "./gameData.js";

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(array: T[], count = 1): T[] {
  return shuffle(array).slice(0, count);
}

export interface PlayerCard {
  id: string;
  name: string;
  description: string;
  used: boolean;
}

export interface PlayerFact {
  id: string;
  text: string;
  revealed: boolean;
}

export interface Player {
  id: string;
  name: string;
  socketId: string;
  roleKey?: string;
  roleTitle?: string;
  goal?: string;
  facts?: PlayerFact[];
  cards?: PlayerCard[];
}

export interface RevealedFact {
  id: string;
  text: string;
  owner: string;
  ownerRole: string;
}

export interface UsedCard {
  id: string;
  owner: string;
  ownerRole: string;
  name: string;
  description: string;
}

export interface GameState {
  caseData: any;
  players: Player[];
  stageIndex: number;
  revealedFacts: RevealedFact[];
  usedCards: UsedCard[];
  finished: boolean;
  verdict: string;
  verdictEvaluation: string;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  game: GameState | null;
  started: boolean;
}

const rooms = new Map<string, Room>();

export function createRoom(code: string, player: Player): Room {
  const room: Room = {
    code,
    hostId: player.id,
    players: [player],
    game: null,
    started: false
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function isNameTaken(code: string, name: string): boolean {
  const room = rooms.get(code);
  if (!room) return false;
  const lower = name.trim().toLowerCase();
  if (room.players.some(p => p.name.trim().toLowerCase() === lower)) return true;
  if (room.game?.players.some((p: any) => p.name.trim().toLowerCase() === lower)) return true;
  return false;
}

export function joinRoom(code: string, player: Player): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.started) return null;
  if (room.players.length >= 6) return null;
  room.players.push(player);
  return room;
}

export function rejoinRoom(code: string, playerName: string, newSocketId: string): { room: Room; playerId: string } | null {
  const room = rooms.get(code);
  if (!room) return null;
  const lower = playerName.trim().toLowerCase();

  if (room.game) {
    const player = room.game.players.find((p: any) => p.name.trim().toLowerCase() === lower);
    if (player) {
      player.socketId = newSocketId;
      const lobbyPlayer = room.players.find(p => p.id === player.id);
      if (lobbyPlayer) lobbyPlayer.socketId = newSocketId;
      return { room, playerId: player.id };
    }
  }

  const player = room.players.find(p => p.name.trim().toLowerCase() === lower);
  if (player) {
    player.socketId = newSocketId;
    return { room, playerId: player.id };
  }

  return null;
}

export function removePlayer(code: string, playerId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.length === 0) {
    rooms.delete(code);
    return null;
  }
  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id;
  }
  return room;
}

export function startGame(code: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.players.length < 3 || room.players.length > 6) return null;

const count = room.players.length;
const availableCases = cases[count] || cases[3];

console.log("=== START GAME ===");
console.log("PLAYER COUNT:", count);
console.log(
  "AVAILABLE CASES:",
  availableCases.map((c: any) => `${c.id} | ${c.title}`)
);

const selectedCase = pickRandom(availableCases)[0];
const roleKeys = shuffle(roleOrderByCount[count]);
  
  const assignedPlayers: Player[] = room.players.map((player, index) => {
    const roleKey = roleKeys[index];
    const roleData = selectedCase.roles[roleKey];
    return {
      ...player,
      roleKey,
      roleTitle: roleData.title,
      goal: roleData.goal,
      facts: roleKey === "judge" ? [] : roleData.facts.map((text: string, i: number) => ({
        id: `${player.id}-fact-${i}`,
        text,
        revealed: false
      })),
      cards: roleKey === "judge" ? [] : pickRandom(mechanicPool, 3).map((card: any, i: number) => ({
        ...card,
        id: `${player.id}-card-${i}`,
        used: false
      }))
    };
  });

  room.game = {
    caseData: selectedCase,
    players: assignedPlayers,
    stageIndex: 0,
    revealedFacts: [],
    usedCards: [],
    finished: false,
    verdict: "",
    verdictEvaluation: ""
  };
  room.started = true;
  return room;
}

export function revealFact(code: string, playerId: string, factId: string): Room | null {
  const room = rooms.get(code);
  if (!room?.game) return null;

  const game = room.game;
  const player = game.players.find(p => p.id === playerId);
  if (!player?.facts) return null;

  const fact = player.facts.find(f => f.id === factId);
  if (!fact || fact.revealed) return null;

  fact.revealed = true;

  const alreadyExists = game.revealedFacts.some(f => f.id === factId);
  if (!alreadyExists) {
    game.revealedFacts.push({
      id: factId,
      text: fact.text,
      owner: player.name,
      ownerRole: player.roleTitle || ""
    });
  }

  return room;
}

export function useCard(code: string, playerId: string, cardId: string): Room | null {
  const room = rooms.get(code);
  if (!room?.game) return null;

  const game = room.game;
  const player = game.players.find(p => p.id === playerId);
  if (!player?.cards) return null;

  const card = player.cards.find(c => c.id === cardId);
  if (!card || card.used) return null;

  card.used = true;
  game.usedCards.push({
    id: `${cardId}-used-${Date.now()}`,
    owner: player.name,
    ownerRole: player.roleTitle || "",
    name: card.name,
    description: card.description
  });

  return room;
}

export function nextStage(code: string): Room | null {
  const room = rooms.get(code);
  if (!room?.game) return null;

  room.game.stageIndex = Math.min(room.game.stageIndex + 1, stages.length - 1);
  return room;
}

export function prevStage(code: string): Room | null {
  const room = rooms.get(code);
  if (!room?.game) return null;

  room.game.stageIndex = Math.max(room.game.stageIndex - 1, 0);
  return room;
}

export function setVerdict(code: string, verdict: string): Room | null {
  const room = rooms.get(code);
  if (!room?.game) return null;

  const truth = room.game.caseData.truth.toLowerCase();
  let expectedVerdict = "Частично виновен";

  if (truth.includes("не винов") || truth.includes("не совершал") || truth.includes("ошибочно обвин")) {
    expectedVerdict = "Не виновен";
  } else if (truth.includes("частично") || truth.includes("обеих сторон") || truth.includes("завысил") || truth.includes("но ")) {
    expectedVerdict = "Частично виновен";
  } else {
    expectedVerdict = "Виновен";
  }

  const verdictEvaluation = verdict === expectedVerdict
    ? `Судья вынес правильный вердикт: ${verdict}.`
    : `Судья ошибся. Правильнее было бы выбрать: ${expectedVerdict}.`;

  room.game.verdict = verdict;
  room.game.verdictEvaluation = verdictEvaluation;
  room.game.finished = true;

  return room;
}
