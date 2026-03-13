import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getBroadcastHistory,
  sendBroadcastMessage,
} from "../controllers/broadcast.controller.js";

const router = express.Router();

router.get("/history", protectRoute, getBroadcastHistory);
router.post("/send", protectRoute, sendBroadcastMessage);

export default router;
