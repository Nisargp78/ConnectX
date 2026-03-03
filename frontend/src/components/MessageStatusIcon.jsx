const MessageStatusIcon = ({ status }) => {
  if (!status) return null;

  switch (status) {
    case "sent":
      return (
        <svg
          className="w-4 h-4 ml-1 inline-block text-slate-300"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      );
    case "delivered":
      return (
        <svg
          className="w-5 h-5 ml-1 inline-block"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* First checkmark */}
          <path
            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
            fill="#9CA3AF"
            opacity="0.7"
          />
          {/* Second checkmark - offset to the right */}
          <path
            d="M15 16.17L10.83 12l-1.42 1.41L15 19 27 7l-1.41-1.41L15 16.17z"
            fill="#9CA3AF"
          />
        </svg>
      );
    case "read":
      return (
        <svg
          className="w-5 h-5 ml-1 inline-block"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* First checkmark */}
          <path
            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
            fill="#06B6D4"
          />
          {/* Second checkmark - offset to the right */}
          <path
            d="M15 16.17L10.83 12l-1.42 1.41L15 19 27 7l-1.41-1.41L15 16.17z"
            fill="#06B6D4"
          />
        </svg>
      );
    default:
      return null;
  }
};

export default MessageStatusIcon;

