import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onEmojiClick = (emojiObject) => {
    setText(text + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-2 md:p-4 w-full border-t border-[#F3F4F4]/5 bg-[#0A2A3A]/30 sticky bottom-0 md:relative z-10">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-xl border-2 border-blue-500/50 shadow-lg shadow-blue-500/20"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-600
              flex items-center justify-center transition-colors ring-2 ring-slate-900 shadow-lg"
              type="button"
            >
              <X className="size-3.5 text-white" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-1 md:gap-2">
        <div className="flex-1 flex gap-1 md:gap-2">
          <input
            type="text"
            className="w-full px-2 md:px-4 py-1.5 md:py-2.5 text-sm md:text-base rounded-xl bg-[#051923]/40 border border-slate-600/50 focus:border-[#5F9598] focus:outline-none text-[#F3F4F4] placeholder-[#F3F4F4]/35 transition-colors caret-[#5F9598]"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className="p-1.5 md:p-2.5 rounded-lg text-[#F3F4F4] hover:bg-slate-700/40 border border-transparent cursor-pointer transition-colors"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="size-4 md:size-5" />
          </button>

          {showEmojiPicker && (
            <div className="mt-3 absolute bottom-20 right-4 z-50">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme="dark"
                height={400}
                width="100%"
                emojiStyle="native"
              />
            </div>
          )}

          <button
            type="button"
            className={`p-1.5 md:p-2.5 rounded-lg transition-colors ${
              imagePreview ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/50" : "text-[#F3F4F4] hover:bg-slate-700/40 border border-transparent cursor-pointer"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="size-4 md:size-5" />
          </button>
          
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

        </div>
        <button
          type="submit"
          className="p-1.5 md:p-2 rounded-lg bg-teal-600 hover:bg-teal-800 text-[#F3F4F4] transition-colors cursor-pointer disabled:bg-[#1D546D]/80 disabled:cursor-not-allowed"
          disabled={!text.trim() && !imagePreview}
        >
          <Send className="size-4 md:size-5" />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
