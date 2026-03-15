import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

/* ---------- FRONTEND ---------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.resolve(
  __dirname,
  "../../../court-game/dist"
);

app.use(express.static(frontendPath));

app.get("*", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;
