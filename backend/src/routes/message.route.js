import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, getAllUsersForNewChat, sendMessage, editMessage, deleteMessage, updateMessageStatus, markMessagesAsDelivered } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/all-users", protectRoute, getAllUsersForNewChat);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.put("/edit/:messageId", protectRoute, editMessage);
router.delete("/delete/:messageId", protectRoute, deleteMessage);
router.put("/status/:messageId", protectRoute, updateMessageStatus);
router.put("/delivered/:senderId", protectRoute, markMessagesAsDelivered);

export default router;
