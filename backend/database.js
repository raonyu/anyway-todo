const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('DB 연결 실패:', err.message);
    } else {
        console.log('SQLite 연결 성공!');
    }
});

// 1. users (사용자) 테이블 생성
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        streak_count INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        last_completion_date TEXT,
        shield_count INTEGER DEFAULT 1
    )
`);

// 2. tasks (할 일) 테이블 생성 
// (사용자의 할 일, 마감일, 미룬 횟수 등을 모두 저장하는 곳)
db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        memo TEXT,
        deadline_date TEXT,
        deadline_time TEXT,
        quadrant TEXT,
        delay_count INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0
    )
`);

module.exports = db;

// 추천 기록 테이블 생성
db.run(`
    CREATE TABLE IF NOT EXISTS daily_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        task_id INTEGER,
        recommend_date TEXT,
        is_postponed INTEGER DEFAULT 0
    )
`);

db.run(`
    ALTER TABLE daily_recommendations
    ADD COLUMN is_postponed INTEGER DEFAULT 0
`, (err) => {

    if (err) {
        console.log('is_postponed 이미 존재');
    }

});

db.run(`
    ALTER TABLE users
    ADD COLUMN shield_count INTEGER DEFAULT 1
`, (err) => {

    if (err) {
        console.log('shield_count 이미 존재');
    }

});

module.exports = db;