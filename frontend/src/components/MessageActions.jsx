import { Trash2, Edit2, MoreVertical, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useMessage } from "../store/useMessage";

const MessageActions = ({ message, isSender, onAfterAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [canModify, setCanModify] = useState(true);
  const { editMessage, deleteMessage } = useMessage();

  const TIME_LIMIT = 5 * 60 * 1000;

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

  if (!isSender) return null;

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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-0.5 hover:bg-slate-600/40 rounded transition-colors"
        title="Message options"
      >
        <MoreVertical
          size={14}
          className="text-slate-400 hover:text-slate-300"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg z-10 min-w-40">
          {canModify ? (
            <>
              <button
                onClick={handleEdit}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-blue-400 hover:bg-slate-700 border-b border-slate-700"
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
            <div className="px-3 py-2 w-max text-xs text-slate-400">
              Cannot modify after 5 minutes
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
