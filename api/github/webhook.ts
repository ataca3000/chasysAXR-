import crypto from "crypto";
import express from "express";

const router = express.Router();

const SECRET = process.env.GITHUB_WEBHOOK_SECRET;

function verifySignature(req) {
  const signature = req.headers["x-hub-signature-256"];
  const body = JSON.stringify(req.body);

  const hmac = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("hex");

  const expected = `sha256=${hmac}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

router.post("/", (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.headers["x-github-event"];
  const payload = req.body;

  console.log("📦 Evento recibido:", event);

  switch (event) {
    case "push":
      console.log("Push detectado:", payload.repository.full_name);
      break;

    case "pull_request":
      console.log("PR:", payload.action);
      break;

    case "installation":
      console.log("Instalación:", payload.action);
      break;
  }

  res.status(200).send("OK");
});

export default router;
