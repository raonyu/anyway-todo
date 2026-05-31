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

    const sql =
        `INSERT INTO users (username, password)
         VALUES (?, ?)`;

    db.run(sql, [username, password], function(err) {

        if (err) {

            return res.status(400).json({
                message: '이미 존재하는 아이디입니다.'
            });

        }

        res.json({
            message: '회원가입 성공!'
        });

    });

});


// 로그인 API
app.post('/login', (req, res) => {

    const { username, password } = req.body;

    const sql =
        `SELECT * FROM users
         WHERE username = ?
         AND password = ?`;

    db.get(sql, [username, password], (err, row) => {

        if (row) {

            res.json({
                message: '로그인 성공!'
            });

        } else {

            res.status(401).json({
                message: '아이디 또는 비밀번호가 틀렸습니다.'
            });

        }

    });

});


app.listen(3000, () => {
    console.log('서버 실행 중!');
});

// 할 일 목록 조회 API
app.get('/tasks', (req, res) => {

    const user_id = req.query.user_id;

    const sql =
        `SELECT * FROM tasks
         WHERE user_id = ?`;

    db.all(sql, [user_id], (err, rows) => {

        if (err) {

            return res.status(500).json({
                message: '할 일 조회 실패'
            });

        }

        res.json(rows);

    });

});

// 할 일 추가 API
app.post('/tasks', (req, res) => {

    const {
        user_id,
        title,
        memo,
        deadline_date,
        deadline_time,
        quadrant
    } = req.body;

    const sql = `
        INSERT INTO tasks (
            user_id,
            title,
            memo,
            deadline_date,
            deadline_time,
            quadrant,
            delay_count,
            is_completed
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `;

    db.run(
        sql,
        [
            user_id,
            title,
            memo,
            deadline_date,
            deadline_time,
            quadrant
        ],
        function(err) {

            if (err) {

                return res.status(500).json({
                    message: '할 일 추가 실패'
                });

            }

            res.json({
                message: '할 일 추가 성공',
                task_id: this.lastID
            });

        }
    );

});

// 할 일 수정 API
app.put('/tasks/:id', (req, res) => {

    const { id } = req.params;

    const {
        title,
        memo,
        deadline_date,
        deadline_time,
        quadrant,
        delay_count,
        is_completed
    } = req.body;

    const sql = `
        UPDATE tasks
        SET
            title = ?,
            memo = ?,
            deadline_date = ?,
            deadline_time = ?,
            quadrant = ?,
            delay_count = ?,
            is_completed = ?
        WHERE id = ?
    `;

    db.run(
        sql,
        [
            title,
            memo,
            deadline_date,
            deadline_time,
            quadrant,
            delay_count,
            is_completed,
            id
        ],
        function(err) {

            if (err) {

                return res.status(500).json({
                    message: '할 일 수정 실패'
                });

            }

            res.json({
                message: '할 일 수정 성공'
            });

        }
    );

});

// 할 일 삭제 API
app.delete('/tasks/:id', (req, res) => {

    const { id } = req.params;

    const sql =
        `DELETE FROM tasks
         WHERE id = ?`;

    db.run(sql, [id], function(err) {

        if (err) {

            return res.status(500).json({
                message: '할 일 삭제 실패'
            });

        }

        res.json({
            message: '할 일 삭제 성공'
        });

    });

});