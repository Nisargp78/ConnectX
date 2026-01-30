import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-16 bg-[#061E29]">
      <div className="max-w-md text-center space-y-6">
        {/* Icon Display */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-[#114963] flex items-center justify-center animate-bounce">
              <MessageSquare className="w-10 h-10 text-[#23a9b0]" />
            </div>
          </div>
        </div>

        {/* Welcome Text */}
        <h2 className="text-3xl font-bold text-[#F3F4F4]">
          Welcome to ConnectX!
        </h2>
        <p className="text-[#F3F4F4]/80 text-lg leading-relaxed">
          Select a conversation from the sidebar to start chatting
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;
