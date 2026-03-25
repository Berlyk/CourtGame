import crypto from "node:crypto";
import { pool } from "@workspace/db";

export interface AuthUserPublic {
  id: string;
  login: string;
  email: string;
  nickname: string;
  avatar?: string;
  createdAt: number;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let initPromise: Promise<void> | null = null;

function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeNickname(value: string): string {
  return value.trim().toLowerCase();
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, hashHex: string): boolean {
  const calculated = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (calculated.length !== expected.length) return false;
  return crypto.timingSafeEqual(calculated, expected);
}

function toPublicUser(row: {
  id: string;
  login: string;
  email: string;
  nickname: string;
  avatar: string | null;
  created_at: Date;
}): AuthUserPublic {
  return {
    id: row.id,
    login: row.login,
    email: row.email,
    nickname: row.nickname,
    avatar: row.avatar ?? undefined,
    createdAt: row.created_at.getTime(),
  };
}

async function ensureTables(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS auth_users (
          id UUID PRIMARY KEY,
          login TEXT NOT NULL,
          login_normalized TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          email_normalized TEXT NOT NULL UNIQUE,
          nickname TEXT NOT NULL,
          nickname_normalized TEXT NOT NULL UNIQUE,
          password_salt TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          accepted_rules_at TIMESTAMPTZ NOT NULL,
          avatar TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          token UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
        ON auth_sessions(user_id);
      `);
    })();
  }
  return initPromise;
}

async function cleanupSessions(now = Date.now()) {
  await ensureTables();
  const threshold = new Date(now - SESSION_TTL_MS);
  await pool.query("DELETE FROM auth_sessions WHERE created_at < $1", [threshold]);
}

export async function registerAccount(input: {
  login: string;
  email: string;
  password: string;
  nickname?: string;
}): Promise<{ user: AuthUserPublic; token: string }> {
  await cleanupSessions();

  const login = input.login.trim();
  const email = input.email.trim();
  const nickname = (input.nickname?.trim() || login).slice(0, 20);
  const loginNormalized = normalizeLogin(login);
  const emailNormalized = normalizeEmail(email);
  const nicknameNormalized = normalizeNickname(nickname);

  const conflict = await pool.query<{ login_normalized: string; email_normalized: string; nickname_normalized: string }>(
    `
      SELECT login_normalized, email_normalized, nickname_normalized
      FROM auth_users
      WHERE login_normalized = $1
         OR email_normalized = $2
         OR nickname_normalized = $3
      LIMIT 1
    `,
    [loginNormalized, emailNormalized, nicknameNormalized],
  );

  if (conflict.rowCount) {
    const row = conflict.rows[0];
    if (row.login_normalized === loginNormalized) {
      throw new Error("Login is already taken.");
    }
    if (row.email_normalized === emailNormalized) {
      throw new Error("Email is already in use.");
    }
    if (row.nickname_normalized === nicknameNormalized) {
      throw new Error("Nickname is already taken.");
    }
  }

  const userId = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(input.password, salt);
  const acceptedRulesAt = new Date();

  const userResult = await pool.query<{
    id: string;
    login: string;
    email: string;
    nickname: string;
    avatar: string | null;
    created_at: Date;
  }>(
    `
      INSERT INTO auth_users (
        id,
        login,
        login_normalized,
        email,
        email_normalized,
        nickname,
        nickname_normalized,
        password_salt,
        password_hash,
        accepted_rules_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, login, email, nickname, avatar, created_at
    `,
    [
      userId,
      login,
      loginNormalized,
      email,
      emailNormalized,
      nickname,
      nicknameNormalized,
      salt,
      passwordHash,
      acceptedRulesAt,
    ],
  );

  const token = crypto.randomUUID();
  await pool.query(
    `INSERT INTO auth_sessions (token, user_id, created_at) VALUES ($1, $2, NOW())`,
    [token, userId],
  );

  return { user: toPublicUser(userResult.rows[0]), token };
}

export async function loginAccount(input: {
  loginOrEmail: string;
  password: string;
}): Promise<{ user: AuthUserPublic; token: string }> {
  await cleanupSessions();

  const needle = input.loginOrEmail.trim().toLowerCase();
  const result = await pool.query<{
    id: string;
    login: string;
    email: string;
    nickname: string;
    avatar: string | null;
    created_at: Date;
    password_salt: string;
    password_hash: string;
  }>(
    `
      SELECT id, login, email, nickname, avatar, created_at, password_salt, password_hash
      FROM auth_users
      WHERE login_normalized = $1 OR email_normalized = $1
      LIMIT 1
    `,
    [needle],
  );

  if (!result.rowCount) {
    throw new Error("Invalid login/email or password.");
  }

  const row = result.rows[0];
  if (!verifyPassword(input.password, row.password_salt, row.password_hash)) {
    throw new Error("Invalid login/email or password.");
  }

  const token = crypto.randomUUID();
  await pool.query(
    `INSERT INTO auth_sessions (token, user_id, created_at) VALUES ($1, $2, NOW())`,
    [token, row.id],
  );

  return { user: toPublicUser(row), token };
}

export async function getUserByToken(token: string): Promise<AuthUserPublic | null> {
  await cleanupSessions();

  const result = await pool.query<{
    id: string;
    login: string;
    email: string;
    nickname: string;
    avatar: string | null;
    created_at: Date;
  }>(
    `
      SELECT u.id, u.login, u.email, u.nickname, u.avatar, u.created_at
      FROM auth_sessions s
      JOIN auth_users u ON u.id = s.user_id
      WHERE s.token = $1
      LIMIT 1
    `,
    [token],
  );

  if (!result.rowCount) return null;
  return toPublicUser(result.rows[0]);
}

export async function logoutByToken(token: string): Promise<void> {
  await ensureTables();
  await pool.query(`DELETE FROM auth_sessions WHERE token = $1`, [token]);
}

export async function updateProfileByToken(
  token: string,
  profile: { nickname?: string; avatar?: string | null },
): Promise<AuthUserPublic | null> {
  await cleanupSessions();

  const sessionResult = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM auth_sessions WHERE token = $1 LIMIT 1`,
    [token],
  );
  if (!sessionResult.rowCount) return null;
  const userId = sessionResult.rows[0].user_id;

  if (typeof profile.nickname === "string") {
    const nextNickname = profile.nickname.trim().slice(0, 20);
    if (nextNickname) {
      const nextNormalized = normalizeNickname(nextNickname);
      const conflict = await pool.query(
        `
          SELECT 1
          FROM auth_users
          WHERE id <> $1 AND nickname_normalized = $2
          LIMIT 1
        `,
        [userId, nextNormalized],
      );
      if (conflict.rowCount) {
        throw new Error("Nickname is already taken.");
      }

      await pool.query(
        `
          UPDATE auth_users
          SET nickname = $1, nickname_normalized = $2
          WHERE id = $3
        `,
        [nextNickname, nextNormalized, userId],
      );
    }
  }

  if (profile.avatar !== undefined) {
    await pool.query(
      `
        UPDATE auth_users
        SET avatar = $1
        WHERE id = $2
      `,
      [profile.avatar || null, userId],
    );
  }

  const userResult = await pool.query<{
    id: string;
    login: string;
    email: string;
    nickname: string;
    avatar: string | null;
    created_at: Date;
  }>(
    `
      SELECT id, login, email, nickname, avatar, created_at
      FROM auth_users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (!userResult.rowCount) return null;
  return toPublicUser(userResult.rows[0]);
}
