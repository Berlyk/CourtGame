import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface AuthUserPublic {
  id: string;
  login: string;
  email: string;
  nickname: string;
  avatar?: string;
  createdAt: number;
}

interface StoredUser extends AuthUserPublic {
  loginNormalized: string;
  emailNormalized: string;
  nicknameNormalized: string;
  passwordSalt: string;
  passwordHash: string;
  acceptedRulesAt: number;
}

interface StoredSession {
  token: string;
  userId: string;
  createdAt: number;
}

interface AuthDbShape {
  users: StoredUser[];
  sessions: StoredSession[];
}

const DATA_DIR = path.resolve(process.cwd(), "artifacts/api-server/data");
const DB_FILE = path.join(DATA_DIR, "auth-db.json");
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: AuthDbShape = { users: [], sessions: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }
}

function readDb(): AuthDbShape {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AuthDbShape>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { users: [], sessions: [] };
  }
}

function writeDb(db: AuthDbShape) {
  ensureDbFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

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

function sanitizeUser(user: StoredUser): AuthUserPublic {
  return {
    id: user.id,
    login: user.login,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

function cleanupSessions(db: AuthDbShape, now = Date.now()) {
  db.sessions = db.sessions.filter((session) => now - session.createdAt < SESSION_TTL_MS);
}

export function registerAccount(input: {
  login: string;
  email: string;
  password: string;
  nickname?: string;
}): { user: AuthUserPublic; token: string } {
  const db = readDb();
  cleanupSessions(db);

  const login = input.login.trim();
  const email = input.email.trim();
  const nickname = (input.nickname?.trim() || login).slice(0, 20);
  const loginNormalized = normalizeLogin(login);
  const emailNormalized = normalizeEmail(email);
  const nicknameNormalized = normalizeNickname(nickname);

  if (db.users.some((u) => u.loginNormalized === loginNormalized)) {
    throw new Error("Login is already taken.");
  }
  if (db.users.some((u) => u.emailNormalized === emailNormalized)) {
    throw new Error("Email is already in use.");
  }
  if (db.users.some((u) => u.nicknameNormalized === nicknameNormalized)) {
    throw new Error("Nickname is already taken.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const user: StoredUser = {
    id: crypto.randomUUID(),
    login,
    email,
    nickname,
    loginNormalized,
    emailNormalized,
    nicknameNormalized,
    passwordSalt: salt,
    passwordHash: hashPassword(input.password, salt),
    acceptedRulesAt: Date.now(),
    createdAt: Date.now(),
  };
  db.users.push(user);

  const token = crypto.randomUUID();
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: Date.now(),
  });

  writeDb(db);
  return { user: sanitizeUser(user), token };
}

export function loginAccount(input: {
  loginOrEmail: string;
  password: string;
}): { user: AuthUserPublic; token: string } {
  const db = readDb();
  cleanupSessions(db);

  const needle = input.loginOrEmail.trim().toLowerCase();
  const user = db.users.find(
    (u) => u.loginNormalized === needle || u.emailNormalized === needle,
  );
  if (!user) {
    throw new Error("Invalid login/email or password.");
  }
  if (!verifyPassword(input.password, user.passwordSalt, user.passwordHash)) {
    throw new Error("Invalid login/email or password.");
  }

  const token = crypto.randomUUID();
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: Date.now(),
  });

  writeDb(db);
  return { user: sanitizeUser(user), token };
}

export function getUserByToken(token: string): AuthUserPublic | null {
  const db = readDb();
  cleanupSessions(db);

  const session = db.sessions.find((s) => s.token === token);
  if (!session) {
    writeDb(db);
    return null;
  }

  const user = db.users.find((u) => u.id === session.userId);
  writeDb(db);
  return user ? sanitizeUser(user) : null;
}

export function logoutByToken(token: string) {
  const db = readDb();
  const nextSessions = db.sessions.filter((s) => s.token !== token);
  if (nextSessions.length !== db.sessions.length) {
    db.sessions = nextSessions;
    writeDb(db);
  }
}

export function updateProfileByToken(
  token: string,
  profile: { nickname?: string; avatar?: string | null },
): AuthUserPublic | null {
  const db = readDb();
  cleanupSessions(db);
  const session = db.sessions.find((s) => s.token === token);
  if (!session) {
    writeDb(db);
    return null;
  }
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    writeDb(db);
    return null;
  }

  if (typeof profile.nickname === "string") {
    const nextNickname = profile.nickname.trim().slice(0, 20);
    if (nextNickname) {
      const nextNormalized = normalizeNickname(nextNickname);
      const conflict = db.users.find(
        (u) => u.id !== user.id && u.nicknameNormalized === nextNormalized,
      );
      if (conflict) {
        throw new Error("Nickname is already taken.");
      }
      user.nickname = nextNickname;
      user.nicknameNormalized = nextNormalized;
    }
  }

  if (profile.avatar !== undefined) {
    user.avatar = profile.avatar || undefined;
  }

  writeDb(db);
  return sanitizeUser(user);
}
