import { useChatStore } from "../store/useChatStore";
import { GLOBAL_CHAT_ID } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const isGlobalChat = selectedUser?._id === GLOBAL_CHAT_ID;

  return (
    <div className="md:h-screen h-[calc(100vh-4rem)] w-full bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex overflow-hidden">
      {!isGlobalChat && <Sidebar />}

      {!selectedUser ? (
        <NoChatSelected />
      ) : isGlobalChat ? (
        <div className="flex-1 overflow-hidden p-2 md:p-4 bg-radial-[at_20%_20%] from-cyan-950/50 via-transparent to-transparent">
          <ChatContainer />
        </div>
      ) : (
        <ChatContainer />
      )}
    </div>
  );
};
export default HomePage;
