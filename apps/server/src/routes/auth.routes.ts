import Router from "express";
import { authSession } from "../controllers/auth.controller";

const router = Router();

router.route("/auth/me").get(authSession);

export default router;
