// server.js - ULTRA VoidCaptcha backend
const express = require("express");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory store for challenges
const challenges = {};

// Config
const COLORS = ["red", "blue"];
const MIN_WORD_LENGTH = 12;
const MAX_TRIES = 3;
const INITIAL_COOLDOWN_MS = 5000;
const MAX_COOLDOWN_MS = 60 * 60 * 1000;

// Helpers
function generateWord(len) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let w = "";
  for (let i = 0; i < len; i++) w += chars[Math.floor(Math.random() * chars.length)];
  return w;
}

function clamp(num, min, max) { return Math.max(min, Math.min(max, num)); }

// Routes

// Generate new challenge
app.get("/api/voidcaptcha/challenge", (req, res) => {
  const challengeId = crypto.randomUUID();
  const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  const requiredWord = generateWord(MIN_WORD_LENGTH);

  challenges[challengeId] = {
    targetColor,
    requiredWord,
    attempts: 0,
    blockedUntil: 0,
    verified: false,
    createdAt: Date.now()
  };

  res.json({
    challengeId,
    instruction: `Click the ${targetColor} box AND type the word shown`,
    wordLength: MIN_WORD_LENGTH
  });
});

// Verify challenge
app.post("/api/voidcaptcha/verify", (req, res) => {
  const { challengeId, selectedColor, typedWord } = req.body;
  if (!challengeId || !selectedColor || !typedWord) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const challenge = challenges[challengeId];
  if (!challenge) return res.status(400).json({ error: "Invalid challenge ID" });

  // Cooldown check
  if (challenge.blockedUntil && Date.now() < challenge.blockedUntil) {
    const waitSec = Math.ceil((challenge.blockedUntil - Date.now()) / 1000);
    return res.status(403).json({ verified: false, message: `Wait ${waitSec}s before trying again.` });
  }

  // Already verified
  if (challenge.verified) return res.json({ verified: true, message: "Already verified" });

  // Check word
  if (typedWord !== challenge.requiredWord) {
    challenge.attempts++;
    if (challenge.attempts >= MAX_TRIES) {
      challenge.blockedUntil = Date.now() + clamp(INITIAL_COOLDOWN_MS * Math.pow(2, challenge.attempts - MAX_TRIES), INITIAL_COOLDOWN_MS, MAX_COOLDOWN_MS);
    }
    return res.status(400).json({ verified: false, message: "Incorrect word" });
  }

  // Check color
  if (selectedColor !== challenge.targetColor) {
    challenge.attempts++;
    if (challenge.attempts >= MAX_TRIES) {
      challenge.blockedUntil = Date.now() + clamp(INITIAL_COOLDOWN_MS * Math.pow(2, challenge.attempts - MAX_TRIES), INITIAL_COOLDOWN_MS, MAX_COOLDOWN_MS);
    }
    return res.status(400).json({ verified: false, message: "Incorrect color" });
  }

  // Success
  challenge.verified = true;
  return res.json({ verified: true, message: "Verification successful!" });
});

// Start server
app.listen(port, () => console.log(`VoidCaptcha server running on port ${port}`));
