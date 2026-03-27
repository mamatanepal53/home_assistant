const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create table
pool.query(`
  CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    temperature REAL,
    humidity REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Discord webhook sender
async function sendDiscordAlert(message) {
  try {
    await fetch(process.env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });
  } catch (err) {
    console.error("Discord webhook error:", err);
  }
}

// WebSocket
io.on("connection", () => {
  console.log("Dashboard connected");
});

// ESP32 sends data here
app.post("/data", async (req, res) => {
  const { temperature, humidity } = req.body;

  await pool.query(
    "INSERT INTO readings (temperature, humidity) VALUES ($1, $2)",
    [temperature, humidity]
  );

  // Alert thresholds
  const HIGH_TEMP = 30;
  const LOW_HUM = 20;

  if (temperature > HIGH_TEMP) {
    sendDiscordAlert(`High Temperature Alert!\nTemperature: ${temperature}°C`);
  }

  if (humidity < LOW_HUM) {
    sendDiscordAlert(`Low Humidity Alert!\nHumidity: ${humidity}%`);
  }

  io.emit("newReading", { temperature, humidity, timestamp: new Date() });

  res.json({ status: "ok" });
});

// Dashboard fetches latest
app.get("/latest", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1"
  );
  res.json(result.rows[0]);
});

// Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log("Server running on port " + port));
