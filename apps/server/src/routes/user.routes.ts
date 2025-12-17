import Router from "express";
import { getUser } from "../controllers/user.controller";

const router = Router();

router.route("/user").get(getUser);

export default router;
