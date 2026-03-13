import Broadcast from "../models/broadcast.model.js";
import cloudinary from "../lib/cloudinary.js";
import { checkBroadcastRateLimit } from "../lib/broadcastRateLimiter.js";
import { emitBroadcastMessage } from "../lib/socket.js";

const DOC_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "txt",
  "csv",
  "odt",
  "ods",
  "odp",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "m4v",
  "flv",
  "wmv",
]);

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "tiff",
  "avif",
]);

const getExtensionFromName = (filename = "") => {
  const lastPart = String(filename).split(".").pop();
  return lastPart ? lastPart.toLowerCase() : "";
};

const mapBroadcastForClient = (broadcastDoc, sender) => ({
  _id: broadcastDoc._id,
  senderId: String(broadcastDoc.senderId),
  senderName: sender?.fullName || "Unknown user",
  senderProfilePic: sender?.profilePic || "/avatar.png",
  text: broadcastDoc.text || "",
  image: broadcastDoc.image || null,
  file: broadcastDoc.file || null,
  createdAt: broadcastDoc.createdAt,
  updatedAt: broadcastDoc.updatedAt,
});

export const getBroadcastHistory = async (req, res) => {
  try {
    const history = await Broadcast.find({})
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: 1 })
      .limit(300);

    const mapped = history.map((item) => ({
      _id: item._id,
      senderId: String(item.senderId?._id || item.senderId),
      senderName: item.senderId?.fullName || "Unknown user",
      senderProfilePic: item.senderId?.profilePic || "/avatar.png",
      text: item.text || "",
      image: item.image || null,
      file: item.file || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.status(200).json(mapped);
  } catch (error) {
    console.log("Error in getBroadcastHistory controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendBroadcastMessage = async (req, res) => {
  try {
    const sender = req.user;
    const senderId = sender._id;
    const { text, file, fileName, fileSize } = req.body;

    const rate = checkBroadcastRateLimit(senderId);
    if (!rate.allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait before sending another broadcast.",
        retryAfterMs: rate.retryAfterMs,
      });
    }

    let imageUrl;
    let fileData;

    if (file) {
      const fileExt = getExtensionFromName(fileName || "");
      const uploadResourceType = DOC_EXTENSIONS.has(fileExt)
        ? "raw"
        : VIDEO_EXTENSIONS.has(fileExt)
          ? "video"
          : IMAGE_EXTENSIONS.has(fileExt)
            ? "image"
            : "auto";

      const uploadResponse = await cloudinary.uploader.upload(file, {
        resource_type: uploadResourceType,
      });

      const url = uploadResponse.secure_url;
      const detectedFormat = (uploadResponse.format || "").toLowerCase();
      const resourceType = uploadResponse.resource_type || "";

      let fileType = "document";
      if (DOC_EXTENSIONS.has(detectedFormat) || DOC_EXTENSIONS.has(fileExt)) {
        fileType = "document";
      } else if (
        resourceType === "video" ||
        VIDEO_EXTENSIONS.has(detectedFormat) ||
        VIDEO_EXTENSIONS.has(fileExt)
      ) {
        fileType = "video";
      } else if (
        resourceType === "image" ||
        IMAGE_EXTENSIONS.has(detectedFormat) ||
        IMAGE_EXTENSIONS.has(fileExt)
      ) {
        fileType = "image";
        imageUrl = url;
      }

      fileData = {
        url,
        name: fileName || uploadResponse.original_filename || "file",
        size: fileSize || uploadResponse.bytes || 0,
        type: fileType,
      };
    }

    const newBroadcast = new Broadcast({
      senderId,
      text: text || "",
      image: imageUrl || "",
      file: fileData,
    });

    await newBroadcast.save();

    const payload = mapBroadcastForClient(newBroadcast, sender);
    emitBroadcastMessage(payload);

    res.status(201).json(payload);
  } catch (error) {
    console.log("Error in sendBroadcastMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
