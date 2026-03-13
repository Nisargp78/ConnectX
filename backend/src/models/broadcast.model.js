import mongoose from "mongoose";

const broadcastSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    file: {
      url: { type: String },
      name: { type: String },
      size: { type: Number },
      type: { type: String, enum: ["image", "video", "document"] },
    },
  },
  { timestamps: true }
);

const Broadcast = mongoose.model("Broadcast", broadcastSchema);

export default Broadcast;
