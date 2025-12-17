import Router from "express";
import { userSignIn, userSignUp } from "../controllers/auth.controller.ts"
import { getSession } from "better-auth/api";


const router = Router();

router.route("/auth/signup").post(userSignUp);
router.route("/auth/signin").post(userSignIn);
router.route("/auth/me").get(getSession);

export default router;
