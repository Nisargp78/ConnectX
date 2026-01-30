import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import Messages from "./Messages";

const ChatContainer = () => {

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-[#061E29]">
      <ChatHeader />
      <Messages />
      <MessageInput />
    </div>
  );
};
export default ChatContainer;
