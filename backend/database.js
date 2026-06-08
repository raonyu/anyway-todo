const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./todo.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("SQLite 연결 성공");

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
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        memo TEXT,
        deadline_date TEXT,
        deadline_time TEXT,
        quadrant TEXT NOT NULL,
        
        -- 💡 기존 미루기 컬럼 대신 '작업 상태' 추가
        status TEXT DEFAULT '진행 전', 
        
        -- 💡 추천 기능 관련 컬럼
        recommended_today INTEGER DEFAULT 0, -- 1이면 오늘 추천됨
        recommended_date TEXT,               -- 추천된 날짜
        
        -- 기존 지표는 유지
        delay_count INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0
    )
`);

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

        last_login_date TEXT,
        last_streak_check_date TEXT
      )
    `);
  }
});

module.exports = db;