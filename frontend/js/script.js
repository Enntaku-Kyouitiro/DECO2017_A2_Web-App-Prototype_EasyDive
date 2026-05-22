/* ---------- Global state ---------- */

let sites = [];
let shops = [];
let logs = [];
let users = [];
let options = {};
let profile = {};
let currentUser = null;
let appLoaded = false;

/* ---------- DOM helpers ---------- */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ---------- API helper ---------- */

async function api(path, requestOptions = {}) {
  const res = await fetch(path, requestOptions);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

/* ---------- Login state helpers ---------- */

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('easyDiveUser'));
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem('easyDiveUser', JSON.stringify(user));
}

function clearSavedUser() {
  localStorage.removeItem('easyDiveUser');
}

/* ---------- Login and logout flow ---------- */

async function showApp() {
  $('#loginPage').classList.add('hidden');
  $('#appShell').classList.remove('hidden');

  $('#currentUserLabel').textContent =
    currentUser?.display_name ||
    currentUser?.username ||
    'User';

  if (!appLoaded) {
    await loadData();
    appLoaded = true;
  }
}

function showLogin() {
  $('#loginPage').classList.remove('hidden');
  $('#appShell').classList.add('hidden');
  $('#loginMessage').textContent = '';
}

async function checkLoginState() {
  currentUser = getSavedUser();

  currentUser
    ? await showApp()
    : showLogin();
}

async function login(e) {
  e.preventDefault();

  try {
    const result = await api('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: $('#loginUsername').value,
        password: $('#loginPassword').value
      })
    });

    currentUser = result.user;
    saveUser(currentUser);

    await showApp();
  } catch (err) {
    $('#loginMessage').textContent = err.message;
  }
}

async function logout() {
  try {
    await api('/api/logout', {
      method: 'POST'
    });
  } catch {
  }

  currentUser = null;
  clearSavedUser();
  appLoaded = false;

  showPage('home');
  showLogin();
}

/* ---------- Initial data loading ---------- */

async function loadData() {
  options = await api('/api/options');
  sites = await api('/api/sites');
  shops = await api('/api/shops');
  logs = await api('/api/logs');
  users = await api('/api/users');
  profile = await api('/api/profile');

  renderOptions();
  renderHomeStats();
  renderSites();
  renderLogs();
  renderShops();
  renderProfile();
  updateLivePreview();
}

/* ---------- Page navigation ---------- */

function showPage(page) {
  $$('.page').forEach(p => {
    p.classList.remove('active');
  });

  $(`#page-${page}`).classList.add('active');

  $$('.nav-button').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
}

/* ---------- Form option rendering helpers ---------- */

function fillSelect(selector, items = [], placeholder = '') {
  $(selector).innerHTML =
    (
      placeholder
        ? `<option value="">${escapeHtml(placeholder)}</option>`
        : ''
    ) +
    items
      .map(i => {
        return `
          <option value="${escapeHtml(i)}">
            ${escapeHtml(i)}
          </option>
        `;
      })
      .join('');
}

function fillStateSelect(selector, empty = false) {
  $(selector).innerHTML =
    (
      empty
        ? '<option value="">-- Select --</option>'
        : ''
    ) +
    (options.states || [])
      .map(s => {
        return `
          <option value="${escapeHtml(s.code)}">
            ${escapeHtml(s.label)}
          </option>
        `;
      })
      .join('');
}

function checkboxGrid(id, items = [], name) {
  $(`#${id}`).innerHTML = items
    .map(i => {
      return `
        <label>
          <input
            type="checkbox"
            value="${escapeHtml(i)}"
            name="${name}"
          >
          ${escapeHtml(i)}
        </label>
      `;
    })
    .join('');
}

/* ---------- Render form options ---------- */

function renderOptions() {
  fillStateSelect('#logState', true);

  fillSelect('#logSiteType', options.logSiteTypes, '-- Select --');
  fillSelect('#logCurrent', options.currentStrength, '-- Select --');
  fillSelect('#logVisibility', options.visibility, '-- Select --');
  fillSelect('#logTemp', options.waterTemperature, '-- Select --');
  fillSelect('#logSurge', options.surgeCondition, '-- Select --');

  fillSelect('#exploreState', options.exploreStates);
  fillSelect('#exploreType', options.exploreSiteTypes);
  fillSelect('#exploreDifficulty', options.difficultyLevels);

  fillSelect('#profCert', options.certification);
  fillSelect('#profExp', options.experienceLevel);
  fillSelect('#profDiveCount', options.diveCount);
  fillSelect('#profVisibility', options.contactVisibility);

  checkboxGrid('marineLifeGrid', options.commonSpecies, 'marine');
  checkboxGrid('feelingTagsGrid', options.feelingTags, 'feeling');
  checkboxGrid('interestTagsGrid', options.interestTags, 'interest');

  renderRegionButtons();
  updateDiveSiteOptions();
}

/* ---------- Dive shop region buttons ---------- */

function renderRegionButtons() {
  $('#regionBtns').innerHTML = options.shopRegions
    .map((r, i) => {
      return `
        <button
          class="region-btn ${i === 0 ? 'active' : ''}"
          data-region="${escapeHtml(r)}"
          type="button"
        >
          ${escapeHtml(r)}
        </button>
      `;
    })
    .join('');

  $$('.region-btn').forEach(b => {
    b.addEventListener('click', () => {
      $$('.region-btn').forEach(x => {
        x.classList.remove('active');
      });

      b.classList.add('active');
      renderShops();
    });
  });
}

/* ---------- Dive site select logic ---------- */

function updateDiveSiteOptions() {
  const state = $('#logState').value;

  if (!state) {
    $('#logSite').innerHTML =
      '<option value="">-- Select a state first --</option>';

    $('#customSiteGroup').classList.add('hidden');
    return;
  }

  const stateSites = sites.filter(s => s.state === state);

  $('#logSite').innerHTML =
    '<option value="">-- Select --</option>' +
    stateSites
      .map(s => {
        return `
          <option value="${escapeHtml(s.name)}">
            ${escapeHtml(s.name)}
          </option>
        `;
      })
      .join('') +
    '<option value="Custom site">Custom site</option>';

  toggleCustomSite();
}

function toggleCustomSite() {
  $('#customSiteGroup').classList.toggle(
    'hidden',
    $('#logSite').value !== 'Custom site'
  );
}

/* ---------- Checkbox helpers ---------- */

function getChecked(name) {
  return $$(`input[name="${name}"]:checked`).map(i => i.value);
}

function setChecked(name, text = '') {
  const vals = text
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

  $$(`input[name="${name}"]`).forEach(i => {
    i.checked = vals.includes(i.value);
  });
}

/* ---------- Home statistics ---------- */

function renderHomeStats() {
  $('#statLogs').textContent = logs.length;
  $('#statSites').textContent = sites.length;
  $('#statShops').textContent = shops.length;
}

/* ---------- Explore filters ---------- */

function filters() {
  return {
    keyword: $('#exploreKeyword').value.trim().toLowerCase(),
    state: $('#exploreState').value,
    type: $('#exploreType').value,
    difficulty: $('#exploreDifficulty').value
  };
}

/* ---------- Render dive site cards ---------- */

function renderSites() {
  const f = filters();

  const list = sites.filter(s => {
    const text = [
      s.name,
      s.state,
      s.type,
      s.difficulty,
      s.description,
      s.species,
      s.author_name
    ]
      .join(' ')
      .toLowerCase();

    return (
      (!f.keyword || text.includes(f.keyword)) &&
      (
        f.state === 'All States' ||
        !f.state ||
        s.state === f.state
      ) &&
      (
        f.type === 'All Site Types' ||
        !f.type ||
        s.type.toLowerCase().includes(f.type.toLowerCase())
      ) &&
      (
        f.difficulty === 'All Levels' ||
        !f.difficulty ||
        s.difficulty === f.difficulty
      )
    );
  });

  $('#siteCards').innerHTML =
    list
      .map(site => {
        return `
          <article class="site-card">
            <div class="site-thumb">
              <img
                src="${escapeHtml(site.image_path || '/assets/images/hero-diver.jpg')}"
                alt="${escapeHtml(site.name)}"
              >
            </div>

            <div class="site-card-content">
              <h3>${escapeHtml(site.name)}</h3>

              <p class="meta">
                ${escapeHtml(site.state)}
                · ${escapeHtml(site.type)}
                · ${escapeHtml(site.difficulty)}
              </p>

              <p>${escapeHtml(site.description)}</p>

              <div class="card-detail">
                <div>
                  <strong>Visibility:</strong>
                  ${escapeHtml(site.visibility)}
                </div>

                <div>
                  <strong>Current:</strong>
                  ${escapeHtml(site.current)}
                </div>

                <div>
                  <strong>Temperature:</strong>
                  ${escapeHtml(site.temperature)}
                </div>
              </div>

              <div class="badge-list">
                ${badges(site.species)}
              </div>

              ${authorButton(site.posted_by, site.author_name, 'Posted by')}
            </div>
          </article>
        `;
      })
      .join('') ||
    '<p class="muted">No dive sites match your search.</p>';
}

/* ---------- Render dive log cards ---------- */

function renderLogs() {
  const f = filters();

  const list = logs.filter(l => {
    const text = [
      l.site,
      l.state,
      l.site_type,
      l.marine_life,
      l.custom_species,
      l.feeling_tags,
      l.notes,
      l.author_name
    ]
      .join(' ')
      .toLowerCase();

    return (
      (!f.keyword || text.includes(f.keyword)) &&
      (
        f.state === 'All States' ||
        !f.state ||
        l.state === f.state
      ) &&
      (
        f.type === 'All Site Types' ||
        !f.type ||
        (l.site_type || '').toLowerCase().includes(f.type.toLowerCase())
      )
    );
  });

  $('#logCards').innerHTML =
    list.map(logCard).join('') ||
    '<p class="muted">No matching dive logs.</p>';
}

/* ---------- Render dive shop cards ---------- */

function renderShops() {
  const region = $('.region-btn.active')?.dataset.region || 'All';

  const list = region === 'All'
    ? shops
    : shops.filter(s => s.region === region);

  $('#shopCards').innerHTML =
    list
      .map(shop => {
        return `
          <article class="shop-card">
            <div class="shop-thumb">
              <img
                src="assets/images/hero-diver.jpg"
                alt="${escapeHtml(shop.name)}"
              >
            </div>

            <div class="shop-content">
              <h3>${escapeHtml(shop.name)}</h3>
              <p class="meta">${escapeHtml(shop.region)}</p>

              <p>
                <strong>Address:</strong>
                ${escapeHtml(shop.address)}
              </p>

              <p>
                <strong>Services:</strong>
                ${escapeHtml(shop.services)}
              </p>

              <p>
                <strong>Nearby Sites:</strong>
                ${escapeHtml(shop.nearby_sites)}
              </p>

              <p>
                <strong>Contact:</strong>
                ${escapeHtml(shop.contact)}
              </p>
            </div>
          </article>
        `;
      })
      .join('') ||
    '<p class="muted">No shops found for this region.</p>';
}