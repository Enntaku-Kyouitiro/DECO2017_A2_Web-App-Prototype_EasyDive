import initSqlJs from 'sql.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'easydive.db');
let db;

export async function initDatabase() {
  const SQL = await initSqlJs();
  if (existsSync(DB_PATH)) db = new SQL.Database(readFileSync(DB_PATH));
  else db = new SQL.Database();
  createTables();
  seedData();
  saveDatabase();
}

function saveDatabase() {
  writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT,
      location TEXT,
      certification TEXT,
      experience_level TEXT,
      contact_link TEXT,
      contact_visibility TEXT,
      bio TEXT,
      interest_tags TEXT
    );

    CREATE TABLE IF NOT EXISTS dive_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      visibility TEXT NOT NULL,
      current TEXT NOT NULL,
      temperature TEXT NOT NULL,
      species TEXT NOT NULL,
      description TEXT NOT NULL,
      image_path TEXT,
      posted_by INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS dive_shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      address TEXT NOT NULL,
      services TEXT NOT NULL,
      nearby_sites TEXT NOT NULL,
      contact TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dive_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      state TEXT,
      site TEXT NOT NULL,
      custom_site TEXT,
      dive_date TEXT,
      site_type TEXT,
      current_strength TEXT,
      visibility TEXT,
      water_temperature TEXT,
      surge_condition TEXT,
      marine_life TEXT,
      custom_species TEXT,
      feeling_tags TEXT,
      notes TEXT,
      image_link TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      certification TEXT NOT NULL,
      experience_level TEXT NOT NULL,
      dive_count TEXT NOT NULL,
      contact_link TEXT NOT NULL,
      contact_visibility TEXT NOT NULL,
      interest_tags TEXT NOT NULL,
      location TEXT NOT NULL,
      dives_logged INTEGER NOT NULL,
      sites_visited INTEGER NOT NULL,
      species_seen INTEGER NOT NULL,
      buddy_links INTEGER NOT NULL
    );
  `);

  ensureColumn('dive_sites', 'image_path', 'TEXT');
  ensureColumn('dive_sites', 'posted_by', 'INTEGER DEFAULT 1');
  ensureColumn('dive_logs', 'user_id', 'INTEGER DEFAULT 1');
  ensureColumn('users', 'email', 'TEXT');
  ensureColumn('users', 'location', 'TEXT');
  ensureColumn('users', 'certification', 'TEXT');
  ensureColumn('users', 'experience_level', 'TEXT');
  ensureColumn('users', 'contact_link', 'TEXT');
  ensureColumn('users', 'contact_visibility', "TEXT DEFAULT 'Public'");
  ensureColumn('users', 'bio', 'TEXT');
  ensureColumn('users', 'interest_tags', 'TEXT');
}

function ensureColumn(tableName, columnName, columnDefinition) {
  const columns = all(`PRAGMA table_info(${tableName})`).map(column => column.name);
  if (!columns.includes(columnName)) db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
}

function seedData() {
  seedUsers();
  seedSites();
  seedShops();
  seedLogs();
  seedProfile();
}

function seedUsers() {
  const users = [
    ['demo', 'dive123', 'Easy Diver', 'easy.diver@example.com', 'Sydney, NSW', 'Open Water', 'Beginner', 'discord.gg/easydive-demo', 'Public', 'Beginner diver who likes shore dives, turtles and relaxed practice sessions.', 'Looking for buddy, Turtle interest'],
    ['reef_mia', 'demo', 'Mia Chen', 'mia.reef@example.com', 'Cairns, QLD', 'Advanced Open Water', 'Intermediate', '@miareef', 'Public', 'Reef diver interested in visibility reports, coral sites and underwater photos.', 'Underwater photography, Marine conservation'],
    ['coldwater_tom', 'demo', 'Tom Walker', 'tom.coldwater@example.com', 'Hobart, TAS', 'Rescue Diver', 'Advanced', 'tomwalker.example/contact', 'Public', 'Cold water diver who records surge, entry conditions and local safety notes.', 'Wreck diving, Looking for buddy'],
    ['macro_aya', 'demo', 'Aya Tanaka', 'aya.macro@example.com', 'Adelaide, SA', 'Advanced Open Water', 'Intermediate', '@ayamacro', 'Public', 'Macro-life fan focused on jetties, seadragons and nudibranch sightings.', 'Underwater photography, Marine conservation']
  ];
  for (const user of users) {
    if (!get('SELECT id FROM users WHERE username = ?', [user[0]])) {
      run(`INSERT INTO users (username, password, display_name, email, location, certification, experience_level, contact_link, contact_visibility, bio, interest_tags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, user);
    }
  }
}

function seedSites() {
  const sites = [
    ['Shelly Beach', 'NSW', 'Shore dive', 'Beginner friendly', '5–12 m', 'Light', '16–22°C', 'Blue groper, Wobbegong, Nudibranch', 'A popular Sydney shore dive with easy access and beginner-friendly conditions on calm days.', '/assets/images/site-3.jpg', 1],
    ['Bare Island', 'NSW', 'Reef', 'Intermediate', '5–15 m', 'Light to moderate', '16–22°C', 'Port Jackson shark, Nudibranch, Octopus', 'Known for macro life and varied rocky reef terrain. Entry conditions can change with swell.', '/assets/images/site-2.jpg', 3],
    ['Fish Rock Cave', 'NSW', 'Cave', 'Advanced', '10–25 m', 'Moderate', '18–24°C', 'Grey nurse shark, Turtle, Schooling fish', 'A famous cave and shark dive near South West Rocks, usually requiring guided boat diving.', '/assets/images/site-1.jpg', 2],
    ['SS Yongala Wreck', 'QLD', 'Wreck', 'Advanced', '10–30 m', 'Moderate to strong', '22–28°C', 'Turtle, Ray, Sea snake, Giant trevally', "One of Australia's iconic wreck dives with rich marine life and open-water conditions.", '/assets/images/site-4.jpg', 2],
    ['Ningaloo Reef', 'WA', 'Reef', 'Beginner friendly', '10–30 m', 'Light to moderate', '19–28°C', 'Whale shark, Manta ray, Turtle', 'A major reef destination famous for large marine animals and clear-water reef experiences.', '/assets/images/site-8.jpg', 1],
    ['Edithburgh Jetty', 'SA', 'Jetty', 'Intermediate', '4–12 m', 'Light', '14–20°C', 'Leafy seadragon, Giant cuttlefish, Nudibranch', 'A well-known temperate macro site with jetties, seadragons and night dive potential.', '/assets/images/site-7.jpg', 4],
    ['Great Barrier Reef', 'QLD', 'Reef', 'Beginner friendly', '10–25 m', 'Light to moderate', '23–29°C', 'Coral, Turtle, Reef shark, Clownfish', 'A world-famous reef area with many sites suitable for different certification levels.', '/assets/images/site-5.jpg', 2],
    ['Rapid Bay Jetty', 'SA', 'Jetty / pier', 'Intermediate', '5–15 m', 'Light', '14–21°C', 'Leafy seadragon, Squid, Old wives', 'A scenic jetty site with fish schools and macro life, often better with calm weather.', '/assets/images/site-9.jpg', 4],
    ['Portsea Pier', 'VIC', 'Jetty / pier', 'Beginner friendly', '3–10 m', 'Light', '12–20°C', 'Seahorse, Pufferfish, Nudibranch', 'A calm-condition training and macro photography site in Victoria.', '/assets/images/site-6.jpg', 3],
    ['Busselton Jetty', 'WA', 'Jetty / pier', 'Beginner friendly', '5–15 m', 'Light', '16–23°C', 'Coral, Schooling fish, Crab', 'An easy-access jetty environment with colourful marine growth and simple navigation.', '/assets/images/site-10.jpg', 1]
  ];
  for (const site of sites) {
    const existing = get('SELECT id FROM dive_sites WHERE name = ?', [site[0]]);
    if (existing) {
      run(`UPDATE dive_sites SET state=?, type=?, difficulty=?, visibility=?, current=?, temperature=?, species=?, description=?, image_path=?, posted_by=? WHERE name=?`,
        [site[1], site[2], site[3], site[4], site[5], site[6], site[7], site[8], site[9], site[10], site[0]]);
    } else {
      run(`INSERT INTO dive_sites (name, state, type, difficulty, visibility, current, temperature, species, description, image_path, posted_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, site);
    }
  }
}

function seedShops() {
  const shops = [
    ['Sydney Coastal Dive Centre', 'NSW', 'Sydney, NSW', 'Guided shore dives, Open Water course, Gear rental', 'Shelly Beach, Bare Island, Kurnell', 'hello@sydneycoastaldive.example'],
    ['South Coast Dive Hub', 'NSW', 'Jervis Bay, NSW', 'Boat dives, Tank fills, Advanced course', 'Jervis Bay, Bowen Island', 'bookings@southcoastdive.example'],
    ['Reef Day Dive', 'QLD', 'Cairns, QLD', 'Reef tours, Intro dives, Snorkel trips', 'Great Barrier Reef', 'info@reefdaydive.example'],
    ['Yongala Wreck Operators', 'QLD', 'Ayr, QLD', 'Wreck diving, Boat dives, Guided dives', 'SS Yongala Wreck', 'dive@yongalawreck.example'],
    ['Ningaloo Blue Dive', 'WA', 'Exmouth, WA', 'Whale shark tours, Manta trips, Gear rental', 'Ningaloo Reef, Coral Bay', 'contact@ningalooblue.example'],
    ['Bay Temperate Diving', 'VIC', 'Mornington Peninsula, VIC', 'Shore dives, Dry suit advice, Local guiding', 'Port Phillip Bay', 'team@baytemperate.example'],
    ['Jetty Macro Dive Shop', 'SA', 'Edithburgh, SA', 'Night dives, Macro tours, Tank fills', 'Edithburgh Jetty, Port Noarlunga', 'macro@jettydive.example'],
    ['Tas Cold Water Diving', 'TAS', 'Hobart, TAS', 'Cold water guiding, Boat dives, Equipment advice', 'Bruny Island, Eaglehawk Neck', 'hello@tascoldwater.example']
  ];
  for (const shop of shops) {
    const existing = get('SELECT id FROM dive_shops WHERE name = ?', [shop[0]]);
    if (existing) run(`UPDATE dive_shops SET region=?, address=?, services=?, nearby_sites=?, contact=? WHERE name=?`, [shop[1], shop[2], shop[3], shop[4], shop[5], shop[0]]);
    else run(`INSERT INTO dive_shops (name, region, address, services, nearby_sites, contact) VALUES (?, ?, ?, ?, ?, ?)`, shop);
  }
}

function seedLogs() {
  const logs = [
    [1, 'NSW', 'Shelly Beach', '', '2026-05-10', 'Shore dive', 'Light', 'Good: 10–20 m', 'Mild: 19–22°C', 'Calm', 'Blue groper, Nudibranch', '', 'Relaxing, Beginner friendly', 'Easy entry point and calm conditions. Good for a relaxed practice dive.', '/assets/images/site-3.jpg', '2026-05-10'],
    [2, 'WA', 'Ningaloo Reef', '', '2026-05-12', 'Reef', 'Light to moderate', 'Very good: 20–30 m', 'Warm: 23–25°C', 'Slight surge', 'Manta ray, Turtle', '', 'Exciting, Would return', 'Clear water and memorable marine life. The site felt better with local guidance.', '/assets/images/site-8.jpg', '2026-05-12'],
    [4, 'SA', 'Edithburgh Jetty', '', '2026-05-13', 'Jetty / pier', 'Very light', 'Fair: 5–10 m', 'Cool: 16–18°C', 'Calm', 'Leafy seadragon, Nudibranch', '', 'Good for photos, Guide recommended', 'Best for slow macro observation. Bring a torch and move carefully near the jetty structure.', '/assets/images/site-7.jpg', '2026-05-13']
  ];
  if (get('SELECT COUNT(*) AS count FROM dive_logs').count === 0) {
    for (const log of logs) {
      run(`INSERT INTO dive_logs (user_id, state, site, custom_site, dive_date, site_type, current_strength, visibility, water_temperature, surge_condition, marine_life, custom_species, feeling_tags, notes, image_link, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, log);
    }
  }
}

function seedProfile() {
  if (get('SELECT COUNT(*) AS count FROM profile').count === 0) {
    run(`INSERT INTO profile (id, username, certification, experience_level, dive_count, contact_link, contact_visibility, interest_tags, location, dives_logged, sites_visited, species_seen, buddy_links)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 'Easy Diver', 'Open Water', 'Beginner', '11–30', 'discord.gg/easydive-demo', 'Public', 'Looking for buddy, Turtle interest', 'Sydney, NSW', 18, 10, 16, 3]);
  }
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function get(sql, params = []) {
  return all(sql, params)[0];
}

export function run(sql, params = []) {
  db.run(sql, params);
  const result = get('SELECT last_insert_rowid() AS id');
  saveDatabase();
  return result;
}
