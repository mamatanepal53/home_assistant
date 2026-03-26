const API = window.location.origin;

const tempEl = document.getElementById("temp");
const humEl = document.getElementById("hum");
const timeEl = document.getElementById("time");
const historyEl = document.getElementById("history");

function render(reading) {
  tempEl.textContent = reading.temperature.toFixed(1);
  humEl.textContent = reading.humidity.toFixed(1);
  timeEl.textContent = new Date(reading.timestamp).toLocaleString();

  const div = document.createElement("div");
  div.className = "line";
  div.textContent =
    `${reading.temperature.toFixed(1)}°C | ${reading.humidity.toFixed(1)}% | ${new Date(reading.timestamp).toLocaleTimeString()}`;
  historyEl.prepend(div);
}

// Load latest on page load
fetch(`${API}/latest`)
  .then(r => r.json())
  .then(data => { if (data) render(data); });

// Live updates
const socket = io(API);
socket.on("newReading", data => render(data));
