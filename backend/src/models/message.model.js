import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: false,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    file: {
      url: { type: String },
      name: { type: String },
      size: { type: Number },
      type: { type: String, enum: ["image", "video", "document"] },
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    translations: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

messageSchema.pre("validate", function validateChatTarget(next) {
  const hasReceiverId = Boolean(this.receiverId);
  const hasGroupId = Boolean(this.groupId);

  if (!hasReceiverId && !hasGroupId) {
    this.invalidate("receiverId", "Message must have either receiverId or groupId");
  }

  if (hasReceiverId && hasGroupId) {
    this.invalidate("groupId", "Message cannot target receiverId and groupId together");
  }

  next();
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
