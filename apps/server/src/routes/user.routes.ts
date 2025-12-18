import Router from "express";
import { getUser } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.route("/user").get(authenticate, getUser);

export default router;
