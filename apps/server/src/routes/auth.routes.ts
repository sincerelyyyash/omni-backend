import Router from "express";
import { userSignIn, userSignUp } from "../controllers/auth.controller.ts"


const router = Router();

router.route("/signup").post(userSignUp);
router.route("/signin").post(userSignIn);

export default router;
