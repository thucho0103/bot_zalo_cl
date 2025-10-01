const express = require("express");
const ZaloBot = require("node-zalo-bot");

const { PORT, VERIFY_TOKEN, ZALO_ACCESS_TOKEN } = require("./config");
const { initializeDatabase, closeDatabase } = require("./db");
const { createMessageHandler } = require("./handlers/messageHandler");
const { createWebhookProcessor } = require("./webhook/processor");

const bot = new ZaloBot(ZALO_ACCESS_TOKEN, { polling: false, webHook: true });
const { handleMessageText } = createMessageHandler(bot);
const { handleWebhookPayload } = createWebhookProcessor(handleMessageText);

const app = express();
app.disable("x-powered-by");
app.use(
  express.json({
    limit: "1mb",
    type: () => true
  })
);

app.get("/health", (_req, res) => {
  res.status(200).type("text/plain").send("OK");
});

app.get("/webhook", (req, res) => {
  const verifyToken = req.query.verify_token;
  const challenge = req.query.challenge || "OK";

  if (verifyToken === VERIFY_TOKEN) {
    res.status(200).type("text/plain").send(challenge);
    return;
  }

  res.status(403).type("text/plain").send("Verify token không hợp lệ");
});

app.post("/webhook", async (req, res) => {
  try {
    const payload = req.body;

    if (
      payload === null ||
      payload === undefined ||
      (typeof payload === "object" && !Array.isArray(payload) && !Object.keys(payload).length)
    ) {
      res.status(400).type("text/plain").send("Payload trống");
      return;
    }

    await handleWebhookPayload(payload);
    res.status(200).type("text/plain").send("received");
  } catch (error) {
    console.error("Xử lý webhook thất bại", error);
    res.status(400).type("text/plain").send("Payload không hợp lệ");
  }
});

app.all("/webhook", (_req, res) => {
  res.status(405).type("text/plain").send("Method không được hỗ trợ");
});

app.use((_req, res) => {
  res.status(404).type("text/plain").send("Không tìm thấy tài nguyên");
});
app.use((err, _req, res, _next) => {
  if (err && err.type === "entity.parse.failed") {
    console.error("Payload không phải JSON hợp lệ", err);
    res.status(400).type("text/plain").send("Payload không hợp lệ");
    return;
  }

  console.error("Lỗi không mong muốn", err);
  res.status(500).type("text/plain").send("Lỗi máy chủ");
});

let serverInstance;

const startServer = async () => {
  try {
    await initializeDatabase();
    serverInstance = app.listen(PORT, () => {
      console.log(`Webhook server đang lắng nghe tại cổng ${PORT}`);
    });

    serverInstance.on("error", (error) => {
      console.error("Không thể khởi động server", error);
    });
  } catch (error) {
    console.error("Không thể khởi tạo ứng dụng", error);
    process.exit(1);
  }
};

const shutdown = () => {
  console.log("Đang tắt server...");

  const closeServer = new Promise((resolve) => {
    if (!serverInstance) {
      resolve();
      return;
    }

    serverInstance.close((serverErr) => {
      if (serverErr) {
        console.error("Đóng server thất bại", serverErr);
      }

      resolve();
    });
  });

  closeServer
    .then(() =>
      closeDatabase().catch((dbErr) => {
        console.error("Đóng kết nối Turso thất bại", dbErr);
        throw dbErr;
      })
    )
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
