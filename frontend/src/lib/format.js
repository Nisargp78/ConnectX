export const formatMessageTime = (date) => {
  const target = new Date(date);
  return target.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const formatDate = (date) => {
  const target = new Date(date);
  return target.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export const formateDateTime = (date) => {
  const target = new Date(date);
  return target.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    hour12: false,
  });
}