import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, getAllUsersForNewChat, sendMessage, sendGroupMessage, editMessage, deleteMessage, updateMessageStatus, markMessagesAsDelivered, downloadFile, translateMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/all-users", protectRoute, getAllUsersForNewChat);
router.get("/download", protectRoute, downloadFile);
router.get("/group/:id", protectRoute, getMessages);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.post("/send-group/:groupId", protectRoute, sendGroupMessage);
router.post("/translate", protectRoute, translateMessage);
router.put("/edit/:messageId", protectRoute, editMessage);
router.delete("/delete/:messageId", protectRoute, deleteMessage);
router.put("/status/:messageId", protectRoute, updateMessageStatus);
router.put("/delivered/:senderId", protectRoute, markMessagesAsDelivered);

export default router;
