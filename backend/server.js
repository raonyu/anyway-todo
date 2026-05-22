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