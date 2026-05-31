const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {

    if (err) {
        console.error('DB 연결 실패:', err.message);
    } else {
        console.log('SQLite 연결 성공!');
    }

});


// users 테이블 생성
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )
`);

// tasks 테이블 생성
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

