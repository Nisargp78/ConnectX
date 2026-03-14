import mongoose from "mongoose";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import {
  emitGroupAccessRemoved,
  emitGroupDeleted,
  emitGroupMemberAdded,
  emitGroupUpdated,
} from "../lib/socket.js";

const MAX_GROUP_ADMINS = 6;

const getRefId = (value) => value?._id?.toString?.() || value?.toString?.() || null;

const getAdminIds = (group) => {
  const explicitAdmins = Array.isArray(group?.admins) ? group.admins : [];
  const explicitIds = explicitAdmins.map((admin) => getRefId(admin)).filter(Boolean);

  if (explicitIds.length > 0) {
    return Array.from(new Set(explicitIds));
  }

  // Backward compatibility for groups created before multi-admin support.
  const fallbackIds = [getRefId(group?.admin), getRefId(group?.createdBy)].filter(Boolean);
  return Array.from(new Set(fallbackIds));
};

const isUserAdmin = (group, userId) => {
  const normalizedUserId = userId?.toString?.() || String(userId || "");
  if (!normalizedUserId) return false;
  return getAdminIds(group).includes(normalizedUserId);
};

const mapGroup = (group) => ({
  ...group.toObject(),
  adminId: getAdminIds(group)[0] || getRefId(group.admin),
  adminIds: getAdminIds(group),
  createdById: getRefId(group.createdBy),
  memberCount: group.members?.length || 0,
});

const populateGroupById = (groupId) =>
  Group.findById(groupId)
    .populate("admin", "fullName email profilePic")
    .populate("createdBy", "fullName email profilePic")
    .populate("admins", "fullName email profilePic")
    .populate("members", "fullName email profilePic lastActive");

const getGroupOwnerId = (group) => getAdminIds(group)[0] || getRefId(group.admin) || getRefId(group.createdBy);

const toNormalizedGroup = (group) => ({
  ...mapGroup(group),
  isGroup: true,
  fullName: group.name,
  profilePic: group.avatar || "/avatar.png",
});

export const createGroup = async (req, res) => {
  try {
    const { name, description = "", avatar = "", members = [] } = req.body;
    const adminId = req.user._id;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Group name is required" });
    }

    const memberIds = new Set([adminId.toString(), ...members.map((id) => String(id))]);
    const normalizedMemberIds = Array.from(memberIds).filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!normalizedMemberIds.length) {
      return res.status(400).json({ error: "At least one valid member is required" });
    }

    const existingUsersCount = await User.countDocuments({
      _id: { $in: normalizedMemberIds },
    });

    if (existingUsersCount !== normalizedMemberIds.length) {
      return res.status(400).json({ error: "One or more selected members do not exist" });
    }

    const created = await Group.create({
      name: name.trim(),
      description,
      avatar,
      admin: adminId,
      createdBy: adminId,
      admins: [adminId],
      members: normalizedMemberIds,
    });

    const populatedGroup = await populateGroupById(created._id);

    return res.status(201).json(mapGroup(populatedGroup));
  } catch (error) {
    console.log("Error in createGroup controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId })
      .populate("admin", "fullName email profilePic")
      .populate("createdBy", "fullName email profilePic")
      .populate("admins", "fullName email profilePic")
      .populate("members", "fullName email profilePic lastActive")
      .sort({ updatedAt: -1 });

    return res.status(200).json(groups.map(mapGroup));
  } catch (error) {
    console.log("Error in getGroups controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Legacy endpoint kept for backward compatibility.
export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const requesterId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: "Invalid member id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!isUserAdmin(group, requesterId)) {
      return res.status(403).json({ error: "Only group admin can add members" });
    }

    const userToAdd = await User.findById(memberId);
    if (!userToAdd) {
      return res.status(404).json({ error: "Member user not found" });
    }

    await Group.findByIdAndUpdate(groupId, {
      $addToSet: { members: memberId },
    });

    const updatedGroup = await populateGroupById(groupId);

    return res.status(200).json(mapGroup(updatedGroup));
  } catch (error) {
    console.log("Error in addMember controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addMembers = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { memberIds = [] } = req.body;
    const requesterId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!isUserAdmin(group, requesterId)) {
      return res.status(403).json({ error: "Only group admin can add members" });
    }

    const normalizedMemberIds = Array.from(
      new Set((Array.isArray(memberIds) ? memberIds : []).map((id) => String(id)))
    ).filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!normalizedMemberIds.length) {
      return res.status(400).json({ error: "Please provide at least one valid member id" });
    }

    const existingMembers = new Set(group.members.map((memberId) => memberId.toString()));
    const membersToAdd = normalizedMemberIds.filter((id) => !existingMembers.has(id));

    if (!membersToAdd.length) {
      const latestGroup = await populateGroupById(groupId);
      return res.status(200).json({
        group: mapGroup(latestGroup),
        addedMemberIds: [],
        message: "All selected users are already members",
      });
    }

    const existingUsers = await User.find({ _id: { $in: membersToAdd } }).select("_id");
    const validUserIds = existingUsers.map((user) => user._id.toString());

    if (!validUserIds.length) {
      return res.status(400).json({ error: "No valid users found to add" });
    }

    await Group.findByIdAndUpdate(groupId, {
      $addToSet: { members: { $each: validUserIds } },
    });

    const updatedGroup = await populateGroupById(groupId);
    const normalizedGroup = toNormalizedGroup(updatedGroup);

    const targetUserIds = updatedGroup.members.map((member) => member._id.toString());
    emitGroupMemberAdded(targetUserIds, {
      groupId,
      group: normalizedGroup,
      addedMemberIds: validUserIds,
    });

    return res.status(200).json({
      group: mapGroup(updatedGroup),
      addedMemberIds: validUserIds,
      message: `Added ${validUserIds.length} member${validUserIds.length > 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.log("Error in addMembers controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addAdmin = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { memberId } = req.body;
    const requesterId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: "Invalid member id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!isUserAdmin(group, requesterId)) {
      return res.status(403).json({ error: "Only existing admins can add new admins" });
    }

    const isMember = group.members.some((id) => id.toString() === memberId.toString());
    if (!isMember) {
      return res.status(400).json({ error: "User must be a group member before becoming admin" });
    }

    const adminIds = getAdminIds(group);
    if (adminIds.includes(memberId.toString())) {
      const latestGroup = await populateGroupById(groupId);
      return res.status(200).json({
        message: "User is already an admin",
        group: mapGroup(latestGroup),
      });
    }

    if (adminIds.length >= MAX_GROUP_ADMINS) {
      return res.status(400).json({ error: `Maximum ${MAX_GROUP_ADMINS} admins allowed in one group` });
    }

    await Group.findByIdAndUpdate(groupId, {
      $addToSet: { admins: memberId },
    });

    const updatedGroup = await populateGroupById(groupId);
    const normalizedGroup = toNormalizedGroup(updatedGroup);
    const targetMemberIds = updatedGroup.members.map((member) => member._id.toString());

    emitGroupUpdated(targetMemberIds, {
      groupId,
      group: normalizedGroup,
      reason: "admin_added",
      promotedAdminId: memberId.toString(),
    });

    return res.status(200).json({
      message: "Admin added successfully",
      group: mapGroup(updatedGroup),
      promotedAdminId: memberId.toString(),
    });
  } catch (error) {
    console.log("Error in addAdmin controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const requesterId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const requesterIdStr = requesterId.toString();
    const currentMemberIds = group.members.map((memberId) => memberId.toString());
    const isMember = currentMemberIds.includes(requesterIdStr);
    if (!isMember) {
      return res.status(400).json({ error: "You are not a member of this group" });
    }

    const currentAdminIds = getAdminIds(group);
    const isAdminLeaving = currentAdminIds.includes(requesterIdStr);

    if (isAdminLeaving && group.members.length === 1) {
      return res.status(400).json({
        error: "You are the only member. Delete the group instead of leaving.",
      });
    }

    const remainingMemberIds = currentMemberIds.filter((memberId) => memberId !== requesterIdStr);
    let nextAdminIds = currentAdminIds.filter((adminId) => adminId !== requesterIdStr);

    if (isAdminLeaving && nextAdminIds.length === 0) {
      const promotedAdminId = remainingMemberIds[0];
      if (!promotedAdminId) {
        return res.status(400).json({ error: "Unable to transfer admin ownership." });
      }
      nextAdminIds = [promotedAdminId];
    }

    const update = {
      $pull: { members: requesterId, admins: requesterId },
      $set: {},
    };

    if (nextAdminIds.length > 0) {
      update.$set.admins = nextAdminIds;
      update.$set.admin = nextAdminIds[0];
    }

    if (getRefId(group.createdBy) === requesterIdStr) {
      update.$set.createdBy = nextAdminIds[0] || group.createdBy;
    }

    if (Object.keys(update.$set).length === 0) {
      delete update.$set;
    }

    await Group.findByIdAndUpdate(groupId, update);

    const updatedGroup = await populateGroupById(groupId);
    const normalizedGroup = toNormalizedGroup(updatedGroup);
    const updatedMemberIds = updatedGroup.members.map((member) => member._id.toString());

    emitGroupUpdated(updatedMemberIds, {
      groupId,
      group: normalizedGroup,
      reason: isAdminLeaving ? "ownership_transferred" : "member_left",
    });

    emitGroupAccessRemoved([requesterIdStr], {
      groupId,
      reason: "left",
    });

    return res.status(200).json({
      message: isAdminLeaving
        ? "You left the group and admin role was transferred"
        : "You left the group successfully",
      groupId,
      leftUserId: requesterIdStr,
    });
  } catch (error) {
    console.log("Error in leaveGroup controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const requesterId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!isUserAdmin(group, requesterId)) {
      return res.status(403).json({ error: "Only group admins can delete this group" });
    }

    const groupMemberIds = group.members.map((memberId) => memberId.toString());

    await Promise.all([
      Message.deleteMany({ groupId }),
      Group.findByIdAndDelete(groupId),
    ]);

    emitGroupDeleted(groupMemberIds, {
      groupId,
      deletedBy: requesterId.toString(),
    });

    return res.status(200).json({
      message: "Group deleted successfully",
      groupId,
    });
  } catch (error) {
    console.log("Error in deleteGroup controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { memberId } = req.body;
    const requesterId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: "Invalid member id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!isUserAdmin(group, requesterId)) {
      return res.status(403).json({ error: "Only group admins can remove members" });
    }

    const adminIds = getAdminIds(group);
    if (adminIds.includes(memberId.toString())) {
      return res.status(400).json({ error: "Cannot remove an admin member." });
    }

    const isMember = group.members.some((id) => id.toString() === memberId.toString());
    if (!isMember) {
      return res.status(400).json({ error: "User is not a group member" });
    }

    await Group.findByIdAndUpdate(groupId, {
      $pull: { members: memberId },
    });

    const updatedGroup = await populateGroupById(groupId);
    const normalizedGroup = toNormalizedGroup(updatedGroup);
    const remainingMemberIds = updatedGroup.members.map((member) => member._id.toString());

    emitGroupUpdated(remainingMemberIds, {
      groupId,
      group: normalizedGroup,
      reason: "member_removed",
      removedMemberId: memberId.toString(),
    });

    emitGroupAccessRemoved([memberId.toString()], {
      groupId,
      reason: "removed",
    });

    return res.status(200).json({
      message: "Member removed successfully",
      group: mapGroup(updatedGroup),
      removedMemberId: memberId.toString(),
    });
  } catch (error) {
    console.log("Error in removeMember controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};
