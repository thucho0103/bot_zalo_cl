const { db } = require("../db");
const { VALID_DAYS, extractPayloadText, parseDayAndContent } = require("../utils/messageUtils");

const normalizeSaveArguments = (payloadOrOptions) => {
  if (typeof payloadOrOptions === "string") {
    return { payloadText: payloadOrOptions, day: undefined };
  }

  if (payloadOrOptions && typeof payloadOrOptions === "object") {
    return {
      payloadText: payloadOrOptions.payloadText,
      day: payloadOrOptions.day
    };
  }

  return { payloadText: undefined, day: undefined };
};

const saveMessage = async (eventType, msg, payloadOrOptions) => {
  const { payloadText, day } = normalizeSaveArguments(payloadOrOptions);

  if (!msg) {
    throw new Error("Không có dữ liệu tin nhắn");
  }

  const chatId = msg.chat && msg.chat.id ? String(msg.chat.id) : null;
  const senderId = msg.from && msg.from.id ? String(msg.from.id) : null;
  const senderName = msg.from && msg.from.display_name ? msg.from.display_name : null;
  const textSource = typeof payloadText === "string" ? payloadText : extractPayloadText(msg);

  let payloadValue = typeof payloadText === "string" ? payloadText : textSource;
  let dayValue = day;

  if (!dayValue) {
    const { day: parsedDay, content } = parseDayAndContent(textSource);
    dayValue = parsedDay;
    if (content || content === "") {
      payloadValue = content;
    }
  }

  if (!dayValue || !VALID_DAYS.includes(dayValue)) {
    throw new Error("Không xác định được loại ngày hợp lệ (t3, t5, t7)");
  }

  const finalPayload = typeof payloadValue === "string" ? payloadValue : null;

  const result = await db.execute({
    sql: `INSERT INTO messages (event_type, chat_id, sender_id, sender_name, day, payload)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [eventType, chatId, senderId, senderName, dayValue, finalPayload]
  });

  return result.lastInsertRowid ?? null;
};

const queryMessagesByDay = async (day) => {
  const result = await db.execute({
    sql: `SELECT sender_name, payload, created_at
            FROM messages
           WHERE day = ?
             AND datetime(created_at) >= datetime('now', '-7 days')
           ORDER BY datetime(created_at) DESC
           LIMIT 20`,
    args: [day]
  });

  return result.rows;
};

module.exports = {
  saveMessage,
  queryMessagesByDay
};
