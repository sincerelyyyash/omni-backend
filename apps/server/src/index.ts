import Express from "express"
import authRouter from "./routes/auth.routes";

const app = Express()
const PORT = process.env.PORT ?? 8000;

app.use("/api/v1", authRouter);

app.listen(PORT, () => {
  console.log("Backend server is running on PORT : " + PORT);
})
