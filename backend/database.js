const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./todo.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("SQLite 연결 성공");

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        streak_count INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        shield_count INTEGER DEFAULT 1,
        today_success INTEGER DEFAULT 0,
        today_success_date TEXT,
        last_shield_reward_streak INTEGER DEFAULT 0,
        today_condition TEXT,
        today_condition_date TEXT,
        last_login_date TEXT,
        last_streak_check_date TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        memo TEXT,
        deadline_date TEXT,
        deadline_time TEXT,
        quadrant TEXT NOT NULL,
        difficulty TEXT DEFAULT '보통',
        delay_count INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0,
        status TEXT DEFAULT '진행 전',
        category TEXT DEFAULT '개인',
        recommended_today INTEGER DEFAULT 0,
        recommended_date TEXT,
        postponed_today INTEGER DEFAULT 0,
        postponed_date TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        title TEXT NOT NULL,

        schedule_date TEXT NOT NULL,

        start_time TEXT NOT NULL,

        end_time TEXT NOT NULL,

        schedule_type TEXT,

        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      ALTER TABLE users
      ADD COLUMN today_success INTEGER DEFAULT 0
    `, (err) => {});

    db.run(`
      ALTER TABLE users
      ADD COLUMN today_success_date TEXT
    `, (err) => {});

    db.run(`
      ALTER TABLE users
      ADD COLUMN last_shield_reward_streak INTEGER DEFAULT 0
    `, (err) => {});

    db.run(`
      ALTER TABLE users
      ADD COLUMN today_condition TEXT
    `, (err) => {});

    db.run(`
      ALTER TABLE users
      ADD COLUMN today_condition_date TEXT
    `, (err) => {});

    db.run(`
      ALTER TABLE tasks
      ADD COLUMN difficulty TEXT DEFAULT '보통'
    `, (err) => {});

    db.run(`ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT '진행 전'`, (err) => {});
    db.run(`ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT '개인'`, (err) => {});
  }
});

module.exports = db;