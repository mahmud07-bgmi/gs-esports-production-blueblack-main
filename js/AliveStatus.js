// CONFIG
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8/';
let isVisible = null;

// ================= URL =================
function getGvizUrl(sheetUrl) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const sheetId = match[1];
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
}

// ================= PARSE =================
function parseGvizTable(json) {
  if (!json.table) return { headers: [], rows: [] };
  const headers = json.table.cols.map(col => col.label);
  const rows = json.table.rows.map(row =>
    row.c.map(cell => (cell ? cell.v : ''))
  );
  return { headers, rows };
}

// ================= ALIVE =================
function createAliveRectangles(count) {
  const total = 4;
  const isEliminated = count === 0;

  let html = '<div class="alive-rectangles">';
  for (let i = 0; i < total; i++) {
    html += `<div class="alive-rect-bar${i >= count ? ' dead' : ''}"></div>`;
  }

  if (isEliminated) {
    html += '<div class="alive-rect-strike"></div>';
  }

  html += '</div>';
  return html;
}

// ================= VISIBILITY =================
function updateVisibility(table) {
  const idx = table.headers.findIndex(
    h => h.toLowerCase().replace(/\s/g, '_') === 'players_alive'
  );

  if (idx === -1) return true;

  let teamsAlive = 0;

  table.rows.forEach(row => {
    if ((parseInt(row[idx]) || 0) > 0) teamsAlive++;
  });

  return teamsAlive > 4; // 🔥 4 pe hide
}

// ================= RENDER =================
function renderTable(table, shouldShow) {
  const container = document.getElementById('table-container');

  const idx = key => table.headers.findIndex(
    h => h.toLowerCase().replace(/\s/g, '_') === key
  );

  const srNoIdx = idx('sr_no');
  const logoIdx = idx('team_logo');
  const nameIdx = idx('team_initial');
  const aliveIdx = idx('players_alive');
  const ptsIdx = idx('total_points');
  const blueIdx = idx('bluezone');

  const sorted = [...table.rows].sort((a, b) => {
    const p = (parseInt(b[ptsIdx]) || 0) - (parseInt(a[ptsIdx]) || 0);
    if (p) return p;

    const aAlive = (parseInt(b[aliveIdx]) || 0) - (parseInt(a[aliveIdx]) || 0);
    if (aAlive) return aAlive;

    return (parseInt(a[srNoIdx]) || 0) - (parseInt(b[srNoIdx]) || 0);
  });

  let html = `
  <table class="table-alive">
    <thead>
      <tr>
        <th>#</th>
        <th class="team">TEAM</th>
        <th>ALIVE</th>
        <th>PTS</th>
      </tr>
    </thead>
    <tbody>
  `;

  sorted.forEach((row, i) => {
    const isBlue = String(row[blueIdx]).toLowerCase() === 'true';

    html += `<tr class="${isBlue ? 'bluezone-blink' : ''}">`;
    html += `<td>${i + 1}</td>`;

    html += `<td class="team">
      <img src="${row[logoIdx]}" onerror="this.style.display='none'">
      <span>${row[nameIdx]}</span>
    </td>`;

    html += `<td>${createAliveRectangles(parseInt(row[aliveIdx]) || 0)}</td>`;
    html += `<td>${row[ptsIdx]}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  // ================= SLIDE CONTROL =================
  if (isVisible === null) {
    container.className = 'table-container'; // ❌ no animation first time
  } 
  else if (shouldShow !== isVisible) {
    container.className = 'table-container ' + (shouldShow ? 'slide-in' : 'slide-out');

    // 🔥 remove after hide
    if (!shouldShow) {
      setTimeout(() => {
        container.innerHTML = "";
      }, 600);
    }
  }

  isVisible = shouldShow;

  // ================= UPDATE ONLY IF CHANGED =================
  if (container.innerHTML !== html && shouldShow) {
    container.innerHTML = html;
  }
}

// ================= MAIN =================
const gvizUrl = getGvizUrl(SHEET_URL);

function fetchData() {
  fetch(gvizUrl)
    .then(res => res.text())
    .then(text => {

      const json = JSON.parse(
        text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
      );

      const table = parseGvizTable(json);

      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').style.display = 'none';

      if (!table.headers.length || !table.rows.length) {
        document.getElementById('nodata').style.display = '';
        document.getElementById('table-root').style.display = 'none';
        return;
      }

      document.getElementById('nodata').style.display = 'none';
      document.getElementById('table-root').style.display = '';

      const shouldShow = updateVisibility(table);
      renderTable(table, shouldShow);
    })
    .catch(() => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').style.display = '';
      document.getElementById('error').textContent = 'Failed to load data';
      document.getElementById('table-root').style.display = 'none';
    });
}

fetchData();
setInterval(fetchData, 2000);
