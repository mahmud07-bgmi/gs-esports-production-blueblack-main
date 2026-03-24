// CONFIG
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8/';

function getGvizUrl(sheetUrl) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const sheetId = match[1];
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
}

function parseGvizTable(json) {
  if (!json.table) return { headers: [], rows: [] };
  const headers = json.table.cols.map(col => col.label);
  const rows = json.table.rows.map(row =>
    row.c.map(cell => (cell ? cell.v : ''))
  );
  return { headers, rows };
}

// 🔥 GLOBAL STATE (IMPORTANT FIX)
let isVisible = null;

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

function renderTable(table, shouldShow) {

  const idx = key => table.headers.findIndex(h => h.toLowerCase().replace(/\s/g, '_') === key);

  const srNoIdx = idx('sr_no');
  const teamLogoIdx = idx('team_logo');
  const teamInitialIdx = idx('team_initial');
  const playersAliveIdx = idx('players_alive');
  const totalPointsIdx = idx('total_points');
  const bluezoneIdx = idx('bluezone');

  const sortedRows = [...table.rows].sort((a, b) => {
    const aPoints = parseInt(a[totalPointsIdx], 10) || 0;
    const bPoints = parseInt(b[totalPointsIdx], 10) || 0;
    if (bPoints !== aPoints) return bPoints - aPoints;

    const aAlive = parseInt(a[playersAliveIdx], 10) || 0;
    const bAlive = parseInt(b[playersAliveIdx], 10) || 0;
    if (bAlive !== aAlive) return bAlive - aAlive;

    const aRank = parseInt(a[srNoIdx], 10) || 0;
    const bRank = parseInt(b[srNoIdx], 10) || 0;
    return aRank - bRank;
  });

  const displayRows = Array.from({ length: sortedRows.length }, (_, i) => ({
    rank: i + 1,
    ...sortedRows[i],
  }));

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

  displayRows.forEach(row => {
    const isBluezone = String(row[bluezoneIdx]).toLowerCase() === 'true';

    html += `<tr${isBluezone ? ' class="bluezone-blink"' : ''}>`;
    html += `<td>${row.rank}</td>`;
    html += `<td class="team">
      <img src="${row[teamLogoIdx]}" onerror="this.style.display='none'">
      <span>${row[teamInitialIdx]}</span>
    </td>`;
    html += `<td>${createAliveRectangles(parseInt(row[playersAliveIdx], 10) || 0)}</td>`;
    html += `<td>${row[totalPointsIdx]}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  const container = document.getElementById('table-container');

  // 🔥 MAIN FIX (NO REPEAT ANIMATION)
  if (isVisible === null) {
    // first load → no animation
    container.className = 'table-container';
  } 
  else if (shouldShow !== isVisible) {
    // only animate on change
    container.className = 'table-container ' + (shouldShow ? 'slide-in' : 'slide-out');
  }

  // update state
  isVisible = shouldShow;

  // update content
  container.innerHTML = html;
}

function updateVisibility(table) {
  const playersAliveIdx = table.headers.findIndex(
    h => h.toLowerCase().replace(/\s/g, '_') === 'players_alive'
  );

  const teamsAlive = table.rows.filter(row => {
    const alive = parseInt(row[playersAliveIdx], 10) || 0;
    return alive > 0;
  }).length;

  return teamsAlive > 4;
}

// MAIN
const gvizUrl = getGvizUrl(SHEET_URL);

function fetchData() {
  fetch(gvizUrl)
    .then(res => res.text())
    .then(text => {

      const json = JSON.parse(
        text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
      );

      const table = parseGvizTable(json);

      // ✅ HIDE LOADING
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').style.display = 'none';

      // ❌ No data case
      if (!table.headers.length || !table.rows.length) {
        document.getElementById('nodata').style.display = '';
        document.getElementById('table-root').style.display = 'none';
        return;
      }

      // ✅ SHOW TABLE
      document.getElementById('nodata').style.display = 'none';
      document.getElementById('table-root').style.display = '';

      const shouldShow = updateVisibility(table);
      renderTable(table, shouldShow);
    })
    .catch(() => {
      // ❌ ERROR SHOW
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').style.display = '';
      document.getElementById('error').textContent = 'Failed to load data';
      document.getElementById('table-root').style.display = 'none';
    });
}

fetchData();
setInterval(fetchData, 2000);
