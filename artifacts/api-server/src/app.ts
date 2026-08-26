import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import { HealthCheckResponse } from "@workspace/api-zod";
import router from "./routes";

const app: Express = express();

type RateBucket = {
  count: number;
  resetAt: number;
};

const HTTP_RATE_LIMIT_WINDOW_MS = 60_000;
const HTTP_RATE_LIMIT_DEFAULT = 720;
const HTTP_RATE_LIMIT_API = 360;
const HTTP_RATE_LIMIT_AUTH = 90;
const HTTP_RATE_LIMIT_PAYMENTS = 120;
const httpRateBuckets = new Map<string, RateBucket>();

function getRequestIp(req: Request): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) {
    return cfIp.trim();
  }
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0] ?? "").trim() || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getHttpLimitForPath(pathname: string): number {
  if (pathname.startsWith("/api/auth")) return HTTP_RATE_LIMIT_AUTH;
  if (pathname.startsWith("/api/payments")) return HTTP_RATE_LIMIT_PAYMENTS;
  if (pathname.startsWith("/api")) return HTTP_RATE_LIMIT_API;
  return HTTP_RATE_LIMIT_DEFAULT;
}

function consumeHttpRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const bucket = httpRateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    httpRateBuckets.set(key, { count: 1, resetAt: now + HTTP_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of httpRateBuckets.entries()) {
    if (bucket.resetAt <= now) httpRateBuckets.delete(key);
  }
}, HTTP_RATE_LIMIT_WINDOW_MS).unref();

app.set("trust proxy", 1);
app.use(cors());
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/health" || req.path === "/healthz") {
    next();
    return;
  }
  const limit = getHttpLimitForPath(req.path);
  const key = `${getRequestIp(req)}:${req.path.startsWith("/api") ? "api" : "web"}`;
  if (consumeHttpRateLimit(key, limit)) {
    next();
    return;
  }
  res.status(429).json({ message: "Слишком много запросов. Попробуйте чуть позже." });
});
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

// Temporary one-off endpoint to pull headline stats for the owner. Remove after use.
app.get("/api/debug/stats", async (req: Request, res: Response) => {
  const key = String(process.env.DEBUG_STATS_KEY ?? "").trim();
  if (!key || req.headers["x-debug-key"] !== key) {
    res.status(404).end();
    return;
  }
  try {
    const { pool } = await import("@workspace/db");
    const [users, activeSubs, games] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM auth_users"),
      pool.query(
        `SELECT COUNT(*)::int AS n FROM auth_users
         WHERE COALESCE(subscription_tier, 'free') != 'free'
           AND (COALESCE(subscription_is_lifetime, FALSE) = TRUE
                OR subscription_end_at IS NULL
                OR subscription_end_at > NOW())`,
      ),
      pool.query("SELECT COUNT(*)::int AS n FROM match_rooms WHERE finished = TRUE"),
    ]);
    res.json({
      totalUsers: users.rows[0].n,
      activeSubscriptions: activeSubs.rows[0].n,
      gamesPlayed: games.rows[0].n,
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "error" });
  }
});

const healthResponse = HealthCheckResponse.parse({ status: "ok" });
app.get("/health", (_req, res) => {
  res.json(healthResponse);
});
app.get("/healthz", (_req, res) => {
  res.json(healthResponse);
});

/* ---------- FRONTEND ---------- */

const frontendPathCandidates = [
  // When server is started from repo root
  path.resolve(process.cwd(), "artifacts/court-game/dist"),
  // When server is started from artifacts/api-server
  path.resolve(process.cwd(), "../court-game/dist"),
];

const frontendPath =
  frontendPathCandidates.find((candidate) => existsSync(candidate)) ??
  frontendPathCandidates[0];

console.log(`[frontend] serving static files from: ${frontendPath}`);

app.use(
  express.static(frontendPath, {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      const normalizedPath = filePath.replace(/\\/g, "/");
      const relativePath = path.relative(frontendPath, filePath).replace(/\\/g, "/");
      const ext = path.extname(normalizedPath).toLowerCase();
      const isIndexHtml = relativePath === "index.html";
      const isHashedAsset =
        normalizedPath.includes("/assets/") &&
        [".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2"].includes(ext);

      if (isIndexHtml) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return;
      }

      if (isHashedAsset) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return;
      }

      if ([".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2"].includes(ext)) {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    },
  }),
);

app.get(/^(?!\/api).*/, (_, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;
