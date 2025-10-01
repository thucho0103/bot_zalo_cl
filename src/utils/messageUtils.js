const { VALID_DAYS } = require("../config");

const extractPayloadText = (msg) => {
  if (!msg) {
    return "";
  }

  if (typeof msg.text === "string" && msg.text.trim()) {
    return msg.text.trim();
  }

  if (msg.message && typeof msg.message.text === "string" && msg.message.text.trim()) {
    return msg.message.text.trim();
  }

  if (msg.payload && typeof msg.payload === "string" && msg.payload.trim()) {
    return msg.payload.trim();
  }

  if (msg.payload && typeof msg.payload.text === "string" && msg.payload.text.trim()) {
    return msg.payload.text.trim();
  }

  return "";
};

const parseDayAndContent = (text) => {
  if (!text || typeof text !== "string") {
    return { day: null, content: "" };
  }

  const trimmed = text.trim();

  if (!trimmed) {
    return { day: null, content: "" };
  }

  const dayMatch = trimmed.match(/\b(t3|t5|t7)\b/i);

  if (!dayMatch) {
    return { day: null, content: "" };
  }

  const dayToken = dayMatch[1].toLowerCase();
  const lowerTrimmed = trimmed.toLowerCase();
  const dayIndex = lowerTrimmed.indexOf(dayToken);
  const content = trimmed.slice(dayIndex + dayToken.length).trim();

  return { day: dayToken, content };
};

const resolveDayFromCurrentTime = () => {
  const dayNumber = new Date().getDay();

  switch (dayNumber) {
    case 2:
      return "t3";
    case 4:
      return "t5";
    case 6:
      return "t7";
    default:
      return null;
  }
};

module.exports = {
  VALID_DAYS,
  extractPayloadText,
  parseDayAndContent,
  resolveDayFromCurrentTime
};
