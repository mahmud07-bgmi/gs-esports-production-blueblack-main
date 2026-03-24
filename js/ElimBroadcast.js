const SHEET_URL = "https://docs.google.com/spreadsheets/d/1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8/";

function getGvizUrl(sheetUrl) {
  const id = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)[1];
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
}

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

function showCard(data) {
  const container = document.getElementById("elim-card-container");

  if (!data) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
  <div id="elim-card" class="elim-card slide-in">
    <div class="elim-content">

     <img src="${data.logo}" class="team-logo" onerror="this.style.display='none'">

      <div class="text-content">
        <div class="eliminated-text">TEAM ELIMINATED</div>
        <div class="team-name">${data.name}</div>

        <div class="team-finishes" id="teamFinishes">
          FINISHES: <span>${data.finishes}</span>
        </div>

      </div>
    </div>
  </div>
  `;
}

async function playAnimation(data) {
  showCard(data);

  const logo = document.querySelector(".team-logo");
  const elimText = document.querySelector(".eliminated-text");
  const teamName = document.querySelector(".team-name");
  const finishes = document.getElementById("teamFinishes");

  // 🔥 Step by step reveal (same tera old style)
  await new Promise(r => setTimeout(r, 200));
  logo.classList.add("reveal");

  await new Promise(r => setTimeout(r, 200));
  elimText.classList.add("reveal");

  await new Promise(r => setTimeout(r, 200));
  teamName.classList.add("reveal");

  await new Promise(r => setTimeout(r, 200));
  finishes.classList.add("reveal");

  // Hold
  await new Promise(r => setTimeout(r, 2500));

  // Exit
  const card = document.getElementById("elim-card");
  card.classList.add("slide-out");

  await new Promise(r => setTimeout(r, 600));

  showCard(null);
}

async function processQueue() {
  if (isAnimating) return;

  isAnimating = true;

  while (queue.length > 0) {
    await playAnimation(queue.shift());
  }

  isAnimating = false;
}

function fetchData() {
  fetch(getGvizUrl(SHEET_URL))
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(
        text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1)
      );

      const table = parseGvizTable(json);

      const idx = key =>
        table.headers.findIndex(h =>
          h.toLowerCase().replace(/\s/g, "_") === key
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
          queue.push({ name, logo, finishes });
        }

        prevAlive[name] = alive;
      });

      processQueue();
    });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchData();
  setInterval(fetchData, 2000);
});
