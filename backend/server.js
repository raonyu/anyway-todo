const express = require('express');
const cors = require('cors');
const db = require('./database'); 

const app = express();

app.use(cors());
app.use(express.json());

// 기본 테스트
app.get('/', (req, res) => {
    res.send('서버 실행 성공!');
});

// 회원가입 API
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
    db.run(sql, [username, password], function(err) {
        if (err) return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
        res.json({ message: '회원가입 성공!' });
    });
});

// 로그인 API
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
    db.get(sql, [username, password], (err, row) => {
        if (row) res.json({ message: '로그인 성공!' });
        else res.status(401).json({ message: '아이디 또는 비밀번호가 틀렸습니다.' });
    });
});

// 1. 할 일 불러오기 (GET)
app.get('/tasks', (req, res) => {
    const user_id = req.query.user_id || 1; // 임시로 user_id 1번 고정
    const sql = `SELECT * FROM tasks WHERE user_id = ?`;
    
    db.all(sql, [user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. 할 일 추가하기 (POST)
app.post('/tasks', (req, res) => {
    const { user_id, title, memo, deadline_date, deadline_time, quadrant } = req.body;
    const sql = `INSERT INTO tasks (user_id, title, memo, deadline_date, deadline_time, quadrant) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [user_id || 1, title, memo, deadline_date, deadline_time, quadrant], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '추가 성공', id: this.lastID });
    });
});

// 3. 할 일 수정/완료/미루기 (PUT)
app.put('/tasks/:id', (req, res) => {
    const { title, memo, deadline_date, deadline_time, quadrant, delay_count, is_completed } = req.body;
    const sql = `
        UPDATE tasks 
        SET title = ?, memo = ?, deadline_date = ?, deadline_time = ?, quadrant = ?, delay_count = ?, is_completed = ?
        WHERE id = ?
    `;
    
    const completedInt = is_completed ? 1 : 0; // DB 저장을 위해 변환

    db.run(sql, [title, memo, deadline_date, deadline_time, quadrant, delay_count, completedInt, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '수정 성공' });
    });
});

// 4. 할 일 삭제 (DELETE)
app.delete('/tasks/:id', (req, res) => {
    const sql = `DELETE FROM tasks WHERE id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '삭제 성공' });
    });
});

app.listen(3000, () => {
    console.log('서버 실행 중! (http://localhost:3000)');
});