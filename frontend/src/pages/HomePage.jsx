import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen w-full bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      <Sidebar />

      {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
    </div>
  );
};
export default HomePage;
