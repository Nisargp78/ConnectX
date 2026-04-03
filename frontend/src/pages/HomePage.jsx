import { Activity, useEffect, useMemo, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { GLOBAL_CHAT_ID } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser, users, groups } = useChatStore();
  const [openChatIds, setOpenChatIds] = useState([]);

  useEffect(() => {
    if (!selectedUser?._id) return;
    setOpenChatIds((prev) =>
      prev.includes(selectedUser._id) ? prev : [...prev, selectedUser._id]
    );
  }, [selectedUser?._id]);

  const chatLookup = useMemo(() => {
    const lookup = new Map();

    for (const user of users) {
      if (user?._id) lookup.set(user._id, user);
    }

    for (const group of groups) {
      if (group?._id) lookup.set(group._id, group);
    }

    if (selectedUser?._id) {
      lookup.set(selectedUser._id, selectedUser);
    }

    return lookup;
  }, [users, groups, selectedUser]);

  const openChats = useMemo(
    () => openChatIds.map((chatId) => chatLookup.get(chatId)).filter(Boolean),
    [openChatIds, chatLookup]
  );

  const isGlobalChat = selectedUser?._id === GLOBAL_CHAT_ID;

  return (
    <div className="md:h-screen h-[calc(100vh-4rem)] w-full bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex overflow-hidden">
      {!isGlobalChat && <Sidebar />}

      {!selectedUser ? <NoChatSelected /> : null}

      {selectedUser ? (
        <div
          className={`flex-1 overflow-hidden ${
            isGlobalChat
              ? "p-2 md:p-4 bg-radial-[at_20%_20%] from-cyan-950/50 via-transparent to-transparent"
              : ""
          }`}
        >
          {openChats.map((chat) => {
            const isActive = selectedUser?._id === chat._id;

            return (
              <Activity key={chat._id} mode={isActive ? "visible" : "hidden"}>
                <ChatContainer chatUser={chat} />
              </Activity>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
export default HomePage;
