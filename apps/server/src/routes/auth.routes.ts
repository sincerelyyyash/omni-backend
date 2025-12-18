import Router from "express";
import { authSession } from "src/controllers/auth.controller";

const router = Router();

router.route("/auth/me").get(authSession);

export default router;
