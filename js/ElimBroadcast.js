// CONFIG: Set your Google Sheet URL here (published to web, not private)
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

let table = { headers: [], rows: [] };
let queue = [];
let current = null;
let prevAlive = {};
let isAnimating = false;


function animateLetters(element, text, delay = 0) {
  element.innerHTML = '';
  const letters = text.split('');
  
  letters.forEach((letter, index) => {
    const span = document.createElement('span');
    span.textContent = letter === ' ' ? '\u00A0' : letter;
    span.style.animationDelay = `${delay + index * 0.05}s`;
    element.appendChild(span);
  });
}

function showCard(card) {
  const container = document.getElementById('elim-card-container');
  if (!card) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <div id="elim-card" class="elim-card">
      <div class="gold-accent-bar" id="goldBar"></div>
      <div class="elim-content">
        <div class="team-logo-container" id="logoContainer">
          <img src="${card.logo}" alt="logo" class="team-logo" onerror="this.style.display='none'">
        </div>
        <div class="text-content">
          <div class="eliminated-text" id="elimText">TEAM ELIMINATED</div>
          <div class="team-name" id="teamName">${card.name}</div>
          <div class="divider-line" id="dividerLine"></div>
        </div>
      </div>
    </div>
  `;
}

async function playProfessionalAnimation(teamData) {
  showCard(teamData);
  
  const container = document.getElementById('elim-card-container');
  const card = document.getElementById('elim-card');
  const goldBar = document.getElementById('goldBar');
  const logoContainer = document.getElementById('logoContainer');
  const elimText = document.getElementById('elimText');
  const teamName = document.getElementById('teamName');
  const dividerLine = document.getElementById('dividerLine');
  
  // Phase 1: Card slides in from top (0.8s)
  card.classList.add('slide-in');
  
  await new Promise(r => setTimeout(r, 800));
  
  // Phase 2: Gold bar sweep (0.6s)
  goldBar.classList.add('sweep');
  
  await new Promise(r => setTimeout(r, 300));
  
  // Phase 3: Logo reveal (0.5s)
  logoContainer.classList.add('reveal');
  
  await new Promise(r => setTimeout(r, 400));
  
  // Phase 4: Text reveals
  // Eliminated text with letter-by-letter animation
  animateLetters(elimText, 'TEAM ELIMINATED', 0);
  elimText.classList.add('reveal');
  
  await new Promise(r => setTimeout(r, 800));
  
  // Team name slides up
  teamName.classList.add('reveal');
  
  await new Promise(r => setTimeout(r, 300));
  
  // Divider line grows
  dividerLine.classList.add('grow');
  
  await new Promise(r => setTimeout(r, 400));
  
  // Phase 5: Breathing animation during hold (2.5s)
  card.classList.remove('slide-in');
  card.classList.add('breathing');
  
  await new Promise(r => setTimeout(r, 2500));
  
  // Phase 6: Exit animation (0.7s)
  card.classList.remove('breathing');
  
  // Fade out text first
  elimText.style.transition = 'opacity 0.3s ease-out';
  teamName.style.transition = 'opacity 0.3s ease-out';
  dividerLine.style.transition = 'opacity 0.3s ease-out';
  logoContainer.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
  
  elimText.style.opacity = '0';
  teamName.style.opacity = '0';
  dividerLine.style.opacity = '0';
  logoContainer.style.opacity = '0';
  logoContainer.style.transform = 'scale(0.9)';
  
  await new Promise(r => setTimeout(r, 300));
  
  // Card slides out
  card.classList.add('slide-out');
  
  await new Promise(r => setTimeout(r, 700));
  
  showCard(null);
}

async function processQueue() {
  if (isAnimating || queue.length === 0) return;
  
  isAnimating = true;
  while (queue.length > 0) {
    const teamData = queue.shift();
    await playProfessionalAnimation(teamData);
    // Small delay between multiple eliminations
    if (queue.length > 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  isAnimating = false;
}

function fetchData() {
  const gvizUrl = getGvizUrl(SHEET_URL);
  fetch(gvizUrl)
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
      table = parseGvizTable(json);
      if (!table.headers.length || !table.rows.length) return;
      
      const idx = key => table.headers.findIndex(h => h.toLowerCase().replace(/\s/g, '_') === key);
      const teamLogoIdx = idx('team_logo');
      const teamNameIdx = idx('team_name');
      const playersAliveIdx = idx('players_alive');
      
      // Find teams that just got eliminated (players_alive went from >0 to 0)
      const newElims = [];
      table.rows.forEach(row => {
        const name = row[teamNameIdx];
        const logo = row[teamLogoIdx];
        const alive = parseInt(row[playersAliveIdx], 10) || 0;
        const prev = prevAlive[name];
        
        if (alive === 0 && prev > 0) {
          newElims.push({ 
            name, 
            logo, 
            id: name + Date.now(),
            timestamp: Date.now()
          });
        }
        prevAlive[name] = alive;
      });
      
      if (newElims.length > 0) {
        console.log('New eliminations detected:', newElims);
        queue = queue.concat(newElims);
        processQueue();
      }
    })
    .catch(err => {
      console.error('Error fetching elimination data:', err);
    });
}

// Enhanced initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('Professional Elimination Broadcast initialized with Espresso/Gold theme');
  
  // Initial fetch
  fetchData();
  
  // Set up polling interval
  setInterval(fetchData, 2000);
});