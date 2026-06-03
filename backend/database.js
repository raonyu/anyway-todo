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
        password TEXT
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