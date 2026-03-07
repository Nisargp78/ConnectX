import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    lastActive: {
      type: Date,
      default: null,
    },
    pushSubscriptions: {
      type: [
        {
          endpoint: { type: String, required: true },
          expirationTime: { type: Number, default: null },
          keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
