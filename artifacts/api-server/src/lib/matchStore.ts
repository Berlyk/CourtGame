import { pool } from "@workspace/db";

export interface MatchBinding {
  roomCode: string;
  userId: string;
  playerId: string;
  sessionToken?: string;
  roleKey?: string;
  roleTitle?: string;
}

let initPromise: Promise<void> | null = null;

async function ensureTables(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS match_rooms (
          code TEXT PRIMARY KEY,
          started BOOLEAN NOT NULL DEFAULT FALSE,
          finished BOOLEAN NOT NULL DEFAULT FALSE,
          room_json JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS match_player_bindings (
          room_code TEXT NOT NULL REFERENCES match_rooms(code) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          player_id TEXT NOT NULL,
          session_token TEXT,
          role_key TEXT,
          role_title TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (room_code, user_id)
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS match_player_bindings_room_player_idx
        ON match_player_bindings(room_code, player_id);
      `);
    })();
  }

  return initPromise;
}

function compactRoomSnapshot(room: any): any {
  const sanitizePlayer = (player: any) => ({
    id: player.id,
    userId: player.userId ?? null,
    name: player.name,
    avatar: player.avatar ?? null,
    roleKey: player.roleKey ?? null,
    roleTitle: player.roleTitle ?? null,
    warningCount: typeof player.warningCount === "number" ? player.warningCount : 0,
    disconnectedUntil:
      typeof player.disconnectedUntil === "number" ? player.disconnectedUntil : null,
    sessionToken: player.sessionToken ?? null,
    socketId: player.socketId ?? null,
  });

  return {
    code: room.code,
    roomName: room.roomName ?? null,
    modeKey: room.modeKey,
    maxPlayers: room.maxPlayers,
    hostId: room.hostId,
    createdAt: room.createdAt,
    visibility: room.visibility,
    venueLabel: room.venueLabel ?? null,
    venueUrl: room.venueUrl ?? null,
    started: !!room.started,
    isHostJudge: !!room.isHostJudge,
    players: Array.isArray(room.players) ? room.players.map(sanitizePlayer) : [],
    game: room.game
      ? {
          stageIndex: room.game.stageIndex,
          stages: room.game.stages,
          finished: !!room.game.finished,
          verdict: room.game.verdict ?? "",
          players: Array.isArray(room.game.players)
            ? room.game.players.map(sanitizePlayer)
            : [],
        }
      : null,
  };
}

export async function persistRoomSnapshot(room: any): Promise<void> {
  await ensureTables();

  const roomJson = compactRoomSnapshot(room);
  await pool.query(
    `
      INSERT INTO match_rooms (code, started, finished, room_json, created_at, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, TO_TIMESTAMP($5 / 1000.0), NOW())
      ON CONFLICT (code)
      DO UPDATE SET
        started = EXCLUDED.started,
        finished = EXCLUDED.finished,
        room_json = EXCLUDED.room_json,
        updated_at = NOW()
    `,
    [
      room.code,
      !!room.started,
      !!room.game?.finished,
      JSON.stringify(roomJson),
      Number.isFinite(room.createdAt) ? room.createdAt : Date.now(),
    ],
  );

  await pool.query(`DELETE FROM match_player_bindings WHERE room_code = $1`, [room.code]);

  const byPlayerId = new Map<string, any>();
  for (const player of room.players ?? []) {
    byPlayerId.set(player.id, player);
  }
  for (const player of room.game?.players ?? []) {
    byPlayerId.set(player.id, player);
  }

  for (const player of byPlayerId.values()) {
    if (!player?.userId) continue;
    await pool.query(
      `
        INSERT INTO match_player_bindings (
          room_code, user_id, player_id, session_token, role_key, role_title, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (room_code, user_id)
        DO UPDATE SET
          player_id = EXCLUDED.player_id,
          session_token = EXCLUDED.session_token,
          role_key = EXCLUDED.role_key,
          role_title = EXCLUDED.role_title,
          updated_at = NOW()
      `,
      [
        room.code,
        player.userId,
        player.id,
        player.sessionToken ?? null,
        player.roleKey ?? null,
        player.roleTitle ?? null,
      ],
    );
  }
}

export async function deleteRoomSnapshot(roomCode: string): Promise<void> {
  await ensureTables();
  await pool.query(`DELETE FROM match_rooms WHERE code = $1`, [roomCode]);
}

export async function findBindingByUser(
  roomCode: string,
  userId: string,
): Promise<MatchBinding | null> {
  await ensureTables();
  const result = await pool.query<{
    room_code: string;
    user_id: string;
    player_id: string;
    session_token: string | null;
    role_key: string | null;
    role_title: string | null;
  }>(
    `
      SELECT room_code, user_id, player_id, session_token, role_key, role_title
      FROM match_player_bindings
      WHERE room_code = $1 AND user_id = $2
      LIMIT 1
    `,
    [roomCode, userId],
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    roomCode: row.room_code,
    userId: row.user_id,
    playerId: row.player_id,
    sessionToken: row.session_token ?? undefined,
    roleKey: row.role_key ?? undefined,
    roleTitle: row.role_title ?? undefined,
  };
}

export async function cleanupOldSnapshots(hours = 48): Promise<number> {
  await ensureTables();
  const result = await pool.query<{ count: string }>(
    `
      WITH deleted AS (
        DELETE FROM match_rooms
        WHERE updated_at < NOW() - ($1::text || ' hours')::interval
        RETURNING 1
      )
      SELECT COUNT(*)::text AS count FROM deleted
    `,
    [Math.max(1, Math.floor(hours))],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function loadRoomSnapshots(limit = 300): Promise<any[]> {
  await ensureTables();
  const safeLimit = Math.max(1, Math.min(2000, Math.floor(limit)));
  const result = await pool.query<{ room_json: unknown }>(
    `
      SELECT room_json
      FROM match_rooms
      ORDER BY updated_at DESC
      LIMIT $1
    `,
    [safeLimit],
  );
  return result.rows
    .map((row) => row.room_json)
    .filter((row) => !!row);
}
