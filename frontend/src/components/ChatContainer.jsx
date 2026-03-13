import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import Messages from "./Messages";
import { useChatStore } from "../store/useChatStore";
import { GLOBAL_CHAT_ID } from "../store/useChatStore";

const ChatContainer = () => {
  const { selectedUser } = useChatStore();
  const isGlobalChat = selectedUser?._id === GLOBAL_CHAT_ID;

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col overflow-hidden relative h-full ${
        isGlobalChat
          ? "w-full max-w-6xl mx-auto bg-linear-to-b from-[#0c2940] to-[#071f30] rounded-xl md:rounded-2xl border border-cyan-900/50 shadow-[0_20px_70px_rgba(1,16,28,0.55)]"
          : "bg-[#061E29]"
      }`}
    >
      <ChatHeader />
      <Messages />
      <MessageInput />
    </div>
  );
};
export default ChatContainer;
