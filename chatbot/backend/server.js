import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the chat.html file when visiting http://localhost:3000
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "chat.html"));
});

app.post("/api/chat", async (req, res) => {
  try {
    const { history } = req.body;
    console.log("Incoming request with history length:", history.length);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: history,
          systemInstruction: {
            parts: [{
              text: "You are StudyCoach AI. Output JSON ONLY with schema: {'reply': string}. " +
                    "Your response length should vary based on the complexity of the user's request. " +
                    "For simple questions, be very brief (1-2 sentences). " +
                    "For complex academic topics, provide concise, structured explanations or step-by-step solutions. " +
                    "Always be concise and academic. Maximum length: 300 words. No extra fields. No preamble."
            }]
          },
          generationConfig: {
            maxOutputTokens: 500,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();
    console.log("Raw Response from Gemini:", JSON.stringify(data, null, 2));

    if (data.error) {
       console.error("Gemini API Error:", data.error.message);
       return res.status(500).json({ reply: `Gemini Error: ${data.error.message}` });
    }

    let reply;
    try {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const finishReason = data.candidates?.[0]?.finishReason;
        throw new Error(`AI blocked the response. Reason: ${finishReason || "Unknown"}`);
      }
      const parsed = JSON.parse(text);
      reply = parsed.reply || text || "Empty response from Gemini";
    } catch (e) {
      console.warn("Processing Error:", e.message);
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || `AI failed to generate a valid response. (${e.message})`;
    }

    res.json({ reply });

  } catch (error) {
    console.error("Backend Catch-all Error:", error);
    const msg = error.code === 'ENOTFOUND' 
      ? "Network/DNS issue: Cannot reach Google AI API." 
      : `Server error: ${error.message}`;
    res.status(500).json({ reply: msg });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});