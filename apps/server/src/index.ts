import "dotenv/config";
import Express from "express"
import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes.ts";
import notificationRouter from "./routes/notification.routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { validateEnv } from "./config/env";

try {
  validateEnv();
} catch (error) {
  console.error("Environment validation failed:", (error as Error).message);
  process.exit(1);
}

const app = Express()
const PORT = process.env.PORT ?? 8000;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.all("/api/auth/*", toNodeHandler(auth));

app.use(Express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1", authRouter);
app.use("/api/v1", userRouter);
app.use("/api/v1", notificationRouter);

app.use((err: Error, req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
  next();
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log("Backend server is running on PORT : " + PORT);
})
