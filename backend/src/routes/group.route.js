import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { addAdmin, addMember, addMembers, createGroup, deleteGroup, getGroups, leaveGroup, removeMember } from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getGroups);
router.put("/:groupId/members", protectRoute, addMember);
router.put("/:id/add-members", protectRoute, addMembers);
router.put("/:id/add-admin", protectRoute, addAdmin);
router.put("/:id/remove-member", protectRoute, removeMember);
router.delete("/:id/leave", protectRoute, leaveGroup);
router.delete("/:id", protectRoute, deleteGroup);

export default router;