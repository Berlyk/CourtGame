import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Gavel,
  Scale,
  UserPlus,
  UserX,
  Play,
  Eye,
  Shield,
  AlertCircle,
  Sparkles,
  Camera,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { Switch } from "@/components/ui/switch";

const stages = [
  "Подготовка",
  "Выступление истца / потерпевшего",
  "Выступление ответчика / обвиняемого",
  "Допрос и использование карт",
  "Финальные речи",
  "Решение судьи",
];

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.22, ease: "easeIn" } },
};

const cardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, delay: i * 0.07, ease: "easeOut" },
  }),
};

const entryVariants = {
  initial: { opacity: 0, scale: 0.92, y: 18 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.88,
    x: -24,
    transition: { duration: 0.22, ease: "easeIn" },
  },
};

interface PlayerInfo {
  id: string;
  name: string;
  avatar?: string;
  roleKey?: string;
  roleTitle?: string;
}

interface Fact {
  id: string;
  text: string;
  revealed: boolean;
}

interface Card_ {
  id: string;
  name: string;
  description: string;
  used: boolean;
}

interface RevealedFact {
  id: string;
  ownerId?: string;
  text: string;
  owner: string;
  ownerRole: string;
  stageIndex?: number;
}

interface UsedCard {
  id: string;
  ownerId?: string;
  owner: string;
  ownerRole: string;
  name: string;
  description: string;
}

interface MyPlayer {
  id: string;
  name: string;
  avatar?: string;
  roleKey: string;
  roleTitle: string;
  goal: string;
  facts: Fact[];
  cards: Card_[];
}

interface GameState {
  caseData: {
    mode: string;
    title: string;
    description: string;
    truth: string;
    evidence: string[];
  };
  players: PlayerInfo[];
  stageIndex: number;
  revealedFacts: RevealedFact[];
  usedCards: UsedCard[];
  finished: boolean;
  verdict: string;
  verdictEvaluation: string;
  me: MyPlayer | null;
  code: string;
  hostId: string;
}

interface RoomState {
  code: string;
  hostId: string;
  players: PlayerInfo[];
  started: boolean;
  isHostJudge?: boolean;
}

function Avatar({
  src,
  name,
  size = 32,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover flex-shrink-0 border border-zinc-700"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name ? name.slice(0, 2).toUpperCase() : "??";
  return (
    <div
      className="rounded-full bg-zinc-700 text-zinc-200 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-zinc-600"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

function PlayerCard({
  player,
  isHost,
  canKick = false,
  onKick,
}: {
  player: PlayerInfo;
  isHost: boolean;
  canKick?: boolean;
  onKick?: () => void;
}) {
  return (
    <motion.div variants={cardVariants} initial="initial" animate="animate">
      <Card className="rounded-2xl shadow-sm bg-zinc-900/90 border-zinc-800 text-zinc-100">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={player.avatar ?? null} name={player.name} size={52} />
            <div className="min-w-0">
              <div className="font-semibold text-xl md:text-2xl leading-tight truncate">
                {player.name}
              </div>
              <div className="text-base md:text-lg text-zinc-300 leading-tight mt-1">
                {isHost ? "Ведущий комнаты" : "Игрок"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                isHost
                  ? "bg-red-600 text-white border-0"
                  : "bg-zinc-800 text-zinc-100 border border-zinc-700"
              }
            >
              {isHost ? "Host" : "Player"}
            </Badge>
            {canKick && onKick && (
              <Button
                size="sm"
                className="h-8 rounded-full px-3 gap-1.5 bg-red-600/90 hover:bg-red-500 text-white border-0 shadow-sm shadow-red-900/30"
                onClick={onKick}
              >
                <UserX className="w-3.5 h-3.5" />
                Kick
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function InfoBlock({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl shadow-sm h-full bg-zinc-900/90 border-zinc-800 text-zinc-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-lg text-zinc-100">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {action}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-zinc-100">{children}</CardContent>
    </Card>
  );
}

export default function App() {
  const [screen, setScreen] = useState<"setup" | "home" | "room" | "game">(
    "home",
  );
  const [playerName, setPlayerName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [disconnectAlert, setDisconnectAlert] = useState("");
  const [rejoinAlert, setRejoinAlert] = useState("");
  const [kickedAlert, setKickedAlert] = useState("");
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [roomActionLoading, setRoomActionLoading] = useState<
    "create" | "join" | null
  >(null);
  const [hasSession, setHasSession] = useState(false);

  const [myId, setMyId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [showFactHistory, setShowFactHistory] = useState(false);
  const [isHostJudge, setIsHostJudge] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const socket = getSocket();

  useEffect(() => {
    const savedName = localStorage.getItem("court_nickname");
    const savedAvatar = localStorage.getItem("court_avatar");
    if (savedAvatar) setAvatar(savedAvatar);

    if (savedName) {
      setPlayerName(savedName);
      const sessionCode = localStorage.getItem("court_session");
      if (sessionCode) {
        setHasSession(true);
        socket.emit("rejoin_room", {
          code: sessionCode,
          playerName: savedName,
          avatar: savedAvatar,
        });
      }
    } else {
      setScreen("setup");
    }
  }, []);

  useEffect(() => {
    socket.on(
      "room_joined",
      ({ playerId, state }: { playerId: string; state: any }) => {
        setRoomActionLoading(null);
        setMyId(playerId);
        localStorage.setItem("court_session", state.code);
        setHasSession(true);
        if (state.type === "room") {
          setRoom(state as RoomState);
          setIsHostJudge(state.isHostJudge ?? false);
          setGame(null);
          setScreen("room");
        } else {
          setGame(state as GameState);
          setRoom(null);
          setScreen("game");
        }
      },
    );

    socket.on(
      "room_updated",
      ({ players, hostId, isHostJudge: hj }: { players: PlayerInfo[]; hostId: string; isHostJudge?: boolean }) => {
        setRoom((prev) => (prev ? { ...prev, players, hostId } : prev));
        if (hj !== undefined) setIsHostJudge(hj);
      },
    );

    socket.on(
      "player_left",
      ({ playerName: name }: { playerId: string; playerName: string }) => {
        setDisconnectAlert(`⚠️ ${name} покинул игру`);
        setTimeout(() => setDisconnectAlert(""), 6000);
      },
    );

    socket.on(
      "player_rejoined",
      ({ playerName: name }: { playerName: string }) => {
        setRejoinAlert(`${name} вернулся в игру`);
        setTimeout(() => setRejoinAlert(""), 4000);
      },
    );

    socket.on("rejoin_failed", () => {
      setRoomActionLoading(null);
      localStorage.removeItem("court_session");
      setHasSession(false);
      setScreen("home");
    });

    socket.on("kicked", () => {
      setRoomActionLoading(null);
      localStorage.removeItem("court_session");
      setHasSession(false);
      setRoom(null);
      setGame(null);
      setMyId(null);
      setJoinCode("");
      setDisconnectAlert("");
      setRejoinAlert("");
      setCopiedRoomCode(false);
      setIsHostJudge(false);
      setScreen("home");
      setKickedAlert(
        "\u0412\u044b \u0431\u044b\u043b\u0438 \u043a\u0438\u043a\u043d\u0443\u0442\u044b \u0438\u0437 \u043a\u043e\u043c\u043d\u0430\u0442\u044b.",
      );
      setTimeout(() => setKickedAlert(""), 5000);
    });

    socket.on("game_started", ({ state }: { state: any }) => {
      setGame(state as GameState);
      setRoom(null);
      setScreen("game");
    });

    socket.on(
      "facts_updated",
      ({ revealedFacts }: { revealedFacts: RevealedFact[] }) => {
        setGame((prev) => (prev ? { ...prev, revealedFacts } : prev));
      },
    );

    socket.on("my_facts_updated", ({ facts }: { facts: Fact[] }) => {
      setGame((prev) =>
        prev && prev.me ? { ...prev, me: { ...prev.me, facts } } : prev,
      );
    });

    socket.on("cards_updated", ({ usedCards }: { usedCards: UsedCard[] }) => {
      setGame((prev) => (prev ? { ...prev, usedCards } : prev));
    });

    socket.on("my_cards_updated", ({ cards }: { cards: Card_[] }) => {
      setGame((prev) =>
        prev && prev.me ? { ...prev, me: { ...prev.me, cards } } : prev,
      );
    });

    socket.on("stage_updated", ({ stageIndex }: { stageIndex: number }) => {
      setGame((prev) => (prev ? { ...prev, stageIndex } : prev));
    });

    socket.on(
      "verdict_set",
      ({ verdict, verdictEvaluation, finished }: any) => {
        setGame((prev) =>
          prev ? { ...prev, verdict, verdictEvaluation, finished } : prev,
        );
      },
    );

    socket.on("error", ({ message }: { message: string }) => {
      setRoomActionLoading(null);
      setError(message);
      setTimeout(() => setError(""), 4000);
    });

    return () => {
      socket.off("room_joined");
      socket.off("room_updated");
      socket.off("player_left");
      socket.off("player_rejoined");
      socket.off("rejoin_failed");
      socket.off("kicked");
      socket.off("game_started");
      socket.off("facts_updated");
      socket.off("my_facts_updated");
      socket.off("cards_updated");
      socket.off("my_cards_updated");
      socket.off("stage_updated");
      socket.off("verdict_set");
      socket.off("error");
    };
  }, [socket]);

  const createRoom = useCallback(() => {
    if (roomActionLoading) return;
    const name = playerName.trim() || "Игрок";
    localStorage.setItem("court_nickname", name);
    setRoomActionLoading("create");
    socket.emit("create_room", { playerName: name, avatar });
  }, [socket, playerName, avatar, roomActionLoading]);

  const joinRoom = useCallback(() => {
    if (roomActionLoading) return;
    if (!joinCode.trim()) return;
    const name = playerName.trim() || "Игрок";
    setRoomActionLoading("join");
    socket.emit("join_room", {
      code: joinCode.trim().toUpperCase(),
      playerName: name,
      avatar,
    });
  }, [socket, joinCode, playerName, avatar, roomActionLoading]);

  const reconnect = useCallback(() => {
    const savedName = localStorage.getItem("court_nickname");
    const sessionCode = localStorage.getItem("court_session");
    const savedAvatar = localStorage.getItem("court_avatar");
    if (savedName && sessionCode) {
      socket.emit("rejoin_room", {
        code: sessionCode,
        playerName: savedName,
        avatar: savedAvatar,
      });
    }
  }, [socket]);

  const startGame = useCallback(() => {
    if (!room || !myId) return;
    socket.emit("start_game", { code: room.code, playerId: myId });
  }, [socket, room, myId]);

  const toggleHostJudge = useCallback((checked: boolean) => {
    if (!room || !myId) return;
    setIsHostJudge(checked);
    socket.emit("set_host_judge", { code: room.code, playerId: myId, isHostJudge: checked });
  }, [socket, room, myId]);

  const kickPlayerFromRoom = useCallback(
    (targetPlayerId: string) => {
      if (!room || !myId || myId !== room.hostId) return;
      socket.emit("kick_player", {
        code: room.code,
        playerId: myId,
        targetPlayerId,
      });
    },
    [socket, room, myId],
  );

  const revealFact = useCallback(
    (factId: string) => {
      if (!game || !myId) return;
      socket.emit("reveal_fact", { code: game.code, playerId: myId, factId });
    },
    [socket, game, myId],
  );

  const useCard = useCallback(
    (cardId: string) => {
      if (!game || !myId) return;
      socket.emit("use_card", { code: game.code, playerId: myId, cardId });
    },
    [socket, game, myId],
  );

  const advanceStage = useCallback(() => {
    if (!game || !myId) return;
    socket.emit("next_stage", { code: game.code, playerId: myId });
  }, [socket, game, myId]);

  const retreatStage = useCallback(() => {
    if (!game || !myId) return;
    socket.emit("prev_stage", { code: game.code, playerId: myId });
  }, [socket, game, myId]);

  const submitVerdict = useCallback(
    (verdict: string) => {
      if (!game || !myId) return;
      socket.emit("set_verdict", { code: game.code, playerId: myId, verdict });
    },
    [socket, game, myId],
  );

  const resetAll = useCallback(() => {
    socket.emit("leave_room");
    setScreen("home");
    setRoom(null);
    setGame(null);
    setMyId(null);
    setJoinCode("");
    setDisconnectAlert("");
    setRejoinAlert("");
    setKickedAlert("");
    setCopiedRoomCode(false);
    setRoomActionLoading(null);
    setIsHostJudge(false);
  }, [socket]);

  const finalExit = useCallback(() => {
    socket.emit("leave_room");
    localStorage.removeItem("court_session");
    setHasSession(false);
    setScreen("home");
    setRoom(null);
    setGame(null);
    setMyId(null);
    setJoinCode("");
    setKickedAlert("");
    setCopiedRoomCode(false);
    setRoomActionLoading(null);
  }, [socket]);

  const setupNickname = useCallback(() => {
    const name = playerName.trim();
    if (!name) return;
    localStorage.setItem("court_nickname", name);
    setScreen("home");
  }, [playerName]);

  const compressAvatar = useCallback(
    (inputDataUrl: string): Promise<string> =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxSide = 256;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(inputDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };
        img.onerror = () => resolve(inputDataUrl);
        img.src = inputDataUrl;
      }),
    [],
  );

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const compactAvatar = await compressAvatar(dataUrl);
        setAvatar(compactAvatar);
        localStorage.setItem("court_avatar", compactAvatar);
      };
      reader.readAsDataURL(file);
    },
    [compressAvatar],
  );

  const copyCode = useCallback((code: string) => {
    if (!navigator.clipboard) {
      setError("Не удалось скопировать код комнаты.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedRoomCode(true);
        setTimeout(() => setCopiedRoomCode(false), 2000);
      })
      .catch(() => {
        setError("Не удалось скопировать код комнаты.");
        setTimeout(() => setError(""), 4000);
      });
  }, []);

  if (screen === "setup") {
    return (
      <motion.div
        key="setup"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6"
      >
        <div className="w-full max-w-sm space-y-4">
          <Card className="rounded-[28px] border-zinc-800 bg-zinc-900/95 text-zinc-100">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2 text-center">
                <Badge className="rounded-full px-3 py-1 text-sm bg-red-600/90 text-white border-0">
                  СУД
                </Badge>
                <h1 className="text-2xl font-bold pt-2">Добро пожаловать!</h1>
                <p className="text-sm text-zinc-400">
                  Придумайте никнейм — он сохранится и будет привязан к вам в
                  каждой игре.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative cursor-pointer group"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Avatar src={avatar} name={playerName || "?"} size={72} />
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <span className="text-xs text-zinc-500">
                  Нажмите, чтобы добавить фото
                </span>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ваш никнейм</label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Например: Артём"
                  className="h-12 rounded-xl bg-zinc-100 text-zinc-950 placeholder:text-zinc-400 border-0 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                  onKeyDown={(e) => e.key === "Enter" && setupNickname()}
                  autoFocus
                />
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={setupNickname}
                  disabled={!playerName.trim()}
                  className="w-full h-12 rounded-xl text-base bg-red-600 hover:bg-red-500 text-white border-0 disabled:bg-zinc-700 disabled:text-zinc-500"
                >
                  Продолжить
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  if (screen === "home") {
    return (
      <motion.div
        key="home"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10"
      >
        <AnimatePresence>
          {kickedAlert && (
            <motion.div
              key="kicked"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-w-6xl mx-auto mb-4 bg-red-600/20 border border-red-600/40 text-red-300 rounded-xl px-4 py-3 text-sm"
            >
              {kickedAlert}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6 items-stretch">
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="initial"
            animate="animate"
          >
            <Card className="rounded-[28px] shadow-sm border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 h-full text-zinc-100">
              <CardContent className="p-8 md:p-10 h-full flex flex-col justify-between gap-8">
                <div className="space-y-5">
                  <Badge className="rounded-full px-3 py-1 text-sm bg-red-600/90 hover:bg-red-600 text-white border-0">
                    Made By Berly
                  </Badge>
                  <div className="space-y-3">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                      СУД
                    </h1>
                    <p className="text-base md:text-lg text-zinc-400 max-w-xl">
                      Ролевая настольная игра о судебных разбирательствах.
                      Получите роль, изучите факты дела и попробуйте убедить
                      судью в своей правоте.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { title: "3–6 игроков", sub: "Разные роли и режимы" },
                    { title: "Карты Механик", sub: "Дают особые возможности" },
                    { title: "Улики", sub: "Объективные и общие" },
                    { title: "Факты", sub: "Раскрываются по ходу суда" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      custom={i + 1}
                      variants={cardVariants}
                      initial="initial"
                      animate="animate"
                    >
                      <Card className="rounded-2xl bg-zinc-900/90 border-zinc-800 text-zinc-100">
                        <CardContent className="p-4">
                          <div className="font-semibold">{item.title}</div>
                          <div className="text-zinc-400 mt-1">{item.sub}</div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            custom={1}
            variants={cardVariants}
            initial="initial"
            animate="animate"
          >
            <Card className="rounded-[28px] shadow-sm h-full bg-zinc-900/95 border-zinc-800 text-zinc-100">
              <CardContent className="p-8 md:p-10 space-y-6">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="bg-red-600/20 border border-red-600/40 text-red-400 rounded-xl px-4 py-3 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-4">
                  <div
                    className="relative cursor-pointer group flex-shrink-0"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Avatar src={avatar} name={playerName} size={52} />
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Ваш никнейм</label>
                    <Input
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        if (e.target.value.trim())
                          localStorage.setItem(
                            "court_nickname",
                            e.target.value.trim(),
                          );
                      }}
                      placeholder="Например: Артём"
                      className="h-11 rounded-xl bg-zinc-100 text-zinc-950 placeholder:text-zinc-400 border-0 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      onClick={createRoom}
                      disabled={roomActionLoading !== null}
                      className="w-full h-12 rounded-xl text-base gap-2 bg-red-600 hover:bg-red-500 text-white border-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      {roomActionLoading === "create"
                        ? "Создание..."
                        : "Создать комнату"}
                    </Button>
                  </motion.div>

                  <div className="flex gap-3">
                    <Input
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase())
                      }
                      placeholder="Код комнаты"
                      className="h-12 rounded-xl bg-zinc-100 text-zinc-950 placeholder:text-zinc-400 border-0 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                      onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                    />
                    <motion.div
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Button
                        onClick={joinRoom}
                        variant="secondary"
                        disabled={
                          roomActionLoading !== null || !joinCode.trim()
                        }
                        className="h-12 rounded-xl px-6 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0"
                      >
                        {roomActionLoading === "join" ? "Вход..." : "Войти"}
                      </Button>
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {hasSession && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28 }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Button
                            onClick={reconnect}
                            variant="outline"
                            disabled={roomActionLoading !== null}
                            className="w-full h-12 rounded-xl border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300 gap-2"
                          >
                            ↩ Переподключиться к игре
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="font-semibold">Функционал</div>
                  <div className="grid gap-2 text-sm text-zinc-400">
                    <div>• создайте комнату и поделитесь кодом с игроками</div>
                    <div>
                      • ведущий запускает игру и роли раздаются автоматически
                    </div>
                    <div>• каждый видит только свои факты и карты механик</div>
                    <div>
                      • раскрытые факты и использованные карты видят все
                    </div>
                    <div>• судья меняет этапы и выносит финальный вердикт</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (screen === "room" && room) {
    return (
      <motion.div
        key="room"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-600/20 border border-red-600/40 text-red-400 rounded-xl px-4 py-3 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            custom={0}
            variants={cardVariants}
            initial="initial"
            animate="animate"
          >
            <Card className="rounded-[28px] shadow-sm bg-zinc-900/95 border-zinc-800 text-zinc-100">
              <CardContent className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Scale className="w-4 h-4" />
                    Код комнаты
                  </div>
                  <div className="text-3xl font-bold tracking-[0.25em] text-red-400">
                    {room.code}
                  </div>
                  <div className="text-sm text-zinc-400">
                    Поделитесь кодом с другими игроками • 3–6 участников
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    className="rounded-xl gap-2 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0"
                    onClick={() => copyCode(room.code)}
                  >
                    <Copy className="w-4 h-4" />
                    {copiedRoomCode ? "Скопировано" : "Скопировать"}
                  </Button>
                  {myId === room.hostId && (
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Button
                        className="rounded-xl gap-2 bg-red-600 hover:bg-red-500 text-white border-0 disabled:bg-zinc-800 disabled:text-zinc-500"
                        onClick={startGame}
                        disabled={
                          room.players.length < 3 || room.players.length > 6
                        }
                      >
                        <Play className="w-4 h-4" />
                        Начать игру
                      </Button>
                    </motion.div>
                  )}
                  <Button
                    variant="outline"
                    className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100"
                    onClick={resetAll}
                  >
                    Выйти
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <motion.div
              custom={1}
              variants={cardVariants}
              initial="initial"
              animate="animate"
            >
              <InfoBlock
                title="Игроки в комнате"
                icon={<UserPlus className="w-5 h-5" />}
                action={myId === room.hostId ? (
                  <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800/60">
                    <label htmlFor="host-judge" className="text-sm font-medium text-zinc-200 cursor-pointer select-none">
                      Я - Судья
                    </label>
                    <Switch
                      id="host-judge"
                      checked={isHostJudge}
                      onCheckedChange={toggleHostJudge}
                    />
                  </div>
                ) : undefined}
              >
                <div className="grid gap-3">
                  <AnimatePresence>
                    {room.players.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        isHost={player.id === room.hostId}
                        canKick={myId === room.hostId && player.id !== room.hostId}
                        onKick={() => kickPlayerFromRoom(player.id)}
                      />
                    ))}
                  </AnimatePresence>
                  {room.players.length < 3 && (
                    <div className="text-sm text-zinc-500 mt-2">
                      Ожидание игроков... (нужно ещё минимум{" "}
                      {3 - room.players.length})
                    </div>
                  )}
                </div>
              </InfoBlock>
            </motion.div>

            <motion.div
              custom={2}
              variants={cardVariants}
              initial="initial"
              animate="animate"
            >
              <InfoBlock
                title="Доступные режимы"
                icon={<Gavel className="w-5 h-5" />}
              >
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Игроков сейчас</span>
                    <Badge className="bg-zinc-800 text-zinc-100 border border-zinc-700">
                      {room.players.length}
                    </Badge>
                  </div>
                  <Separator />
                  {room.players.length === 3 && (
                    <div>Гражданский спор, трудовой спор</div>
                  )}
                  {room.players.length === 4 && <div>Уголовное дело</div>}
                  {room.players.length === 5 && <div>Уголовное дело</div>}
                  {room.players.length >= 6 && <div>Суд на компанию</div>}
                  <div className="text-zinc-400 pt-2">
                    Ведущий запускает игру, сайт случайно выбирает подходящее
                    дело и распределяет роли.
                  </div>
                </div>
              </InfoBlock>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (screen === "game" && game && game.me) {
    const currentStage = stages[game.stageIndex];
    const stageProgress = ((game.stageIndex + 1) / stages.length) * 100;
    const isHost = myId === game.hostId;
    const isJudge = game.me.roleKey === "judge";
    const judgePlayer = game.players.find((p) => p.roleKey === "judge");
    const visibleFacts = game.revealedFacts.slice(-4);
    const visibleCards = game.usedCards.slice(-4);
    const latestRevealedFactId =
      game.revealedFacts.length > 0
        ? game.revealedFacts[game.revealedFacts.length - 1].id
        : null;
    const latestUsedCardId =
      game.usedCards.length > 0
        ? game.usedCards[game.usedCards.length - 1].id
        : null;
    const isPreparationStage = game.stageIndex === 0;
    const isOpeningSpeechStage = game.stageIndex === 1;
    const openingSpeechRevealedFacts = game.revealedFacts.filter(
      (fact) => fact.stageIndex === 1,
    ).length;
    const isOpeningSpeechFactLimitReached =
      isOpeningSpeechStage && openingSpeechRevealedFacts >= 2;

    return (
      <motion.div
        key="game"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10"
      >
        <AnimatePresence>
          {showFactHistory && (
            <motion.div
              key="fact-history-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-6"
              onClick={(e) =>
                e.target === e.currentTarget && setShowFactHistory(false)
              }
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 16 }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
                className="w-full max-w-lg max-h-[80vh] flex flex-col"
              >
                <Card className="rounded-[28px] border-zinc-800 bg-zinc-900 text-zinc-100 flex flex-col overflow-hidden">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <CardTitle className="flex items-center justify-between text-lg text-zinc-100">
                      <span className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        История фактов
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg h-8 w-8 p-0"
                        onClick={() => setShowFactHistory(false)}
                      >
                        ✕
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-y-auto flex-1 space-y-3 pb-6">
                    {game.revealedFacts.length === 0 ? (
                      <div className="text-sm text-zinc-400">
                        Пока никто не раскрыл ни одного факта.
                      </div>
                    ) : (
                      game.revealedFacts.map((fact, i) => {
                        const ownerPlayer = game.players.find(
                          (p) => p.id === fact.ownerId,
                        );
                        return (
                          <motion.div
                            key={fact.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                          >
                            <Card className="rounded-2xl border-dashed border-zinc-700 bg-zinc-800/60 text-zinc-100">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Avatar
                                      src={ownerPlayer?.avatar ?? null}
                                      name={fact.owner}
                                      size={30}
                                    />
                                    <div className="font-semibold text-sm truncate">
                                      {fact.owner}
                                    </div>
                                  </div>
                                  <Badge className="bg-zinc-700 text-zinc-100 border border-zinc-600">
                                    {fact.ownerRole}
                                  </Badge>
                                </div>
                                <div className="text-sm text-zinc-400">
                                  {fact.text}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {game.finished && (
            <motion.div
              key="verdict-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 32 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: 0.1,
                  type: "spring",
                  stiffness: 220,
                  damping: 22,
                }}
                className="w-full max-w-lg"
              >
                <Card className="rounded-[28px] border-zinc-800 bg-zinc-900 text-zinc-100">
                  <CardContent className="p-8 space-y-6 text-center">
                    <div className="space-y-2">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                      >
                        <Badge className="rounded-full px-3 py-1 text-sm bg-red-600/90 text-white border-0">
                          Игра завершена
                        </Badge>
                      </motion.div>
                      <h1 className="text-3xl font-bold pt-2">Вердикт суда</h1>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="bg-zinc-800/60 rounded-2xl p-6 space-y-1"
                    >
                      <div className="text-sm text-zinc-400">Решение судьи</div>
                      <div className="text-2xl font-bold text-red-400">
                        {game.verdict}
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-left space-y-3"
                    >
                      <div className="bg-zinc-800/40 rounded-2xl p-4">
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                          Реальная правда дела
                        </div>
                        <div className="text-sm text-zinc-300">
                          {game.caseData.truth}
                        </div>
                      </div>
                      {game.verdictEvaluation && (
                        <div className="bg-red-600/10 border border-red-600/30 rounded-2xl p-4">
                          <div className="text-sm font-medium text-red-400">
                            {game.verdictEvaluation}
                          </div>
                        </div>
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.55 }}
                    >
                      <Button
                        onClick={finalExit}
                        className="w-full h-12 rounded-xl text-base bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0"
                      >
                        Выйти в главное меню
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-600/20 border border-red-600/40 text-red-400 rounded-xl px-4 py-3 text-sm"
              >
                {error}
              </motion.div>
            )}
            {disconnectAlert && (
              <motion.div
                key="disc"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 rounded-xl px-4 py-3 text-sm font-medium"
              >
                {disconnectAlert}
              </motion.div>
            )}
            {rejoinAlert && (
              <motion.div
                key="rej"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-green-500/15 border border-green-500/40 text-green-300 rounded-xl px-4 py-3 text-sm font-medium"
              >
                ✓ {rejoinAlert}
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="rounded-[28px] shadow-sm border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Badge className="bg-zinc-800 text-zinc-100 border border-zinc-700">
                      {game.caseData.mode}
                    </Badge>
                    <span>{game.caseData.title}</span>
                    <span className="text-zinc-600">• Комната {game.code}</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {game.caseData.description}
                  </h1>
                </div>

                <div className="min-w-[260px] space-y-3">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStage}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.25 }}
                      className="text-sm font-medium"
                    >
                      Этап: {currentStage}
                    </motion.div>
                  </AnimatePresence>
                  <Progress
                    value={stageProgress}
                    className="h-3 bg-zinc-800 [&>div]:bg-red-600 [&>div]:transition-all [&>div]:duration-500"
                  />
                  <div className="flex flex-wrap gap-3">
                    {(isHost || isJudge) && (
                      <>
                        <Button
                          variant="outline"
                          className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
                          onClick={retreatStage}
                          disabled={game.stageIndex <= 0 || game.finished}
                        >
                          ← Пред.
                        </Button>
                        <Button
                          variant="secondary"
                          className="rounded-xl bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0 disabled:bg-zinc-800 disabled:text-zinc-500"
                          onClick={advanceStage}
                          disabled={
                            game.stageIndex >= stages.length - 1 ||
                            game.finished
                          }
                        >
                          След. →
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100"
                      onClick={resetAll}
                    >
                      Выйти
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid xl:grid-cols-[1.1fr_1.1fr_0.9fr] gap-6">
            <InfoBlock title="Ваша роль" icon={<Shield className="w-5 h-5" />}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar src={game.me.avatar ?? avatar} name={game.me.name} size={56} />
                  <div>
                    <div className="text-2xl font-bold">
                      {game.me.roleTitle}
                    </div>
                    <div className="text-sm text-zinc-400">{game.me.name}</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold mb-1">Цель</div>
                  <p className="text-sm text-zinc-400">{game.me.goal}</p>
                </div>
                <Separator />
                <div>
                  <div className="font-semibold mb-2 text-sm">
                    Все участники
                  </div>
                  <div className="space-y-1">
                    {game.players.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar src={p.avatar ?? null} name={p.name} size={32} />
                          <span className="text-zinc-300 truncate">{p.name}</span>
                        </div>
                        <span className="text-zinc-500">{p.roleTitle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </InfoBlock>

            <InfoBlock title="Улики дела" icon={<Eye className="w-5 h-5" />}>
              <div className="space-y-3">
                {game.caseData.evidence.map((item, index) => (
                  <motion.div
                    key={index}
                    custom={index}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <Card className="rounded-2xl border-dashed border-zinc-700 bg-zinc-900/80 text-zinc-100">
                      <CardContent className="p-4 text-sm">{item}</CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </InfoBlock>

            <InfoBlock title="Вердикт" icon={<Gavel className="w-5 h-5" />}>
              <div className="space-y-3">
                {isJudge ? (
                  <>
                    <div
                      className={`text-sm ${game.stageIndex < stages.length - 1 ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      {game.stageIndex < stages.length - 1
                        ? `Доступно на этапе «${stages[stages.length - 1]}»`
                        : "Финальный этап. Вынесите решение."}
                    </div>
                    {(
                      ["Виновен", "Не виновен", "Частично виновен"] as const
                    ).map((v, i) => (
                      <motion.div
                        key={v}
                        custom={i}
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Button
                          className={`w-full rounded-xl border-0 disabled:bg-zinc-800 disabled:text-zinc-500 ${i === 0 ? "bg-red-600 hover:bg-red-500 text-white" : i === 1 ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200" : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"}`}
                          onClick={() => submitVerdict(v)}
                          disabled={
                            game.stageIndex < stages.length - 1 || game.finished
                          }
                        >
                          {v}
                        </Button>
                      </motion.div>
                    ))}
                  </>
                ) : (
                  <div className="text-sm text-zinc-400">
                    Вердикт выносит судья
                    {judgePlayer ? ` — ${judgePlayer.name}` : ""}.
                    {game.stageIndex < stages.length - 1 && (
                      <span className="block mt-1 text-zinc-500">
                        Дождитесь последнего этапа.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </InfoBlock>
          </div>

          <div
            className={`grid gap-6 ${isJudge ? "xl:grid-cols-2" : "xl:grid-cols-[1fr_1fr_1fr_1fr]"}`}
          >
            <InfoBlock
              title="Раскрытые факты"
              icon={<Eye className="w-5 h-5" />}
              action={
                game.revealedFacts.length > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg h-7 px-2"
                    onClick={() => setShowFactHistory(true)}
                  >
                    История ({game.revealedFacts.length})
                  </Button>
                ) : undefined
              }
            >
              <div className="space-y-3 min-h-[80px]">
                {visibleFacts.length === 0 ? (
                  <div className="text-sm text-zinc-400">
                    Пока никто не раскрыл ни одного факта.
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {visibleFacts.map((fact) => {
                      const isLatestFact = fact.id === latestRevealedFactId;
                      const ownerPlayer = game.players.find(
                        (p) => p.id === fact.ownerId,
                      );
                      return (
                      <motion.div
                        key={fact.id}
                        variants={entryVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                      >
                        <Card
                          className={
                            isLatestFact
                              ? "rounded-2xl border border-red-500/35 bg-red-950/15 text-zinc-100 ring-1 ring-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.12)]"
                              : "rounded-2xl border-dashed border-zinc-700 bg-zinc-900/80 text-zinc-100"
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar
                                  src={ownerPlayer?.avatar ?? null}
                                  name={fact.owner}
                                  size={30}
                                />
                                <div className="font-semibold text-sm truncate">
                                  {fact.owner}
                                </div>
                              </div>
                              <Badge
                                className={
                                  isLatestFact
                                    ? "bg-red-600/20 text-red-100 border border-red-500/30"
                                    : "bg-zinc-800 text-zinc-100 border border-zinc-700"
                                }
                              >
                                {fact.ownerRole}
                              </Badge>
                            </div>
                            <div className="text-sm text-zinc-400">
                              {fact.text}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </InfoBlock>

            {!isJudge && (
              <InfoBlock
                title="Ваши факты"
                icon={<AlertCircle className="w-5 h-5" />}
              >
                <div className="space-y-3">
                  {game.me.facts.length === 0 ? (
                    <div className="text-sm text-zinc-400">
                      У вас нет фактов для раскрытия.
                    </div>
                  ) : (
                    game.me.facts.map((fact) => (
                      <Card
                        key={fact.id}
                        className="rounded-2xl bg-zinc-900/80 border-zinc-800 text-zinc-100"
                      >
                        <CardContent className="p-4 flex flex-col gap-3">
                          <div className="text-sm">{fact.text}</div>
                          <div className="flex items-center justify-between gap-3">
                            <Badge
                              className={
                                fact.revealed
                                  ? "bg-red-600 text-white border-0"
                                  : "bg-zinc-800 text-zinc-100 border border-zinc-700"
                              }
                            >
                              {fact.revealed ? "Раскрыт" : "Скрыт"}
                            </Badge>
                            <motion.div
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                            >
                              <Button
                                size="sm"
                                className="rounded-xl bg-red-600 hover:bg-red-500 text-white border-0 disabled:bg-zinc-800 disabled:text-zinc-500"
                                onClick={() => revealFact(fact.id)}
                                disabled={
                                  fact.revealed ||
                                  game.finished ||
                                  isPreparationStage ||
                                  isOpeningSpeechFactLimitReached
                                }
                              >
                                Раскрыть
                              </Button>
                            </motion.div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </InfoBlock>
            )}

            {!isJudge && (
              <InfoBlock
                title="Ваши карты механик"
                icon={<Scale className="w-5 h-5" />}
              >
                <div className="space-y-3">
                  {game.me.cards.map((card) => (
                    <Card
                      key={card.id}
                      className="rounded-2xl bg-zinc-900/80 border-zinc-800 text-zinc-100"
                    >
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div>
                          <div className="font-semibold">{card.name}</div>
                          <div className="text-sm text-zinc-400 mt-1">
                            {card.description}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <Badge
                            className={
                              card.used
                                ? "border border-zinc-700 bg-zinc-900 text-zinc-300"
                                : "bg-red-600 text-white border-0"
                            }
                          >
                            {card.used ? "Использована" : "Готова"}
                          </Badge>
                          <motion.div
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                          >
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-xl bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0 disabled:bg-zinc-800 disabled:text-zinc-500"
                              onClick={() => useCard(card.id)}
                              disabled={card.used || game.finished || isPreparationStage}
                            >
                              Применить
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </InfoBlock>
            )}

            <InfoBlock
              title="Журнал механик"
              icon={<Sparkles className="w-5 h-5" />}
            >
              <div className="space-y-3 min-h-[80px]">
                {visibleCards.length === 0 ? (
                  <div className="text-sm text-zinc-400">
                    Пока ни одна карта не была использована.
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {visibleCards.map((entry) => {
                      const isLatestCard = entry.id === latestUsedCardId;
                      const ownerPlayer = game.players.find(
                        (p) => p.id === entry.ownerId,
                      );
                      return (
                      <motion.div
                        key={entry.id}
                        variants={entryVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                      >
                        <Card
                          className={
                            isLatestCard
                              ? "rounded-2xl border border-red-500/35 bg-red-950/15 text-zinc-100 ring-1 ring-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.12)]"
                              : "rounded-2xl border-dashed border-zinc-700 bg-zinc-900/80 text-zinc-100"
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar
                                  src={ownerPlayer?.avatar ?? null}
                                  name={entry.owner}
                                  size={30}
                                />
                                <div className="font-semibold text-sm truncate">
                                  {entry.owner}
                                </div>
                              </div>
                              <Badge
                                className={
                                  isLatestCard
                                    ? "bg-red-600/20 text-red-100 border border-red-500/30"
                                    : "bg-zinc-800 text-zinc-100 border border-zinc-700"
                                }
                              >
                                {entry.ownerRole}
                              </Badge>
                            </div>
                            <div className="font-semibold">{entry.name}</div>
                            <div className="text-sm text-zinc-400 mt-1">
                              {entry.description}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </InfoBlock>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
        className="text-zinc-400 text-sm"
      >
        Загрузка...
      </motion.div>
    </div>
  );
}

