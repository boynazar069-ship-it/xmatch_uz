const STORAGE_KEY = 'xorazm-match-data-v1';
const COLORS = [
  { id: 'blue', name: 'Ko‘k', hex: '#5b8cff' },
  { id: 'red', name: 'Qizil', hex: '#ff627b' },
  { id: 'yellow', name: 'Sariq', hex: '#f1cb5b' },
  { id: 'orange', name: 'Olov rang', hex: '#ff995f' }
];
const today = new Date();
const dateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return dateString(next); };
const todayString = dateString(today);
const tomorrowString = addDays(today, 1);
const demoTeams = { blue: 'Xorazm FC', red: 'Urganch Stars', yellow: 'Gurlan United', orange: 'Xiva City' };
const initialState = () => ({
  teamDays: { [todayString]: demoTeams },
  dailyStats: {
    [todayString]: {
      'Xorazm FC': { games: 3, wins: 2, draws: 0, losses: 1 },
      'Urganch Stars': { games: 3, wins: 1, draws: 1, losses: 1 },
      'Gurlan United': { games: 3, wins: 0, draws: 1, losses: 2 },
      'Xiva City': { games: 3, wins: 1, draws: 2, losses: 0 }
    }
  },
  heroes: [
    { id: 'h1', date: todayString, role: 'Eng yaxshi o‘yinchi', name: 'Jasur Matyoqubov', team: 'Xorazm FC', goals: 2, assists: 1, image: '' },
    { id: 'h2', date: todayString, role: 'Eng yaxshi darvozabon', name: 'Bekzod Karimov', team: 'Urganch Stars', goals: 0, assists: 0, image: '' },
    { id: 'h3', date: todayString, role: 'Eng yaxshi to‘purar', name: 'Azizbek Raximov', team: 'Gurlan United', goals: 4, assists: 2, image: '' }
  ],
  scorers: [
    { id: 'p1', name: 'Boynazar Boynazarov', team: 'Xorazm FC', goals: 78, assists: 20, image: '' },
    { id: 'p2', name: 'Azizbek Raximov', team: 'Gurlan United', goals: 61, assists: 17, image: '' },
    { id: 'p3', name: 'Jasur Matyoqubov', team: 'Xorazm FC', goals: 54, assists: 26, image: '' },
    { id: 'p4', name: 'Sardor Eshonqulov', team: 'Xiva City', goals: 43, assists: 12, image: '' },
    { id: 'p5', name: 'Bekzod Karimov', team: 'Urganch Stars', goals: 2, assists: 4, image: '' }
  ],
  fixtures: [
    { id: 'f1', date: tomorrowString, start: '18:00', end: '20:00', location: 'Urganch futbol maydoni', teams: ['Xorazm FC', 'Urganch Stars', 'Gurlan United', 'Xiva City'] }
  ],
  tournaments: [
    { id: 't1', name: 'Xorazm Match Kubogi', teams: 16, date: '2025-10-10', status: 'Yakunlangan', winner: 'Xorazm FC', bracket: '1/8 final → Chorak final → Yarim final → Final' },
    { id: 't2', name: 'Kuzgi Pley-off', teams: 8, date: todayString, status: 'Rejalashtirilgan', winner: '', bracket: 'Chorak final → Yarim final → Final' }
  ],
  settings: { telegram: 'https://t.me/+cJZVTCOeju40YmI6', instagram: 'https://www.instagram.com/xorazm_match?stkn=bzQxbGN2OXIzM3Y4' }
});

let state = loadState();
let selectedDate = todayString;
let currentAdminTab = 'daily';
let currentDetailSection = '';
let toastTimer;
let adminUnlocked = false;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialState();
  const parsed = JSON.parse(saved);
  const defaults = initialState();
  const restored = { ...defaults, ...parsed, settings: { ...defaults.settings, ...parsed.settings } };
  if (restored.settings.telegram === 'https://t.me/xorazmmatch') restored.settings.telegram = defaults.settings.telegram;
  if (restored.settings.instagram === 'https://instagram.com/xorazmmatch') restored.settings.instagram = defaults.settings.instagram;
  if (!parsed.dailyStats) {
    restored.dailyStats = {};
    (parsed.matches || []).forEach((match) => {
      if (!restored.dailyStats[match.date]) restored.dailyStats[match.date] = {};
      [[match.home, Number(match.homeGoals), Number(match.awayGoals)], [match.away, Number(match.awayGoals), Number(match.homeGoals)]].forEach(([colorId, goals, conceded]) => {
        const name = restored.teamDays?.[match.date]?.[colorId];
        if (!name) return;
        if (!restored.dailyStats[match.date][name]) restored.dailyStats[match.date][name] = { games: 0, wins: 0, draws: 0, losses: 0 };
        const stats = restored.dailyStats[match.date][name];
        stats.games += 1;
        if (goals > conceded) stats.wins += 1;
        else if (goals === conceded) stats.draws += 1;
        else stats.losses += 1;
      });
    });
  }
  delete restored.matches;
  delete restored.teamColors;
  return restored;
}

function saveState(message = 'O‘zgarishlar saqlandi') {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderDashboard();
    showToast(message);
  } catch (error) {
    console.error('Ma’lumotni saqlashda xatolik:', error);
    showToast('Ma’lumot saqlanmadi. Brauzer xotirasini tekshiring.', true);
  }
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function safeImageUrl(url) {
  if (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(String(url))) return url;
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  if (globalThis.crypto?.subtle?.digest) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const bitLength = bytes.length * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  const words = new Uint32Array(64);
  const rotateRight = (word, count) => (word >>> count) | (word << (32 - count));

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15];
      const y = words[index - 2];
      const sigma0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const sigma1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const first = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const second = (sum0 + majority) >>> 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + first) >>> 0, c, b, a, (first + second) >>> 0];
    }
    hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toLocaleUpperCase('uz');
}

function avatar(name, image, extraClass = '') {
  const src = safeImageUrl(image);
  return `<span class="avatar ${extraClass}">${src ? `<img src="${escapeHTML(src)}" alt="" loading="lazy">` : escapeHTML(initials(name))}</span>`;
}

async function imageFileToDataUrl(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Rasm JPG, PNG yoki WEBP formatida bo‘lishi kerak.');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Rasm hajmi 12 MB dan oshmasligi kerak.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Rasmni qayta ishlash imkoni bo‘lmadi.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    bitmap.close();
  }
}

function dateLabel(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!value) return 'Sana belgilanmagan';
  const date = new Date(`${value}T12:00:00`);
  const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const month = months[date.getMonth()];
  const displayedMonth = options.month === 'short' ? month.slice(0, 3) : month;
  return `${date.getDate()}-${displayedMonth} ${date.getFullYear()}`;
}

function formatDateShort(value) {
  if (!value) return ['—', '—'];
  const date = new Date(`${value}T12:00:00`);
  const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  return [String(date.getDate()).padStart(2, '0'), months[date.getMonth()].slice(0, 3)];
}

function teamFor(date, color) {
  return state.teamDays?.[date]?.[color] || COLORS.find((item) => item.id === color)?.name || color;
}

function teamColorFor(date, color) {
  return COLORS.find((item) => item.id === color)?.hex || '#8792a9';
}

function dailyStandings(date) {
  const roster = state.teamDays?.[date] || {};
  const statsForDate = state.dailyStats?.[date] || {};
  const teams = COLORS.filter((color) => Boolean(roster[color.id]?.trim())).map((color) => {
    const name = roster[color.id].trim();
    const stats = statsForDate[name] || {};
    const games = Number(stats.games) || 0;
    const wins = Number(stats.wins) || 0;
    const draws = Number(stats.draws) || 0;
    const losses = Number(stats.losses) || 0;
    return { ...color, name, games, wins, draws, losses, points: wins * 3 + draws };
  });
  return teams.sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name, 'uz'));
}

function overallStandings() {
  const table = new Map();
  Object.values(state.dailyStats || {}).forEach((dateStats) => {
    Object.entries(dateStats).forEach(([name, stats]) => {
      if (!table.has(name)) table.set(name, { name, games: 0, wins: 0, draws: 0, losses: 0, points: 0 });
      const team = table.get(name);
      team.games += Number(stats.games) || 0;
      team.wins += Number(stats.wins) || 0;
      team.draws += Number(stats.draws) || 0;
      team.losses += Number(stats.losses) || 0;
      team.points += (Number(stats.wins) || 0) * 3 + (Number(stats.draws) || 0);
    });
  });
  return [...table.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name, 'uz'));
}

function playerSummary(name) {
  const normalizedName = name.toLocaleLowerCase('uz').trim();
  const scorer = state.scorers.find((item) => item.name.toLocaleLowerCase('uz').trim() === normalizedName);
  const awards = state.heroes.filter((item) => item.name.toLocaleLowerCase('uz').trim() === normalizedName);
  const team = scorer?.team || awards.find((item) => item.team)?.team || 'Xorazm FC';
  const standings = overallStandings();
  const teamStanding = standings.find((item) => item.name.toLocaleLowerCase('uz').trim() === team.toLocaleLowerCase('uz').trim());
  const placements = [0, 0, 0, 0];
  Object.keys(state.dailyStats || {}).forEach((date) => {
    const position = dailyStandings(date).findIndex((item) => item.name.toLocaleLowerCase('uz').trim() === team.toLocaleLowerCase('uz').trim());
    if (position >= 0 && position < placements.length) placements[position] += 1;
  });
  return {
    name,
    team,
    image: scorer?.image || awards.find((item) => item.image)?.image || '',
    goals: Number(scorer?.goals) || 0,
    assists: Number(scorer?.assists) || 0,
    awards,
    placements,
    teamRank: teamStanding ? standings.findIndex((item) => item.name === teamStanding.name) + 1 : 0,
    points: teamStanding?.points || 0
  };
}

function renderPlayerAccount(view = 'choice', playerName = 'Boynazar Boynazarov') {
  const content = document.querySelector('#playerContent');
  if (view === 'login') {
    content.innerHTML = `<div class="account-mode"><p class="detail-subtitle">Ism-familiyangiz va parolingiz orqali shaxsiy hisobingizga kiring.</p><form class="account-form" data-account-form="login"><label class="form-field">Ism-familiya<input name="name" type="text" autocomplete="name" placeholder="Masalan, Ali Valiyev" required></label><label class="form-field">Parol<input name="password" type="password" autocomplete="current-password" placeholder="Parolingiz" required></label><p class="account-notice" role="status">Dizayn namunasi: server ulangach hisobga kirish faollashadi.</p><button class="primary-button" type="submit">Kirish <span>→</span></button></form><button class="text-button" type="button" data-player-view="choice">← Orqaga</button></div>`;
    return;
  }
  if (view === 'register') {
    content.innerHTML = `<div class="account-mode"><p class="detail-subtitle">Ism-familiyangiz takrorlanmas bo‘lishi kerak. Telefon raqamingiz profilingizda saqlanadi.</p><form class="account-form" data-account-form="register"><label class="form-field">Ism-familiya<input name="name" type="text" autocomplete="name" placeholder="Masalan, Ali Valiyev" required></label><label class="form-field">Telefon raqami<input name="phone" type="tel" autocomplete="tel" placeholder="+998 90 123 45 67" required></label><label class="form-field">Yangi parol<input name="password" type="password" autocomplete="new-password" minlength="8" placeholder="Kamida 8 belgi" required></label><label class="form-field">Parolni tasdiqlang<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Parolni qayta kiriting" required></label><p class="account-notice" role="status">Dizayn namunasi: ro‘yxatdan o‘tish server ulangach faollashadi.</p><button class="primary-button" type="submit">Ro‘yxatdan o‘tish <span>→</span></button></form><button class="text-button" type="button" data-player-view="choice">← Orqaga</button></div>`;
    return;
  }
  if (view === 'profile') {
    const player = playerSummary(playerName);
    const awardsByRole = ['Eng yaxshi o‘yinchi', 'Eng yaxshi to‘purar', 'Eng yaxshi darvozabon'].map((role) => ({
      role,
      count: player.awards.filter((award) => award.role === role).length
    }));
    const overallPosition = player.teamRank ? `${player.teamRank}-o‘rin` : 'Reytingda yo‘q';
    content.innerHTML = `<div class="profile-preview"><div class="profile-hero">${avatar(player.name, player.image, 'profile-avatar')}<div><span class="profile-kicker">O‘YINCHI PROFILI</span><h3>${escapeHTML(player.name)}</h3><p>${escapeHTML(player.team)}</p></div></div><label class="profile-photo-picker">Rasmni galereyadan tanlang<input id="profilePhotoFile" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="account-notice" role="status">Rasm faqat namuna sifatida ko‘rsatiladi. Hisob rasmini saqlash server ulangach yoqiladi.</p><div class="profile-stat-grid"><div><strong>${player.goals}</strong><span>Gol</span></div><div><strong>${player.assists}</strong><span>Asist</span></div><div><strong>${player.awards.length}</strong><span>Kun qahramoni</span></div></div><section class="profile-panel"><h4>Eng yaxshi o‘yin nominatsiyalari</h4><div class="profile-award-list">${awardsByRole.map((item) => `<div><span>${escapeHTML(item.role)}</span><b>${item.count} marta</b></div>`).join('')}</div></section><section class="profile-panel"><h4>Jamoa natijalari · ${escapeHTML(player.team)}</h4><div class="profile-placement-grid">${player.placements.map((count, index) => `<div><strong>${count}</strong><span>${index + 1}-o‘rin</span></div>`).join('')}</div><p class="profile-standing">${overallPosition} · ${player.points} ochko umumiy jadvalda</p></section><button class="text-button" type="button" data-player-view="choice">← Hisob bo‘limiga qaytish</button></div>`;
    return;
  }
  content.innerHTML = `<div class="account-welcome"><span class="account-icon">⚽</span><h3>O‘yinchi hisobiga xush kelibsiz</h3><p>Shaxsiy statistikangiz, yutuqlaringiz va jamoangiz natijalarini kuzating.</p></div><div class="account-choice"><button class="primary-button" type="button" data-player-view="login">KIRISH <span>→</span></button><button class="secondary-button" type="button" data-player-view="register">RO‘YXATDAN O‘TISH <span>＋</span></button></div><button class="text-button demo-profile-link" type="button" data-player-view="profile" data-player-name="Boynazar Boynazarov">Profil ko‘rinishi namunasini ochish</button><p class="account-notice">Namuna ko‘rinishi. Hisoblar server ulangach barcha qurilmalarda saqlanadi.</p>`;
}

function sortedScorers() {
  return [...state.scorers].sort((a, b) => (Number(b.goals) + Number(b.assists) * .5) - (Number(a.goals) + Number(a.assists) * .5) || Number(b.goals) - Number(a.goals));
}

function lookupForm(kind, label, placeholder) {
  return `<form class="lookup-form" data-lookup="${kind}"><label for="${kind}Lookup">${label}</label><div class="lookup-controls"><input id="${kind}Lookup" name="name" type="search" placeholder="${placeholder}" autocomplete="off" required><button class="primary-button" type="submit">Qidirish</button></div></form><div class="lookup-result" id="${kind}LookupResult" aria-live="polite"></div>`;
}

function renderDashboard() {
  document.querySelector('#telegramLink').href = safeImageUrl(state.settings.telegram) || 'https://t.me/';
  document.querySelector('#instagramLink').href = safeImageUrl(state.settings.instagram) || 'https://instagram.com/';
}

function detailRow(main, detail, stat = '', label = '') {
  return `<div class="detail-row"><div class="detail-row-main">${main}</div>${label ? `<span class="detail-label">${escapeHTML(label)}</span>` : ''}${stat !== '' ? `<b class="detail-stat">${escapeHTML(stat)}</b>` : ''}${detail ? `<span class="detail-label">${escapeHTML(detail)}</span>` : ''}</div>`;
}

function openDetail(section) {
  const detail = document.querySelector('#detailContent');
  const titles = { daily: 'Kunlik natijalar', overall: 'Umumiy natijalar', heroes: 'Kun qahramonlari', scorers: 'Eng yaxshi to‘purari', fixtures: 'Keyingi o‘yinlar', tournaments: 'Turnirlar' };
  let content = '';
  if (section === 'daily') {
    const teams = dailyStandings(selectedDate);
    content = `<h2 class="detail-title">Kunlik natijalar</h2><p class="detail-subtitle">G‘alaba — 3 ochko · Durang — 1 ochko · Mag‘lubiyat — 0 ochko</p><label class="detail-date-control"><span>Sana tanlang</span><input id="dailyDetailDate" type="date" value="${escapeHTML(selectedDate)}"></label><p class="detail-date-label">${escapeHTML(dateLabel(selectedDate))}</p><div class="detail-list daily-detail-list">${teams.length ? teams.map((team, index) => `
      <div class="daily-detail-row">
        <div class="daily-detail-heading"><span class="rank">${index + 1}-o‘rin</span><i class="team-dot" style="background:${teamColorFor(selectedDate, team.id)}"></i><strong>${escapeHTML(team.name)}</strong><b>${team.points} ochko</b></div>
        <div class="daily-detail-stats"><span><b>${team.games}</b><small>O‘yin</small></span><span><b>${team.wins}</b><small>G‘alaba</small></span><span><b>${team.draws}</b><small>Durang</small></span><span><b>${team.losses}</b><small>Mag‘lubiyat</small></span></div>
      </div>
    `).join('') : '<div class="empty-state">Ushbu sana uchun natijalar kiritilmagan.</div>'}</div>`;
  } else if (section === 'overall') {
    content = `<h2 class="detail-title">Mavsum reytingi</h2><p class="detail-subtitle">Barcha kunlik o‘yinlar asosida hisoblangan jamoalar · 30 tagacha</p>${lookupForm('team', 'Jamoa nomi orqali statistika qidiring', 'Masalan, Xorazm FC')}<div class="detail-list">${overallStandings().slice(0, 30).map((team, index) => detailRow(`<span class="rank">${index + 1}-o‘rin</span><strong>${escapeHTML(team.name)}</strong>`, `${team.wins} g‘alaba · ${team.draws} durang · ${team.losses} mag‘lubiyat`, `${team.points} ochko`, `${team.games} o‘yin`)).join('') || '<div class="empty-state">Umumiy natijalar o‘yinlar kiritilgach hisoblanadi.</div>'}</div>`;
  } else if (section === 'heroes') {
    const heroes = state.heroes.filter((hero) => hero.date === selectedDate);
    content = `<h2 class="detail-title">${escapeHTML(dateLabel(selectedDate))}</h2><p class="detail-subtitle">Kun davomida alohida e’tirof etilgan o‘yinchilar</p><div class="detail-list">${heroes.map((hero) => detailRow(`${avatar(hero.name, hero.image)}<span><strong>${escapeHTML(hero.name)}</strong><small>${escapeHTML(hero.team || 'Jamoa belgilanmagan')} · ${escapeHTML(hero.role)}</small></span>`, `${Number(hero.goals) || 0} gol · ${Number(hero.assists) || 0} asist`, '', '')).join('') || '<div class="empty-state">Bu sana uchun qahramonlar tanlanmagan.</div>'}</div>`;
  } else if (section === 'scorers') {
    content = `<h2 class="detail-title">Eng yaxshi to‘purarlar</h2><p class="detail-subtitle">Reyting gol — 1 ball, asist — 0,5 ball asosida. Jadvalda faqat gollar va asistlar ko‘rsatiladi · Top 100</p>${lookupForm('scorer', 'Ism-familiya orqali statistika qidiring', 'Masalan, Boynazar Boynazarov')}<div class="detail-list">${sortedScorers().slice(0, 100).map((player, index) => detailRow(`<span class="rank">${index + 1}-o‘rin</span>${avatar(player.name, player.image)}<span><strong>${escapeHTML(player.name)}</strong><small>${escapeHTML(player.team || 'Jamoa belgilanmagan')}</small></span>`, `${Number(player.goals) || 0} gol · ${Number(player.assists) || 0} asist`, '', '')).join('') || '<div class="empty-state">To‘purarlar ro‘yxati bo‘sh.</div>'}</div>`;
  } else if (section === 'fixtures') {
    const fixtures = [...state.fixtures].sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
    content = `<h2 class="detail-title">Keyingi o‘yinlar</h2><p class="detail-subtitle">Uchrashuv sanasi, vaqti, maydon nomi va keladigan to‘rt jamoa</p><div class="detail-list fixture-detail-list">${fixtures.map((fixture) => {
      const [day, month] = formatDateShort(fixture.date);
      const teams = Array.isArray(fixture.teams) ? [...fixture.teams] : [];
      while (teams.length < 4) teams.push('');
      return `<div class="fixture-detail-row"><span class="fixture-date"><b>${day}</b><span>${escapeHTML(month)}</span></span><div class="fixture-detail-copy"><strong>${escapeHTML(fixture.start)} — ${escapeHTML(fixture.end)}</strong><span class="fixture-detail-location">${escapeHTML(fixture.location)}</span><div class="fixture-detail-teams">${teams.slice(0, 4).map((team) => `<span>${escapeHTML(team.trim() || 'BO‘SH JOY')}</span>`).join('')}</div></div></div>`;
    }).join('') || '<div class="empty-state">Hozircha rejalashtirilgan o‘yin yo‘q.</div>'}</div><a class="fixture-contact" href="https://t.me/XMatch_Admin" target="_blank" rel="noreferrer"><span class="fixture-contact-icon" aria-hidden="true">➤</span><span><strong>O‘yin bo‘yicha savolingiz bormi?</strong><small>Telegram orqali admin bilan bog‘laning</small></span><b aria-hidden="true">↗</b></a>`;
  } else {
    content = `<h2 class="detail-title">Turnirlar</h2><p class="detail-subtitle">Pley-off bosqichlari va yakunlangan turnirlar</p><div class="detail-list">${state.tournaments.map((tournament) => detailRow(`<span class="cup-icon">♜</span><span><strong>${escapeHTML(tournament.name)}</strong><small>${escapeHTML(tournament.bracket || '')}</small></span>`, `${Number(tournament.teams)} jamoa · ${escapeHTML(dateLabel(tournament.date, { day: 'numeric', month: 'short', year: 'numeric' }))}`, tournament.winner ? `G‘olib: ${escapeHTML(tournament.winner)}` : escapeHTML(tournament.status), '')).join('') || '<div class="empty-state">Turnirlar hali qo‘shilmagan.</div>'}</div>`;
  }
  currentDetailSection = section;
  document.querySelector('#detailDialog .dialog-kicker').textContent = titles[section].toLocaleUpperCase('uz');
  detail.innerHTML = content;
  const dialog = document.querySelector('#detailDialog');
  if (!dialog.open) dialog.showModal();
}

const field = (label, name, value = '', type = 'text', required = false, full = false, placeholder = '') => `<label class="form-field${full ? ' full' : ''}">${escapeHTML(label)}<input name="${escapeHTML(name)}" type="${escapeHTML(type)}" value="${escapeHTML(value)}" ${placeholder ? `placeholder="${escapeHTML(placeholder)}"` : ''} ${required ? 'required' : ''}></label>`;
const selectField = (label, name, options, value = '', full = false) => `<label class="form-field${full ? ' full' : ''}">${escapeHTML(label)}<select name="${escapeHTML(name)}">${options.map((option) => `<option value="${escapeHTML(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${escapeHTML(option.label)}</option>`).join('')}</select></label>`;
const imageField = (value = '') => field('Rasm manzili (ixtiyoriy)', 'image', value, 'url', false, true);
const heroImageField = (value = '') => `<input type="hidden" name="image" value="${escapeHTML(value)}"><div class="hero-image-upload full"><div class="hero-image-preview">${avatar('Futbolchi', value, 'hero-upload-avatar')}</div><label class="form-field">Futbolchi rasmi<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp"></label><small>Galereyadan JPG, PNG yoki WEBP rasm tanlang. Rasm saytga mos hajmda saqlanadi.</small></div>`;
const scorerImageField = (value = '') => `<input type="hidden" name="image" value="${escapeHTML(value)}"><div class="hero-image-upload full"><div class="scorer-image-preview">${avatar('Futbolchi', value, 'hero-upload-avatar')}</div><label class="form-field">Futbolchi rasmi<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp"></label><small>Galereyadan JPG, PNG yoki WEBP rasm tanlang.</small></div>`;
const formStart = (heading, description, type, id = '') => `<h3>${escapeHTML(heading)}</h3><p class="admin-description">${escapeHTML(description)}</p><form class="admin-form" data-form="${escapeHTML(type)}" ${id ? `data-id="${escapeHTML(id)}"` : ''}>`;
const formEnd = (button = 'Saqlash') => `<div class="form-actions"><button type="submit" class="primary-button">${escapeHTML(button)}</button><button type="reset" class="secondary-button">Tozalash</button></div></form>`;
const recordList = (heading, records) => `<div class="admin-section"><h4>${escapeHTML(heading)}</h4><div class="admin-records">${records || '<p class="admin-description">Hali ma’lumot kiritilmagan.</p>'}</div></div>`;
const record = (id, title, subtitle, image = '') => `<div class="admin-record" data-record-id="${escapeHTML(id)}">${image ? avatar(title, image) : ''}<span class="admin-record-copy"><strong>${escapeHTML(title)}</strong><small>${escapeHTML(subtitle)}</small></span><button type="button" class="record-edit">Tahrir</button><button type="button" class="record-delete">O‘chirish</button></div>`;

function teamEditor(date) {
  const teams = state.teamDays[date] || demoTeams;
  const stats = state.dailyStats?.[date] || {};
  const colorOptions = COLORS.map((color) => ({ value: color.id, label: color.name }));
  const teamRows = COLORS.map((color, index) => {
    const name = teams[color.id] || '';
    const teamStats = stats[name] || {};
    const numberField = (label, key) => `<label class="team-stat-field">${escapeHTML(label)}<input name="${key}${index + 1}" type="number" min="0" step="1" value="${Number(teamStats[key]) || 0}" required></label>`;
    return `<div class="stats-team-editor"><div class="team-identity-fields">${field('Jamoa nomi', `teamName${index + 1}`, name, 'text', true)}${selectField('Naketka rangi', `teamColor${index + 1}`, colorOptions, color.id)}</div><div class="team-count-fields">${numberField('O‘yin', 'games')}${numberField('G‘alaba', 'wins')}${numberField('Durang', 'draws')}${numberField('Mag‘lub.', 'losses')}</div></div>`;
  }).join('');
  return `${formStart('Kunlik jamoa statistikasi', 'Har jamoa uchun o‘yin, g‘alaba, durang va mag‘lubiyat sonini kiriting. Har kunning naketka rangini alohida belgilang.', 'daily-stats')}${field('Natija sanasi', 'date', date, 'date', true, true)}<div class="daily-stats-rows full">${teamRows}</div><p class="admin-description full">Har kuni Ko‘k, Qizil, Sariq va Olov rang naketkalari ishlatiladi. Ochko avtomatik: g‘alaba 3, durang 1, mag‘lubiyat 0.</p>${formEnd('Kun natijalarini saqlash')}`;
}

function adminRecordsFor(tab) {
  if (tab === 'heroes') return recordList('Qahramonlar ro‘yxati', state.heroes.filter((hero) => hero.date === selectedDate).map((hero) => record(hero.id, hero.name, `${hero.team || 'Jamoa belgilanmagan'} · ${hero.role} · ${hero.goals} gol · ${hero.assists} asist`, hero.image)).join(''));
  if (tab === 'scorers') return recordList('Futbolchilar ro‘yxati', sortedScorers().map((player) => record(player.id, player.name, `${player.team || 'Jamoa belgilanmagan'} · ${player.goals} gol · ${player.assists} asist`, player.image)).join(''));
  if (tab === 'players') {
    const players = new Map();
    [...state.scorers, ...state.heroes].forEach((player) => {
      const key = player.name.toLocaleLowerCase('uz').trim();
      if (!players.has(key)) players.set(key, player);
    });
    const records = [...players.values()].map((player) => `<article class="player-admin-card">${avatar(player.name, player.image)}<span><strong>${escapeHTML(player.name)}</strong><small>${escapeHTML(player.team || 'Jamoa belgilanmagan')} · Telefon server ulangach ko‘rsatiladi</small></span><button class="secondary-button" type="button" data-player-preview="${escapeHTML(player.name)}">Profilni ko‘rish</button></article>`).join('');
    return recordList('O‘yinchi profillari', `<p class="admin-description">Admin profillarni parolsiz ko‘radi. Parolning o‘zi hech kimga ko‘rsatilmaydi. Hozircha bu ro‘yxat dizayn namunasi bo‘lib, haqiqiy profillar server ulangach chiqadi.</p>${records}`);
  }
  if (tab === 'fixtures') return recordList('O‘yinlar taqvimi', state.fixtures.map((fixture) => record(fixture.id, dateLabel(fixture.date), `${fixture.start}–${fixture.end} · ${fixture.location} · ${(fixture.teams || []).map((team) => team.trim() || 'BO‘SH JOY').join(', ')}`)).join(''));
  if (tab === 'tournaments') return recordList('Turnirlar ro‘yxati', state.tournaments.map((tournament) => record(tournament.id, tournament.name, `${tournament.teams} jamoa · ${tournament.status}${tournament.winner ? ` · G‘olib: ${tournament.winner}` : ''}`)).join(''));
  return '';
}

function renderAdmin(tab = currentAdminTab, editId = '') {
  currentAdminTab = tab;
  document.querySelectorAll('[data-admin-tab]').forEach((button) => button.classList.toggle('active', button.dataset.adminTab === tab));
  let form = '';
  if (tab === 'daily') {
    form = teamEditor(selectedDate);
  } else if (tab === 'heroes') {
    const hero = state.heroes.find((item) => item.id === editId);
    const roles = ['Eng yaxshi o‘yinchi', 'Eng yaxshi to‘purar', 'Eng yaxshi darvozabon'].map((role) => ({ value: role, label: role }));
    form = `${formStart(hero ? 'Qahramonni tahrirlash' : 'Kun qahramonini qo‘shish', 'O‘yinchining jamoasini ham kiriting. Jamoa nomi profil va qahramonlar ro‘yxatida ko‘rinadi.', 'hero', hero?.id || '')}${field('Sana', 'date', hero?.date || selectedDate, 'date', true)}${selectField('Nominatsiya', 'role', roles, hero?.role || roles[0].value, true)}${field('Ism-familiya', 'name', hero?.name || '', 'text', true, true)}${field('Jamoa nomi (ixtiyoriy)', 'team', hero?.team || '', 'text', false, true, 'Masalan, Xorazm FC')}${field('Gollar', 'goals', hero?.goals ?? 0, 'number')}${field('Asistlar', 'assists', hero?.assists ?? 0, 'number')}${heroImageField(hero?.image || '')}${formEnd(hero ? 'Yangilash' : 'Qahramonni qo‘shish')}`;
  } else if (tab === 'scorers') {
    const player = state.scorers.find((item) => item.id === editId);
    form = `${formStart(player ? 'Futbolchini tahrirlash' : 'To‘purar qo‘shish', 'Reyting avtomatik hisoblanadi: har bir gol 1 ball, har bir asist 0,5 ball.', 'scorer', player?.id || '')}${field('Ism-familiya', 'name', player?.name || '', 'text', true, true)}${field('Jamoa nomi', 'team', player?.team || '', 'text', false, true)}${field('Gollar soni', 'goals', player?.goals ?? '', 'number', true)}${field('Asistlar soni', 'assists', player?.assists ?? 0, 'number', true)}${scorerImageField(player?.image || '')}${formEnd(player ? 'Yangilash' : 'Futbolchini qo‘shish')}`;
  } else if (tab === 'players') {
    form = `<h3>O‘yinchi hisoblari</h3><p class="admin-description">Ro‘yxatdan o‘tgan o‘yinchilarning profillari va statistikasi shu yerda boshqariladi. Server ulangach admin parolsiz profilni ko‘ra oladi.</p>`;
  } else if (tab === 'fixtures') {
    const fixture = state.fixtures.find((item) => item.id === editId);
    const fixtureTeams = Array.isArray(fixture?.teams) ? fixture.teams : ['', '', '', ''];
    form = `${formStart(fixture ? 'O‘yinni tahrirlash' : 'Keyingi o‘yin qo‘shish', 'Sana, boshlanish va tugash vaqti hamda maydon nomini kiriting. Jamoa nomlari ixtiyoriy; bo‘sh qolganlari saytda BO‘SH JOY deb ko‘rsatiladi.', 'fixture', fixture?.id || '')}${field('Sana', 'date', fixture?.date || tomorrowString, 'date', true)}${field('Boshlanish vaqti', 'start', fixture?.start || '18:00', 'time', true)}${field('Tugash vaqti', 'end', fixture?.end || '20:00', 'time', true)}${field('Maydon nomi', 'location', fixture?.location || '', 'text', true, true)}${Array.from({ length: 4 }, (_, index) => `<label class="form-field">${index + 1}-jamoa<input name="team${index + 1}" type="text" value="${escapeHTML(fixtureTeams[index] || '')}" placeholder="BO‘SH JOY (ixtiyoriy)"></label>`).join('')}${formEnd(fixture ? 'Yangilash' : 'O‘yinni qo‘shish')}`;
  } else if (tab === 'tournaments') {
    const tournament = state.tournaments.find((item) => item.id === editId);
    const statuses = ['Rejalashtirilgan', 'Davom etmoqda', 'Yakunlangan'].map((status) => ({ value: status, label: status }));
    form = `${formStart(tournament ? 'Turnirni tahrirlash' : 'Turnir qo‘shish', 'Turnir formati, jamoalar soni va yakunlangach g‘olibni kiriting.', 'tournament', tournament?.id || '')}${field('Turnir nomi', 'name', tournament?.name || '', 'text', true, true)}${field('Jamoalar soni (8, 16 yoki 32)', 'teams', tournament?.teams || 16, 'number', true)}${field('Sana', 'date', tournament?.date || todayString, 'date', true)}${selectField('Holati', 'status', statuses, tournament?.status || 'Rejalashtirilgan')}${field('G‘olib jamoa (yakunlangach)', 'winner', tournament?.winner || '', 'text')}${field('Pley-off bosqichlari', 'bracket', tournament?.bracket || 'Chorak final → Yarim final → Final', 'text', true, true)}${formEnd(tournament ? 'Yangilash' : 'Turnirni qo‘shish')}`;
  } else {
    form = `${formStart('Aloqa va sayt', 'Ijtimoiy tarmoq manzillarini tekshiring va o‘zgartirishlarni saqlang.', 'settings')}${field('Telegram havolasi', 'telegram', state.settings.telegram, 'url', true, true)}${field('Instagram havolasi', 'instagram', state.settings.instagram, 'url', true, true)}${formEnd('Havolalarni saqlash')}<div class="detail-note">Telefon raqamlar: +998 50 090 21 15 va +998 95 333 20 26.<br>Homiyning aloqa raqami: 50-090-21-15.</div>`;
  }
  document.querySelector('#adminContent').innerHTML = `${form}${adminRecordsFor(tab)}`;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function upsert(listName, id, values) {
  const index = state[listName].findIndex((item) => item.id === id);
  if (index >= 0) state[listName][index] = { ...state[listName][index], ...values };
  else state[listName].push({ id: createId(), ...values });
}

function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `xm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function handleAdminSubmit(event) {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const data = formData(form);
  const id = form.dataset.id || '';
  if (form.dataset.form === 'daily-stats') {
    const roster = {};
    const dailyStats = {};
    const names = [];
    const colors = [];
    for (let index = 1; index <= COLORS.length; index += 1) {
      const name = data[`teamName${index}`].trim();
      const color = data[`teamColor${index}`];
      const stats = Object.fromEntries(['games', 'wins', 'draws', 'losses'].map((key) => [key, Number(data[`${key}${index}`])]));
      if (!name || !COLORS.some((item) => item.id === color)) return showToast('Jamoa nomi va naketka rangini tanlang.', true);
      if (Object.values(stats).some((value) => !Number.isInteger(value) || value < 0)) return showToast('Statistika manfiy bo‘lmagan butun son bo‘lishi kerak.', true);
      if (stats.wins + stats.draws + stats.losses !== stats.games) return showToast(`${name}: g‘alaba, durang va mag‘lubiyatlar yig‘indisi o‘yinlar soniga teng bo‘lsin.`, true);
      names.push(name.toLocaleLowerCase('uz'));
      colors.push(color);
      roster[color] = name;
      dailyStats[name] = stats;
    }
    if (new Set(names).size !== COLORS.length) return showToast('Har bir jamoa nomi alohida va takrorlanmas bo‘lishi kerak.', true);
    if (new Set(colors).size !== COLORS.length) return showToast('Ko‘k, Qizil, Sariq va Olov ranglarning har biri bittadan tanlansin.', true);
    state.teamDays[data.date] = roster;
    state.dailyStats[data.date] = dailyStats;
    selectedDate = data.date;
  } else if (form.dataset.form === 'hero') {
    try {
      const imageFile = form.querySelector('input[name="imageFile"]').files[0];
      const image = imageFile ? await imageFileToDataUrl(imageFile) : data.image.trim();
      upsert('heroes', id, { date: data.date, role: data.role, name: data.name.trim(), team: data.team.trim(), goals: Number(data.goals) || 0, assists: Number(data.assists) || 0, image });
    } catch (error) {
      console.error('Qahramon rasmini yuklashda xatolik:', error);
      showToast(error.message || 'Rasmni yuklab bo‘lmadi.', true);
      return;
    }
  } else if (form.dataset.form === 'scorer') {
    try {
      const imageFile = form.querySelector('input[name="imageFile"]').files[0];
      const image = imageFile ? await imageFileToDataUrl(imageFile) : data.image.trim();
      upsert('scorers', id, { name: data.name.trim(), team: data.team.trim(), goals: Number(data.goals), assists: Number(data.assists), image });
    } catch (error) {
      console.error('To‘purar rasmini yuklashda xatolik:', error);
      showToast(error.message || 'Rasmni yuklab bo‘lmadi.', true);
      return;
    }
  } else if (form.dataset.form === 'fixture') {
    upsert('fixtures', id, { date: data.date, start: data.start, end: data.end, location: data.location.trim(), teams: [data.team1, data.team2, data.team3, data.team4].map((team) => team.trim()) });
  } else if (form.dataset.form === 'tournament') {
    if (![8, 16, 32].includes(Number(data.teams))) return showToast('Jamoalar soni 8, 16 yoki 32 bo‘lishi kerak.', true);
    upsert('tournaments', id, { name: data.name.trim(), teams: Number(data.teams), date: data.date, status: data.status, winner: data.winner.trim(), bracket: data.bracket.trim() });
  } else if (form.dataset.form === 'settings') {
    state.settings = { telegram: data.telegram.trim(), instagram: data.instagram.trim() };
  }
  saveState();
  renderAdmin(currentAdminTab);
}

function removeRecord(button) {
  const recordElement = button.closest('[data-record-id]');
  const id = recordElement?.dataset.recordId;
  if (!id) return;
  const collection = { heroes: 'heroes', scorers: 'scorers', fixtures: 'fixtures', tournaments: 'tournaments' }[currentAdminTab];
  if (!collection) return;
  state[collection] = state[collection].filter((item) => item.id !== id);
  saveState('Ma’lumot o‘chirildi');
  renderAdmin(currentAdminTab);
}

function showToast(message, isError = false) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelector('#currentYear').textContent = today.getFullYear();
renderDashboard();
document.querySelectorAll('.dashboard-card').forEach((card) => card.addEventListener('click', () => openDetail(card.dataset.view)));
document.querySelector('#detailDialog').addEventListener('change', (event) => {
  if (event.target.id !== 'dailyDetailDate') return;
  selectedDate = event.target.value || todayString;
  openDetail('daily');
});
document.querySelector('#detailDialog').addEventListener('submit', (event) => {
  const form = event.target.closest('form[data-lookup]');
  if (!form) return;
  event.preventDefault();
  const query = new FormData(form).get('name').toLocaleLowerCase('uz').trim();
  const result = document.querySelector(`#${form.dataset.lookup}LookupResult`);
  if (form.dataset.lookup === 'scorer') {
    const scorers = sortedScorers();
    const index = scorers.findIndex((player) => player.name.toLocaleLowerCase('uz') === query);
    if (index < 0) {
      result.innerHTML = '<p class="lookup-message">Bu ismda futbolchi topilmadi. Ism-familiyani tekshirib qayta kiriting.</p>';
      return;
    }
    const player = scorers[index];
    result.innerHTML = `<div class="lookup-player">${avatar(player.name, player.image)}<span><strong>${escapeHTML(player.name)}</strong><small>${index + 1}-o‘rin · ${Number(player.goals) || 0} gol · ${Number(player.assists) || 0} asist</small></span></div>`;
    return;
  }
  const standings = overallStandings();
  const index = standings.findIndex((team) => team.name.toLocaleLowerCase('uz') === query);
  if (index < 0) {
    result.innerHTML = '<p class="lookup-message">Bu nomdagi jamoa statistikasi topilmadi. Jamoa nomini tekshirib qayta kiriting.</p>';
    return;
  }
  const team = standings[index];
  result.innerHTML = `<div class="lookup-team"><strong>${escapeHTML(team.name)}</strong><span>${index + 1}-o‘rin · ${team.games} o‘yin · ${team.wins} g‘alaba · ${team.draws} durang · ${team.losses} mag‘lubiyat · ${team.points} ochko</span></div>`;
});
document.querySelector('#openAdmin').addEventListener('click', () => {
  if (adminUnlocked) {
    renderAdmin(currentAdminTab);
    document.querySelector('#adminDialog').showModal();
  } else {
    document.querySelector('#loginForm').reset();
    const notice = document.querySelector('#loginNotice');
    notice.hidden = true;
    notice.textContent = '';
    document.querySelector('#loginDialog').showModal();
  }
});
document.querySelector('#openPlayer').addEventListener('click', () => {
  renderPlayerAccount('choice');
  document.querySelector('#playerDialog').showModal();
});
document.querySelector('#playerContent').addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-player-view]');
  if (!viewButton) return;
  renderPlayerAccount(viewButton.dataset.playerView, viewButton.dataset.playerName || 'Boynazar Boynazarov');
});
document.querySelector('#playerContent').addEventListener('submit', (event) => {
  const form = event.target.closest('[data-account-form]');
  if (!form) return;
  event.preventDefault();
  const data = formData(form);
  const notice = form.querySelector('.account-notice');
  if (form.dataset.accountForm === 'register' && data.password !== data.confirmPassword) {
    notice.textContent = 'Kiritilgan parollar bir-biriga mos emas.';
    notice.classList.add('error');
    return;
  }
  notice.textContent = 'Bu ko‘rinish namunasi. Hisob ma’lumotlari saqlanmadi; server ulangach bu amal ishlaydi.';
  notice.classList.remove('error');
});
document.querySelector('#playerContent').addEventListener('change', async (event) => {
  if (event.target.id !== 'profilePhotoFile') return;
  const file = event.target.files[0];
  if (!file) return;
  try {
    const image = await imageFileToDataUrl(file);
    const preview = document.querySelector('.profile-avatar');
    preview.innerHTML = `<img src="${escapeHTML(image)}" alt="Tanlangan profil rasmi">`;
  } catch (error) {
    console.error('Profil rasmini ko‘rsatishda xatolik:', error);
    showToast(error.message || 'Rasmni ochib bo‘lmadi.', true);
    event.target.value = '';
  }
});
document.querySelector('#playerDialog').addEventListener('click', (event) => {
  if (event.target.closest('[data-close="playerDialog"]')) document.querySelector('#playerDialog').close();
});
document.querySelector('#loginDialog').addEventListener('submit', async (event) => {
  if (event.target.id !== 'loginForm') return;
  event.preventDefault();
  const loginNotice = document.querySelector('#loginNotice');
  loginNotice.hidden = false;
  loginNotice.textContent = 'Admin paneliga kirish urinishi qayd etildi. Bildirishnoma shu brauzerda ko‘rsatiladi.';
  const adminNotice = document.querySelector('#adminAttemptNotice');
  adminNotice.hidden = false;
  adminNotice.textContent = 'Admin paneliga kirish urinishi aniqlandi.';
  try {
    const password = new FormData(event.target).get('password');
    const hash = await sha256Hex(String(password));
    if (hash !== '71a02c2847e37061517b76b6c23827767f63d3ae645742d70f82b79675e082a5') {
      loginNotice.classList.add('error');
      loginNotice.textContent = 'Admin paneliga kirish urinishi: noto‘g‘ri parol kiritildi.';
      adminNotice.classList.add('error');
      adminNotice.textContent = 'Admin paneliga muvaffaqiyatsiz kirish urinishi qayd etildi.';
      showToast('Admin paroli noto‘g‘ri.', true);
      document.querySelector('#adminPassword').select();
      return;
    }
    loginNotice.classList.remove('error');
    loginNotice.textContent = 'Admin paneliga kirish muvaffaqiyatli.';
    adminNotice.classList.remove('error');
    adminNotice.textContent = 'Admin paneliga muvaffaqiyatli kirildi.';
    document.querySelector('#adminDialog').classList.add('has-attempt-notice');
    adminUnlocked = true;
    document.querySelector('#loginDialog').close();
    renderAdmin(currentAdminTab);
    document.querySelector('#adminDialog').showModal();
  } catch (error) {
    console.error('Parolni tekshirishda xatolik:', error);
    loginNotice.classList.add('error');
    loginNotice.textContent = 'Kirish urinishini tekshirib bo‘lmadi. Sahifani qayta oching.';
    adminNotice.classList.add('error');
    adminNotice.textContent = 'Admin kirish urinishini tekshirishda xatolik yuz berdi.';
    showToast('Parolni tekshirib bo‘lmadi. Sahifani qayta oching.', true);
  }
});
document.querySelector('#adminDialog').addEventListener('close', () => { adminUnlocked = false; });
document.querySelector('#adminDialog').addEventListener('submit', handleAdminSubmit);
document.querySelector('#adminDialog').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-admin-tab]');
  if (tab) return renderAdmin(tab.dataset.adminTab);
  const playerPreview = event.target.closest('[data-player-preview]');
  if (playerPreview) {
    renderPlayerAccount('profile', playerPreview.dataset.playerPreview);
    document.querySelector('#playerDialog').showModal();
    return;
  }
  if (event.target.closest('.record-delete')) return removeRecord(event.target.closest('.record-delete'));
  const editButton = event.target.closest('.record-edit');
  if (editButton) {
    const id = editButton.closest('[data-record-id]').dataset.recordId;
    return renderAdmin(currentAdminTab, id);
  }
});
document.querySelector('#adminDialog').addEventListener('change', (event) => {
  if (event.target.matches('input[name="imageFile"]')) {
    const file = event.target.files[0];
    if (!file) return;
    const preview = document.querySelector('.hero-image-preview, .scorer-image-preview');
    if (!preview) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Rasm JPG, PNG yoki WEBP formatida bo‘lishi kerak.', true);
      event.target.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showToast('Rasm hajmi 12 MB dan oshmasligi kerak.', true);
      event.target.value = '';
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    preview.innerHTML = `<span class="avatar hero-upload-avatar"><img src="${imageUrl}" alt="Tanlangan futbolchi rasmi"></span>`;
    const image = preview.querySelector('img');
    const releaseImageUrl = () => URL.revokeObjectURL(imageUrl);
    image.addEventListener('load', releaseImageUrl, { once: true });
    image.addEventListener('error', releaseImageUrl, { once: true });
    return;
  }
  if (event.target.name !== 'date' || currentAdminTab !== 'daily') return;
  selectedDate = event.target.value || todayString;
  renderAdmin('daily');
});
document.querySelector('#exportData').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `xorazm-match-${todayString}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast('Ma’lumotlar JSON faylga yuklandi');
});
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.querySelector(`#${button.dataset.close}`).close()));
document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
}));
