import Express from "express"
import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes.ts";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";



const app = Express()
const PORT = process.env.PORT ?? 8000;

app.all("/api/auth/*", toNodeHandler(auth));

app.use(Express.json());

app.use("/api/v1", authRouter);
app.use("/api/v1", userRouter);


app.listen(PORT, () => {
  console.log("Backend server is running on PORT : " + PORT);
})
