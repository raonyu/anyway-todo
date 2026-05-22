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

module.exports = db;