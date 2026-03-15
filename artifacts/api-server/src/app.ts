import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

/* ---------- FRONTEND ---------- */

const frontendPath = path.resolve(
  process.cwd(),
  "artifacts/court-game/dist"
);

app.use(express.static(frontendPath));

app.get(/^(?!\/api).*/, (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;
