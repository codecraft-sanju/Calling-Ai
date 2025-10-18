// ===================================================
// 🚀 Exotel ↔ OpenAI GPT-5 Realtime Voice Bridge (DEBUG SAFE)
// ===================================================
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import WebSocket, { WebSocketServer } from "ws";

dotenv.config();
const app = express();

// ===================================================
// 🧠 Global Middleware Setup (CORS + Parsers)
// ===================================================
app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_URL || "http://localhost:5173"
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// 🧩 use BOTH body parsers for safety
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const log = (...m) => console.log(`[${new Date().toISOString()}]`, ...m);
const TARGET_NUMBERS = [process.env.LEAD1, process.env.LEAD2].filter(Boolean);

// ===================================================
// 🩺 Health Check
// ===================================================
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    time: new Date().toISOString(),
    message: "✅ Exotel AI Voice Server is alive 🚀",
  });
});

// ===================================================
// 1️⃣ Start Exotel Call
// ===================================================
app.post("/api/call", async (req, res) => {
  try {
    const target =
      TARGET_NUMBERS[Math.floor(Math.random() * TARGET_NUMBERS.length)];
    log("🎯 Target selected:", target);

    const exoURL = `https://api.exotel.in/v1/Accounts/${process.env.EXOTEL_SID}/Calls/connect.json`;

    const body = new URLSearchParams({
      From: process.env.AGENT_NUMBER,
      To: target,
      CallerId: process.env.EXOTEL_VIRTUAL_NUMBER,
      Url: `${process.env.SERVER_URL}/ai-voice-start`,
      CallType: "trans",
    });

    const auth =
      "Basic " +
      Buffer.from(
        `${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}`
      ).toString("base64");

    const response = await fetch(exoURL, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const raw = await response.text();
    log("📩 Exotel Raw Response:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    res.json({ success: true, data });
  } catch (err) {
    log("❌ Call start error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===================================================
// 2️⃣ Exotel callback → AI Session XML (GET or POST)
// ===================================================
app.all("/ai-voice-start", (req, res) => {
  log("📞 Callback hit from Exotel — body:", req.body, "query:", req.query);

  const callSid =
    req.body?.CallSid ||
    req.query?.CallSid ||
    req.body?.CallSidXml ||
    "unknown";

  log("🎤 Exotel hit /ai-voice-start → CallSid:", callSid);

  const host = process.env.SERVER_URL.replace("https://", "").replace("http://", "");

  const exotelXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial record="true" action="${process.env.SERVER_URL}/call-status-callback">
    <User>wss://${host}/ws/ai?CallSid=${callSid}</User>
  </Dial>
</Response>`;

  log("🧾 Sending Exotel XML:", exotelXML);
  res.type("application/xml").send(exotelXML);
});

// ===================================================
// 2b️⃣ Call Status Callback
// ===================================================
app.post("/call-status-callback", (req, res) => {
  log("☎️ Call status update:", req.body);
  res.type("application/xml").send("<Response/>");
});

// ===================================================
// 3️⃣ WebSocket Bridge: Exotel ↔ GPT-5 Realtime
// ===================================================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  log(`🚀 Exotel AI Voice Server running on port ${PORT}`)
);

const wss = new WebSocketServer({ server, path: "/ws/ai" });

wss.on("connection", async (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const callSid = urlParams.get("CallSid");
  if (!callSid) {
    ws.close(1008, "Missing CallSid");
    return;
  }

  log(`🔊 Exotel WS connected → CallSid=${callSid}`);

  const aiSocket = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    }
  );

  aiSocket.on("open", () => {
    log("🤝 Connected to GPT-5 Realtime Voice API");

    const setupMsg = {
      type: "session.update",
      session: {
        voice: "verse",
        input_audio_format: "wav",
        output_audio_format: "wav",
        turn_detection: { type: "server_vad" },
        instructions:
          "You are a confident, friendly AI sales agent for website and app development. Speak in natural Hinglish — mix Hindi + English like a human telecaller. Start with a warm greeting and talk casually but smartly.",
      },
    };
    aiSocket.send(JSON.stringify(setupMsg));

    // instant greet if silent
    setTimeout(() => {
      aiSocket.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions:
              "Namaste 🙌 main Sanjay ki AI assistant bol rahi hu. Kya aap website ya app development ke baare me baat karna chahenge?",
          },
        })
      );
    }, 3000);
  });

  ws.on("message", (data) => aiSocket.send(data));
  aiSocket.on("message", (msg) => ws.send(msg));

  ws.on("close", () => {
    log(`🔇 Exotel WS closed: ${callSid}`);
    aiSocket.close();
  });

  aiSocket.on("close", () => log(`🧠 GPT-5 socket closed: ${callSid}`));
  aiSocket.on("error", (err) => {
    log(`❌ GPT-5 Socket error [${callSid}]:`, err.message);
    ws.close(1011, "AI Error");
  });
});
