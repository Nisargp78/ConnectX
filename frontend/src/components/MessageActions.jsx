import { Trash2, Edit2, MoreVertical, Check, X, Languages } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useMessage } from "../store/useMessage";

const MessageActions = ({
  message,
  isSender,
  onAfterAction,
  canTranslate = false,
  isTranslating = false,
  isShowingTranslated = false,
  onTranslate,
  menuAlign = "right",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [canModify, setCanModify] = useState(true);
  const containerRef = useRef(null);
  const { editMessage, deleteMessage } = useMessage();

  const TIME_LIMIT = 1 * 60 * 1000;

  useEffect(() => {
    setEditText(message.text || "");
  }, [message.text]);

  useEffect(() => {
    const checkModifyWindow = () => {
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      const isEditable = messageAge <= TIME_LIMIT;
      setCanModify(isEditable);
    };

    checkModifyWindow();
    const interval = setInterval(checkModifyWindow, 1000);
    return () => clearInterval(interval);
  }, [message.createdAt]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  const handleEdit = () => {
    setIsEditing(true);
    setIsOpen(false);
  };

  const handleDelete = async () => {
    await deleteMessage(message._id);
    setIsOpen(false);
    onAfterAction?.();
  };

  const handleSaveEdit = async () => {
    await editMessage(message._id, editText);
    setIsEditing(false);
    onAfterAction?.();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.text || "");
  };

  const handleTranslate = async () => {
    if (!onTranslate) return;
    await onTranslate();
    setIsOpen(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="flex-1 bg-slate-600/30 text-white rounded px-2 py-1 text-sm border border-slate-500/50 focus:outline-none focus:border-slate-400"
          autoFocus
        />
        <button
          onClick={handleSaveEdit}
          className="p-1 hover:bg-green-500/20 rounded transition-colors"
          title="Save"
        >
          <Check size={14} className="text-green-400" />
        </button>
        <button
          onClick={handleCancelEdit}
          className="p-1 hover:bg-red-500/20 rounded transition-colors"
          title="Cancel"
        >
          <X size={14} className="text-red-400" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative z-[70]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-0.5 rounded-md border border-slate-500/40 bg-slate-900/35 hover:bg-slate-700/55 transition-colors"
        title="Message options"
      >
        <MoreVertical
          size={14}
          className="text-slate-200"
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-0 bg-slate-800/95 border border-slate-700 rounded-lg shadow-[0_14px_40px_rgba(2,10,22,0.55)] backdrop-blur-md z-[80] min-w-44 overflow-hidden animate-[messageMenuIn_140ms_ease-out] ${
            menuAlign === "left" ? "right-full mr-2 origin-right" : "left-full ml-2 origin-left"
          }`}
        >
          {canTranslate && (
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-cyan-300 hover:bg-slate-700 ${isSender && canModify ? "border-b border-slate-700" : ""} ${isTranslating ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              <Languages size={14} />
              {isTranslating ? "Translating..." : isShowingTranslated ? "Show Original" : "Translate"}
            </button>
          )}

          {isSender ? (
            canModify ? (
              <>
                <button
                  onClick={handleEdit}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-blue-400 hover:bg-slate-700 ${canTranslate ? "border-b border-slate-700" : ""}`}
                >
                  <Edit2 size={14} /> Edit
                </button>

                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </>
            ) : (
              !canTranslate && (
                <div className="px-3 py-2 w-max text-xs text-slate-400">
                  Cannot modify after 1 minute
                </div>
              )
            )
          ) : null}

          {!isSender && !canTranslate && (
            <div className="px-3 py-2 w-max text-xs text-slate-400">
              No actions available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
