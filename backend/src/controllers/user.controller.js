import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import bcrypt from "bcryptjs";

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName, currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};

    // Handle profile picture update
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic, {
        quality: "auto",
        fetch_format: "auto",
        width: 500,
        crop: "fill",
        angle: "auto"
      });
      updateData.profilePic = uploadResponse.secure_url;
    }

    // Handle username update
    if (fullName) {
      if (fullName.trim().length < 2) {
        return res.status(400).json({ message: "Full name must be at least 2 characters" });
      }
      updateData.fullName = fullName.trim();
    }

    // Handle password update
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set new password" });
      }

      // Verify current password
      const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      if (newPassword === currentPassword){
        return res.status(400).json({ message: "New password must be different from current password" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
    }

    // Update user if there are any changes
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};