const buildMessageContext = (event) => {
  if (!event || typeof event !== "object") {
    return null;
  }

  const chatId =
    (event.chat && event.chat.id) ||
    (event.recipient && (event.recipient.id || event.recipient.user_id)) ||
    (event.message && event.message.to && event.message.to.id) ||
    event.user_id ||
    event.sender_id ||
    null;

  const sender = event.sender || event.from || {};
  const senderId = sender.id || sender.user_id || event.user_id || null;
  const senderName =
    sender.display_name || sender.full_name || sender.name || event.user_name || null;

  const text =
    (event.message && event.message.text) ||
    event.text ||
    (event.data && event.data.message) ||
    null;

  const normalizedChatId = chatId !== undefined && chatId !== null ? String(chatId) : null;
  const normalizedSenderId = senderId !== undefined && senderId !== null ? String(senderId) : null;

  return {
    chat: normalizedChatId ? { id: normalizedChatId } : null,
    from:
      normalizedSenderId || senderName
        ? { id: normalizedSenderId, display_name: senderName }
        : null,
    message: event.message || null,
    text,
    payload: event.payload || event.data || null,
    originalEvent: event
  };
};

const extractEventsFromPayload = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.events)) {
    return payload.events;
  }

  if (Array.isArray(payload.entry)) {
    return payload.entry.flatMap((entry) => {
      if (Array.isArray(entry.events)) {
        return entry.events;
      }

      if (Array.isArray(entry.messaging)) {
        return entry.messaging;
      }

      return entry.event ? [entry.event] : [entry];
    });
  }

  if (payload.event) {
    return [payload.event];
  }

  if (payload.data && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [payload];
};

const createWebhookProcessor = (handleMessageText) => {
  const handleWebhookPayload = async (payload) => {
    const events = extractEventsFromPayload(payload);

    if (!events.length) {
      console.log("Không có sự kiện hợp lệ trong payload", payload);
      return;
    }

    for (const event of events) {
      const context = buildMessageContext(event);

      if (!context) {
        console.log("Không thể xây dựng context cho sự kiện", event);
        continue;
      }

      await handleMessageText(context);
    }
  };

  return {
    handleWebhookPayload
  };
};

module.exports = {
  createWebhookProcessor,
  buildMessageContext,
  extractEventsFromPayload
};
