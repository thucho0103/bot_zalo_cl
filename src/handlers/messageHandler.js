const { saveMessage, queryMessagesByDay } = require("../services/messageService");
const {
  VALID_DAYS,
  parseDayAndContent,
  extractPayloadText,
  resolveDayFromCurrentTime
} = require("../utils/messageUtils");

const getChatId = (msgContext) => {
  if (!msgContext) {
    return null;
  }

  if (msgContext.chat && msgContext.chat.id) {
    return String(msgContext.chat.id);
  }

  if (msgContext.originalEvent && msgContext.originalEvent.user_id) {
    return String(msgContext.originalEvent.user_id);
  }

  if (msgContext.from && msgContext.from.id) {
    return String(msgContext.from.id);
  }

  return null;
};

const sendChatMessage = async (bot, target, message) => {
  const chatId = typeof target === "string" ? target : getChatId(target);

  if (!chatId || !message) {
    return;
  }

  try {
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error("Gửi tin nhắn tới người dùng thất bại", error);
  }
};

const createMessageHandler = (bot) => {
  const handleAddCommand = async (msgContext, rawPayload) => {
    const chatId = getChatId(msgContext);

    if (!rawPayload) {
      await sendChatMessage(bot, chatId, "Hãy nhập nội dung để lưu sau lệnh /add");
      return;
    }

    const { day, content } = parseDayAndContent(rawPayload);

    if (!day) {
      await sendChatMessage(
        bot,
        chatId,
        "Định dạng không hợp lệ. Vui lòng nhập theo dạng 't3 nội dung'."
      );
      return;
    }

    try {
      await saveMessage("command:add", msgContext, { payloadText: content, day });
      await sendChatMessage(bot, chatId, "Đã lưu nội dung của bạn thành công.");
    } catch (error) {
      console.error("Không thể lưu nội dung /add", error);
      await sendChatMessage(bot, chatId, "Không thể lưu nội dung, vui lòng thử lại.");
    }
  };

  const handleListCommand = async (msgContext, requestedDayRaw) => {
    const chatId = getChatId(msgContext);
    const normalizedRequestedDay = requestedDayRaw ? requestedDayRaw.trim().toLowerCase() : "";
    const requestedDay = VALID_DAYS.includes(normalizedRequestedDay) ? normalizedRequestedDay : null;
    const effectiveDay = requestedDay || resolveDayFromCurrentTime();

    if (!effectiveDay) {
      await sendChatMessage(
        bot,
        chatId,
        "Hiện tại không phải t3, t5 hoặc t7 và bạn cũng không chỉ định ngày hợp lệ."
      );
      return;
    }

    try {
      const rows = await queryMessagesByDay(effectiveDay);
      const dayLabel = effectiveDay.toUpperCase();

      if (!rows || rows.length === 0) {
        await sendChatMessage(bot, chatId, `Chưa có nội dung nào được lưu cho ${dayLabel}.`);
        return;
      }

      const formatted = rows
        .map((row, index) => {
          const sender = row.sender_name || "(Không rõ)";
          const payload = row.payload || "(Không có nội dung)";
          return `${index + 1}. ${payload} (${sender})`;
        })
        .join("\n");

      const response = `Danh sách đăng ký cho ${dayLabel}:\n${formatted}`;
      await sendChatMessage(bot, chatId, response);
    } catch (error) {
      console.error("Không thể truy vấn dữ liệu dsvl", error);
      await sendChatMessage(bot, chatId, "Không thể lấy dữ liệu lưu trữ, vui lòng thử lại sau.");
    }
  };

  const handleDefaultMessage = async (msgContext, textContent) => {
    const { day, content } = parseDayAndContent(textContent);

    if (!day) {
      console.log("Bỏ qua tin nhắn không có định dạng ngày hợp lệ", textContent);
      return;
    }

    try {
      await saveMessage("event:message", msgContext, { payloadText: content, day });
    } catch (error) {
      console.error("Không thể lưu tin nhắn sự kiện", error);
    }
  };

  const handleMessageText = async (msgContext) => {
    const textContent = extractPayloadText(msgContext);

    if (!textContent) {
      console.log(
        "Không tìm thấy nội dung text trong sự kiện",
        msgContext && msgContext.originalEvent
      );
      return;
    }

    const trimmed = textContent.trim();
    const lower = trimmed.toLowerCase();

    try {
      if (lower.startsWith("/add")) {
        const commandPayload = trimmed.slice(4).trim();
        await handleAddCommand(msgContext, commandPayload);
        return;
      }

      if (lower.startsWith("/dsvl")) {
        const dayPart = trimmed.slice(5).trim();
        await handleListCommand(msgContext, dayPart);
        return;
      }

      await handleDefaultMessage(msgContext, trimmed);
    } catch (error) {
      console.error("Xử lý tin nhắn thất bại", error);
    }
  };

  return {
    handleMessageText
  };
};

module.exports = {
  createMessageHandler,
  getChatId
};
