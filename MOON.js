const STORAGE_KEY  = 'dailykind_challenges';
const THEME_KEY    = 'dailykind_theme';
const STREAK_KEY   = 'dailykind_streak';
const API_KEY      = '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';

let currentChallenge = null;
let activeTab = 'active';

// ref
const dateLabel       = document.getElementById('date-label');
const challengeCard   = document.getElementById('challenge-card');
const challengeDisplay= document.getElementById('challenge-display');
const generateBtn     = document.getElementById('generate-btn');
const btnLabel        = document.getElementById('btn-label');
const saveBtn         = document.getElementById('save-btn');
const errorMsg        = document.getElementById('error-msg');
const listContainer   = document.getElementById('challenges-list');
const themeToggle     = document.getElementById('theme-toggle');
const themeThumb      = document.getElementById('theme-thumb');
const audio           = document.getElementById('ding-audio');

// storage
const getChallenges  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } };
const saveChallenges = list => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

// streak
function getStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || { count: 0, lastDate: null }; }
  catch { return { count: 0, lastDate: null }; }
}

function updateStreak() {
  const today = new Date().toDateString();
  const streak = getStreak();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (streak.lastDate === today) {
    // already updated today, just render
  } else if (streak.lastDate === yesterday) {
    streak.count += 1;
    streak.lastDate = today;
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  } else if (streak.lastDate !== today) {
    streak.count = 1;
    streak.lastDate = today;
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  }

  renderStreak(streak.count);
}

function renderStreak(count) {
  const max = 30;
  const pct = Math.min((count / max) * 100, 100);
  document.getElementById('streak-fill').style.width = pct + '%';
  document.getElementById('streak-count').textContent = count;
}

// Date
function initDate() {
  dateLabel.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });
}

// Theme
function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  themeThumb.textContent = theme === 'light' ? '☀️' : '🌙';
}

function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
}

themeToggle.addEventListener('click', () => {
  const next = document.body.classList.contains('light') ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

// Error banner 
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
  setTimeout(() => errorMsg.style.display = 'none', 4000);
}

// Fade helper
function fadeIn(el) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(6px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }));
}

// Generate
async function generateChallenge() {
  generateBtn.disabled = true;
  btnLabel.textContent = 'Generating...';
  saveBtn.classList.remove('visible');
  currentChallenge = null;

  challengeCard.querySelector('.challenge-tag')?.remove();
  challengeDisplay.className = 'challenge-text';
  challengeDisplay.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://github.com/ArkEXE/Moon',
        'X-Title': 'Moon'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-nemo',
        max_tokens: 120,
        messages: [
          {
            role: 'system',
            content: (() => {
              const past = getChallenges().map(c => `- ${c.text}`).join('\n');
              return 'Output ONLY the task text. No intro, no quotes, no conversational filler. Keep it to exactly one sentence, under 20 words. Act as a daily reminder to do something small yet productive like: "Write a short story and leave it in a park for someone to find.", "Spend 15-30 minutes to learn that language youve always wanted to learn.","Buy coffee for the person behind you in the line.", "Leave a positive note in a public place.", "Offer a book youve loved to a local library.", "Volunteer 15 minutes to help a local charity.", "Teach someone a new skill youre proficient in." Avoid clichés like "smiling at strangers","Mentor a young person for 15 minutes.","Help an elderly neighbor with their groceries." or "writing letters." DONT MAKE IT WEIRD BY MENTIONING SOMEONE YOUNGER/OLDER, MAKE SURE ITS LEGAL AND FOLLOW ETHICS. Make the suggestion slightly unconventional yet Keep the tone warm and grounded, And focus on daily self-improvements!.'
                + (past ? `\n\nDo NOT repeat any of these previously given tasks:\n${past}` : '');
            })()
          },
          {
            role: 'user',
            content: 'Give me a random social kindness challenge for today.'
          }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty response from API.');

    currentChallenge = text;

    challengeDisplay.style.transition = 'opacity 0.2s ease';
    challengeDisplay.style.opacity = '0';

    setTimeout(() => {
      challengeCard.querySelector('.challenge-tag')?.remove();

      const tag = document.createElement('div');
      tag.className = 'challenge-tag';
      tag.textContent = "Today's Task";
      tag.style.opacity = '0';
      challengeCard.insertBefore(tag, challengeCard.firstChild);

      challengeDisplay.className = 'challenge-text';
      challengeDisplay.textContent = text;
      challengeDisplay.style.transition = '';

      fadeIn(challengeDisplay);
      fadeIn(tag);
    }, 1000);

    playSound();
    setTimeout(() => saveBtn.classList.add('visible'), 1500);

  } catch (e) {
    challengeDisplay.className = 'challenge-text placeholder';
    challengeDisplay.textContent = 'Something went wrong. Try again.';
    showError(e.message);
  } finally {
    generateBtn.disabled = false;
    btnLabel.textContent = 'New Task';
  }
}

// Sound
function playSound() {
  try {
    audio.volume = 0;
    audio.currentTime = 0;
    audio.play();
    const fadeIn = setInterval(() => {
      if (audio.volume < 0.95) {
        audio.volume = Math.min(1, audio.volume + 0.05);
      } else {
        audio.volume = 1;
        clearInterval(fadeIn);
      }
    }, 50);
    setTimeout(() => fadeOutAudio(), 14500);
  } catch {}
}

function fadeOutAudio() {
  const step = audio.volume / 60;
  const fade = setInterval(() => {
    if (audio.volume > step) {
      audio.volume = Math.max(0, audio.volume - step);
    } else {
      audio.volume = 0;
      audio.pause();
      clearInterval(fade);
    }
  }, 50);
}

// Save to list
function saveChallenge() {
  if (!currentChallenge) return;

  const list = getChallenges();
  if (list.some(c => c.text === currentChallenge)) {
    showError('Already saved!');
    return;
  }

  list.unshift({
    id: Date.now(),
    text: currentChallenge,
    completed: false,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  });

  saveChallenges(list);
  saveBtn.classList.remove('visible');

  if (activeTab !== 'active') switchTab('active');
  else renderList(true); 
}

// Toggle complete 
function toggleComplete(id) {
  const list = getChallenges();
  const item = list.find(c => c.id === id);
  if (!item) return;
  item.completed = !item.completed;
  saveChallenges(list);
  if (item.completed) updateStreak();

  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';
    setTimeout(() => renderList(), 500);
  } else {
    renderList();
  }
}

// Delete
function deleteChallenge(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease, max-height 0.35s ease, margin 0.35s ease, padding 0.35s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(12px)';
    el.style.maxHeight = el.offsetHeight + 'px';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.maxHeight = '0';
      el.style.marginBottom = '0';
      el.style.paddingTop = '0';
      el.style.paddingBottom = '0';
    }));
    setTimeout(() => {
      saveChallenges(getChallenges().filter(c => c.id !== id));
      renderList();
    }, 380);
  } else {
    saveChallenges(getChallenges().filter(c => c.id !== id));
    renderList();
  }
}

// Tabs
function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-active').className = 'tab-btn' + (tab === 'active' ? ' active' : '');
  document.getElementById('tab-done').className   = 'tab-btn' + (tab === 'done'   ? ' active' : '');
  renderList(tab === 'active'); 
}

// Render list
function renderList(animateFirst = false) {
  const list  = getChallenges();
  const shown = list.filter(c => activeTab === 'active' ? !c.completed : c.completed);

  document.getElementById('list-badge').textContent = shown.length;
  document.getElementById('list-badge').className   = 'badge' + (activeTab === 'done' ? ' done' : '');
  document.getElementById('list-label').textContent = activeTab === 'active' ? 'To do' : 'Completed';

  if (shown.length === 0) {
    listContainer.innerHTML = `<div class="empty-state">${
      activeTab === 'active' ? 'No active tasks yet.' : 'Nothing completed yet — go spread some kindness!'
    }</div>`;
    return;
  }

  listContainer.innerHTML = shown.map(c => `
    <div class="challenge-item ${c.completed ? 'completed' : ''}" data-id="${c.id}">
      <button class="check-btn ${c.completed ? 'checked' : ''}" onclick="toggleComplete(${c.id})" title="Mark complete">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M1 5L4.5 8.5L11 1.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div style="flex:1;">
        <div class="item-text ${c.completed ? 'crossed' : ''}">${escHtml(c.text)}</div>
        <div class="item-date">${c.date}</div>
      </div>
      <button class="delete-btn" onclick="deleteChallenge(${c.id})" title="Remove">×</button>
    </div>
  `).join('');

  // slide in
  if (animateFirst) {
    const first = listContainer.querySelector('.challenge-item');
    if (first) fadeIn(first);
  }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Init
initDate();
initTheme();
renderStreak(getStreak().count);
renderList();
