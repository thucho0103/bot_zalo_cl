const http = require("http");
const { URL } = require("url");
const ZaloBot = require("node-zalo-bot");

const { PORT, VERIFY_TOKEN, ZALO_ACCESS_TOKEN } = require("./config");
const { initializeDatabase, closeDatabase } = require("./db");
const { createMessageHandler } = require("./handlers/messageHandler");
const { createWebhookProcessor } = require("./webhook/processor");
const { readRequestBody } = require("./utils/http");

const bot = new ZaloBot(ZALO_ACCESS_TOKEN, { polling: false, webHook: true });
const { handleMessageText } = createMessageHandler(bot);
const { handleWebhookPayload } = createWebhookProcessor(handleMessageText);

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }

  if (requestUrl.pathname === "/webhook") {
    if (req.method === "GET") {
      const verifyToken = requestUrl.searchParams.get("verify_token");
      const challenge = requestUrl.searchParams.get("challenge") || "OK";

      if (verifyToken === VERIFY_TOKEN) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(challenge);
      } else {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Verify token không hợp lệ");
      }

      return;
    }

    if (req.method === "POST") {
      try {
        const body = await readRequestBody(req);

        if (!body) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Payload trống");
          return;
        }

        await handleWebhookPayload(body);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("received");
      } catch (error) {
        console.error("Xử lý webhook thất bại", error);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Payload không hợp lệ");
      }

      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method không được hỗ trợ");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Không tìm thấy tài nguyên");
});

const startServer = async () => {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`Webhook server đang lắng nghe tại cổng ${PORT}`);
    });
  } catch (error) {
    console.error("Không thể khởi tạo ứng dụng", error);
    process.exit(1);
  }
};

server.on("error", (error) => {
  console.error("Không thể khởi động server", error);
});

const shutdown = () => {
  console.log("Đang tắt server...");

  server.close((serverErr) => {
    if (serverErr) {
      console.error("Đóng server thất bại", serverErr);
    }

    closeDatabase()
      .then(() => process.exit(0))
      .catch((dbErr) => {
        console.error("Đóng kết nối Turso thất bại", dbErr);
        process.exit(1);
      });

    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
