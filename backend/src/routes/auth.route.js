import express from "express";
import {
	checkAuth,
	getPushPublicKey,
	login,
	logout,
	signup,
	subscribePush,
	unsubscribePush,
} from "../controllers/auth.controller.js";
import { updateProfile } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);
router.get("/push/public-key", getPushPublicKey);
router.post("/push/subscribe", protectRoute, subscribePush);
router.post("/push/unsubscribe", protectRoute, unsubscribePush);

export default router;
