import { Router } from "express";
import {
  changeEmailByToken,
  changePasswordByToken,
  getPublicUserProfileById,
  getUserByToken,
  loginAccount,
  logoutByToken,
  registerAccount,
  updateProfileByToken,
} from "../lib/authStore.js";

const authRouter = Router();

function readBearerToken(value: string | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.toLowerCase().startsWith("bearer ")) {
    const token = raw.slice(7).trim();
    return token || null;
  }
  return raw;
}

function getRequestToken(headers: Record<string, unknown>): string | null {
  const authorization = headers["authorization"];
  if (typeof authorization === "string") {
    return readBearerToken(authorization);
  }
  const xAuth = headers["x-auth-token"];
  if (typeof xAuth === "string") {
    return readBearerToken(xAuth);
  }
  return null;
}

authRouter.post("/auth/register", async (req, res) => {
  try {
    const login = String(req.body?.login ?? "").trim();
    const email = String(req.body?.email ?? "").trim();
    const password = String(req.body?.password ?? "");
    const confirmPassword = String(req.body?.confirmPassword ?? "");
    const acceptRules = Boolean(req.body?.acceptRules);

    if (!login || login.length < 3) {
      return res.status(400).json({ message: "Login must be at least 3 characters." });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    if (!acceptRules) {
      return res
        .status(400)
        .json({ message: "You must accept the site rules." });
    }

    const { user, token } = await registerAccount({
      login,
      email,
      password,
      nickname: login,
    });
    return res.status(201).json({ user, token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return res.status(400).json({ message });
  }
});

authRouter.post("/auth/login", async (req, res) => {
  try {
    const loginOrEmail = String(req.body?.loginOrEmail ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!loginOrEmail || !password) {
      return res.status(400).json({ message: "Please enter login/email and password." });
    }

    const { user, token } = await loginAccount({ loginOrEmail, password });
    return res.status(200).json({ user, token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return res.status(401).json({ message });
  }
});

authRouter.get("/auth/me", async (req, res) => {
  const token = getRequestToken(req.headers as Record<string, unknown>);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  const user = await getUserByToken(token);
  if (!user) {
    return res.status(401).json({ message: "Invalid session." });
  }
  return res.status(200).json({ user });
});

authRouter.post("/auth/logout", async (req, res) => {
  const token = getRequestToken(req.headers as Record<string, unknown>);
  if (token) {
    await logoutByToken(token);
  }
  return res.status(200).json({ ok: true });
});

authRouter.patch("/auth/profile", async (req, res) => {
  const token = getRequestToken(req.headers as Record<string, unknown>);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  try {
    const nickname =
      typeof req.body?.nickname === "string" ? req.body.nickname.slice(0, 20) : undefined;
    const avatar =
      req.body?.avatar === null || typeof req.body?.avatar === "string"
        ? req.body.avatar
        : undefined;
    const banner =
      req.body?.banner === null || typeof req.body?.banner === "string"
        ? req.body.banner
        : undefined;
    const bio =
      req.body?.bio === null || typeof req.body?.bio === "string"
        ? req.body.bio
        : undefined;
    const gender =
      req.body?.gender === null || typeof req.body?.gender === "string"
        ? req.body.gender
        : undefined;
    const birthDate =
      req.body?.birthDate === null || typeof req.body?.birthDate === "string"
        ? req.body.birthDate
        : undefined;
    const hideAge =
      typeof req.body?.hideAge === "boolean" ? req.body.hideAge : undefined;
    const updatedUser = await updateProfileByToken(token, {
      nickname,
      avatar,
      banner,
      bio,
      gender:
        gender === "male" || gender === "female" || gender === "other" || gender === null
          ? gender
          : undefined,
      birthDate,
      hideAge,
    });
    if (!updatedUser) {
      return res.status(401).json({ message: "Invalid session." });
    }
    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile update failed.";
    return res.status(400).json({ message });
  }
});

authRouter.patch("/auth/password", async (req, res) => {
  const token = getRequestToken(req.headers as Record<string, unknown>);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  try {
    const currentPassword = String(req.body?.currentPassword ?? "");
    const nextPassword = String(req.body?.nextPassword ?? "");
    if (!currentPassword || !nextPassword) {
      return res.status(400).json({ message: "Current password and new password are required." });
    }
    if (nextPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await changePasswordByToken(token, currentPassword, nextPassword);
    if (!user) {
      return res.status(401).json({ message: "Invalid session." });
    }

    return res.status(200).json({ user, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password change failed.";
    return res.status(400).json({ message });
  }
});

authRouter.patch("/auth/email", async (req, res) => {
  const token = getRequestToken(req.headers as Record<string, unknown>);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  try {
    const currentPassword = String(req.body?.currentPassword ?? "");
    const nextEmail = String(req.body?.nextEmail ?? "").trim();
    if (!currentPassword || !nextEmail) {
      return res.status(400).json({ message: "Current password and new email are required." });
    }
    if (!nextEmail.includes("@")) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    const user = await changeEmailByToken(token, currentPassword, nextEmail);
    if (!user) {
      return res.status(401).json({ message: "Invalid session." });
    }
    return res.status(200).json({ user, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email change failed.";
    return res.status(400).json({ message });
  }
});

authRouter.get("/auth/public/:id", async (req, res) => {
  const id = String(req.params?.id ?? "").trim();
  if (!id) {
    return res.status(400).json({ message: "User id is required." });
  }
  const profile = await getPublicUserProfileById(id);
  if (!profile) {
    return res.status(404).json({ message: "User not found." });
  }
  return res.status(200).json({ profile });
});

export default authRouter;
