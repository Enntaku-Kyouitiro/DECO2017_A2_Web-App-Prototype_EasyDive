import mojo from '@mojojs/core';
import { initDatabase, all, get, run } from './db.js';

const app = mojo();

app.get('/', async ctx => ctx.sendFile(ctx.home.child('frontend', 'index.html')));
app.get('/css/#file', async ctx => ctx.sendFile(ctx.home.child('frontend', 'css', ctx.stash.file)));
app.get('/js/#file', async ctx => ctx.sendFile(ctx.home.child('frontend', 'js', ctx.stash.file)));
app.get('/assets/images/#file', async ctx => ctx.sendFile(ctx.home.child('frontend', 'assets', 'images', ctx.stash.file)));

const ok = value => ({ json: value });
const todayString = () => new Date().toISOString().slice(0, 10);

const OPTIONS = {
  states: [
    { label: 'New South Wales', code: 'NSW' }, { label: 'Queensland', code: 'QLD' }, { label: 'Western Australia', code: 'WA' },
    { label: 'Victoria', code: 'VIC' }, { label: 'South Australia', code: 'SA' }, { label: 'Tasmania', code: 'TAS' }, { label: 'Northern Territory', code: 'NT' }
  ],
  exploreStates: ['All States', 'NSW', 'QLD', 'WA', 'VIC', 'SA', 'TAS'],
  shopRegions: ['All', 'NSW', 'QLD', 'WA', 'VIC', 'SA', 'TAS'],
  logSiteTypes: ['Reef', 'Rocky reef', 'Wreck', 'Cave / cavern', 'Jetty / pier', 'Shore dive', 'Boat dive', 'Drift dive', 'Macro site'],
  exploreSiteTypes: ['All Site Types', 'Reef', 'Wreck', 'Cave', 'Shore', 'Jetty'],
  difficultyLevels: ['All Levels', 'Beginner friendly', 'Intermediate', 'Advanced', 'Guided only'],
  currentStrength: ['No noticeable current', 'Very light', 'Light', 'Moderate', 'Strong', 'Very strong / not recommended', 'Unknown'],
  visibility: ['Very poor: 0–2 m', 'Poor: 2–5 m', 'Fair: 5–10 m', 'Good: 10–20 m', 'Very good: 20–30 m', 'Excellent: 30 m+', 'Unknown'],
  waterTemperature: ['Cold: ≤15°C', 'Cool: 16–18°C', 'Mild: 19–22°C', 'Warm: 23–25°C', 'Tropical: 26–28°C', 'Very warm: 29°C+', 'Unknown'],
  surgeCondition: ['Calm', 'Slight surge', 'Moderate surge', 'Strong surge', 'Entry not recommended', 'Unknown'],
  commonSpecies: ['Turtle', 'Manta ray', 'Whale shark', 'Humpback whale', 'Dolphin', 'Reef shark', 'Grey nurse shark', 'Wobbegong', 'Port Jackson shark', 'Clownfish', 'Maori wrasse', 'Potato cod', 'Parrotfish', 'Barracuda', 'Blue groper', 'Weedy seadragon', 'Leafy seadragon', 'Giant cuttlefish', 'Nudibranch', 'Lobster', 'Coral', 'Giant clam'],
  feelingTags: ['Relaxing', 'Exciting', 'A little nervous', 'Good for photos', 'Beginner friendly', 'Would return', 'Guide recommended'],
  certification: ['None / Learning', 'Open Water', 'Advanced Open Water', 'Rescue Diver', 'Divemaster', 'Instructor'],
  experienceLevel: ['Beginner', 'Intermediate', 'Advanced', 'Professional'],
  diveCount: ['0–10', '11–30', '31–50', '51–100', '100+'],
  contactVisibility: ['Public', 'Friends only', 'Private'],
  interestTags: ['Underwater photography', 'Looking for buddy', 'Wreck diving', 'Turtle interest', 'Shark interest', 'Marine conservation']
};

const publicUserFields = `id, username, display_name, email, location, certification, experience_level, contact_link, contact_visibility, bio, interest_tags`;

app.post('/api/login', async ctx => {
  const body = await ctx.req.json();
  const user = get(`SELECT id, username, display_name FROM users WHERE username = ? AND password = ?`, [(body.username || '').trim(), body.password || '']);
  if (!user) {
    ctx.res.status = 401;
    await ctx.render(ok({ error: 'Invalid username or password.' }));
    return;
  }
  await ctx.render(ok({ success: true, user }));
});

app.post('/api/logout', async ctx => ctx.render(ok({ success: true })));
app.get('/api/options', async ctx => ctx.render(ok(OPTIONS)));
app.get('/api/users', async ctx => ctx.render(ok(all(`SELECT ${publicUserFields} FROM users ORDER BY display_name`))));
app.get('/api/users/#id', async ctx => {
  const user = get(`SELECT ${publicUserFields} FROM users WHERE id = ?`, [ctx.stash.id]);
  if (!user) {
    ctx.res.status = 404;
    await ctx.render(ok({ error: 'User not found.' }));
    return;
  }
  await ctx.render(ok(user));
});
app.get('/api/sites', async ctx => {
  const sites = all(`SELECT dive_sites.*, users.display_name AS author_name, users.email AS author_email
                     FROM dive_sites LEFT JOIN users ON users.id = dive_sites.posted_by
                     ORDER BY dive_sites.state, dive_sites.name`);
  await ctx.render(ok(sites));
});
app.get('/api/shops', async ctx => ctx.render(ok(all('SELECT * FROM dive_shops ORDER BY region, name'))));
app.get('/api/logs', async ctx => {
  const logs = all(`SELECT dive_logs.*, users.display_name AS author_name, users.email AS author_email
                    FROM dive_logs LEFT JOIN users ON users.id = dive_logs.user_id
                    ORDER BY dive_logs.id DESC`);
  await ctx.render(ok(logs));
});
app.post('/api/logs', async ctx => {
  const body = await ctx.req.json();
  const siteName = (body.site || body.customSite || '').trim();
  if (!siteName) {
    ctx.res.status = 400;
    await ctx.render(ok({ error: 'Dive site is required.' }));
    return;
  }
  const result = run(`INSERT INTO dive_logs (user_id, state, site, custom_site, dive_date, site_type, current_strength, visibility, water_temperature, surge_condition, marine_life, custom_species, feeling_tags, notes, image_link, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.userId || 1, body.state || '', siteName, body.customSite || '', body.diveDate || todayString(), body.siteType || '', body.currentStrength || '', body.visibility || '', body.waterTemperature || '', body.surgeCondition || '', Array.isArray(body.marineLife) ? body.marineLife.join(', ') : '', body.customSpecies || '', Array.isArray(body.feelingTags) ? body.feelingTags.join(', ') : '', body.notes || '', body.imageLink || '', todayString()]);
  await ctx.render(ok({ success: true, id: result.id }));
});
app.get('/api/profile', async ctx => ctx.render(ok(get('SELECT * FROM profile WHERE id = 1'))));
app.put('/api/profile', async ctx => {
  const body = await ctx.req.json();
  const interestTags = Array.isArray(body.interestTags) ? body.interestTags.join(', ') : '';
  run(`UPDATE profile SET username=?, certification=?, experience_level=?, dive_count=?, contact_link=?, contact_visibility=?, interest_tags=?, location=? WHERE id = 1`,
    [body.username || 'Easy Diver', body.certification || 'Open Water', body.experienceLevel || 'Beginner', body.diveCount || '11–30', body.contactLink || '', body.contactVisibility || 'Public', interestTags, body.location || 'Sydney, NSW']);
  run(`UPDATE users SET display_name=?, location=?, certification=?, experience_level=?, contact_link=?, contact_visibility=?, interest_tags=? WHERE id = 1`,
    [body.username || 'Easy Diver', body.location || 'Sydney, NSW', body.certification || 'Open Water', body.experienceLevel || 'Beginner', body.contactLink || '', body.contactVisibility || 'Public', interestTags]);
  await ctx.render(ok({ success: true }));
});

await initDatabase();
app.start();
