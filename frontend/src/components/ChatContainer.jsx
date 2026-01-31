import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import Messages from "./Messages";

const ChatContainer = () => {

  return (
    <div className="flex-1 flex flex-col md:overflow-auto bg-[#061E29] overflow-hidden relative h-[calc(100vh-4rem)] md:h-screen">
      <ChatHeader />
      <Messages />
      <MessageInput />
    </div>
  );
};
export default ChatContainer;
