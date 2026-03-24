// CONFIG
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8/";

// Convert sheet URL
function getGvizUrl(sheetUrl) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const sheetId = match[1];
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
}

// Parse response
function parseGvizTable(json) {
  const headers = json.table.cols.map(col => col.label);
  const rows = json.table.rows.map(row =>
    row.c.map(cell => (cell ? cell.v : ""))
  );
  return { headers, rows };
}

let prevAlive = {};
let queue = [];
let isAnimating = false;

// Letter animation
function animateLetters(element, text, delay = 0) {
  element.innerHTML = "";
  text.split("").forEach((letter, i) => {
    const span = document.createElement("span");
    span.textContent = letter === " " ? "\u00A0" : letter;
    span.style.animationDelay = `${delay + i * 0.05}s`;
    element.appendChild(span);
  });
}

// Create Card
function showCard(data) {
  const container = document.getElementById("elim-card-container");

  if (!data) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
  <div id="elim-card" class="elim-card">

    <div class="gold-accent-bar" id="goldBar"></div>

    <div class="elim-content">

      <div class="team-logo-container" id="logoContainer">
        <img src="${data.logo}" class="team-logo" onerror="this.style.display='none'">
      </div>

      <div class="text-content">

        <div class="eliminated-text" id="elimText">TEAM ELIMINATED</div>

        <div class="team-name" id="teamName">${data.name}</div>

        <div class="divider-line" id="dividerLine"></div>

        <div class="team-finishes" id="teamFinishes">
          FINISHES: ${data.finishes}
        </div>

      </div>

    </div>

  </div>
  `;
}

// Main Animation
async function playAnimation(data) {

  showCard(data);

  const card = document.getElementById("elim-card");
  const goldBar = document.getElementById("goldBar");
  const logo = document.getElementById("logoContainer");
  const elimText = document.getElementById("elimText");
  const teamName = document.getElementById("teamName");
  const divider = document.getElementById("dividerLine");
  const finishes = document.getElementById("teamFinishes");

  // Phase 1: Slide in
  card.classList.add("slide-in");
  await new Promise(r => setTimeout(r, 800));

  // Phase 2: Gold sweep
  goldBar.classList.add("sweep");
  await new Promise(r => setTimeout(r, 300));

  // Phase 3: Logo reveal
  logo.classList.add("reveal");
  await new Promise(r => setTimeout(r, 400));

  // Phase 4: Text animation
  animateLetters(elimText, "TEAM ELIMINATED");
  elimText.classList.add("reveal");

  await new Promise(r => setTimeout(r, 700));

  teamName.classList.add("reveal");
  await new Promise(r => setTimeout(r, 300));

  divider.classList.add("grow");
  await new Promise(r => setTimeout(r, 300));

  // 🔥 FINISHES ANIMATION (CSS driven)
  finishes.classList.add("reveal");

  // Hold (breathing)
  card.classList.remove("slide-in");
  card.classList.add("breathing");

  await new Promise(r => setTimeout(r, 2500));

  // Exit animation
  card.classList.remove("breathing");

  [elimText, teamName, divider, finishes, logo].forEach(el => {
    el.style.transition = "all 0.3s ease";
    el.style.opacity = "0";
  });

  logo.style.transform = "scale(0.9)";

  await new Promise(r => setTimeout(r, 300));

  card.classList.add("slide-out");

  await new Promise(r => setTimeout(r, 700));

  showCard(null);
}

// Queue system
async function processQueue() {
  if (isAnimating) return;

  isAnimating = true;

  while (queue.length > 0) {
    const team = queue.shift();
    await playAnimation(team);

    if (queue.length > 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  isAnimating = false;
}

// Fetch Data
function fetchData() {

  const url = getGvizUrl(SHEET_URL);

  fetch(url)
    .then(res => res.text())
    .then(text => {

      const json = JSON.parse(
        text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1)
      );

      const table = parseGvizTable(json);

      const idx = key =>
        table.headers.findIndex(
          h => h.toLowerCase().replace(/\s/g, "_") === key
        );

      const nameIdx = idx("team_name");
      const logoIdx = idx("team_logo");
      const aliveIdx = idx("players_alive");
      const finishIdx = idx("finish_points");

      table.rows.forEach(row => {

        const name = row[nameIdx];
        const logo = row[logoIdx];
        const alive = parseInt(row[aliveIdx]) || 0;
        const finishes = row[finishIdx] || 0;

        if (prevAlive[name] > 0 && alive === 0) {

          queue.push({
            name,
            logo,
            finishes
          });

        }

        prevAlive[name] = alive;

      });

      processQueue();

    })
    .catch(err => console.log("Sheet error:", err));
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔥 Pro Elimination System with Finishes Loaded");
  fetchData();
  setInterval(fetchData, 2000);
});
