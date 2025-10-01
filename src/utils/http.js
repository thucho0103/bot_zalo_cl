const readRequestBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (!chunks.length) {
        resolve(null);
        return;
      }

      const raw = Buffer.concat(chunks).toString("utf8");

      if (!raw) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Payload không phải JSON hợp lệ"));
      }
    });

    req.on("error", reject);
  });

module.exports = {
  readRequestBody
};
