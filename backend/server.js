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

// 연속 달성 조회 API
app.get('/streak/:userId', (req, res) => {

    const { userId } = req.params;

    const sql = `
        SELECT
            streak_count,
            best_streak,
            last_completion_date
        FROM users
        WHERE id = ?
    `;

    db.get(sql, [userId], (err, row) => {

        if (err) {
            return res.status(500).json({
                message: '조회 실패'
            });
        }

        res.json(row);

    });

});

// 방어권 조회 API
app.get('/shield/:userId', (req, res) => {

    const { userId } = req.params;

    const sql = `
        SELECT shield_count
        FROM users
        WHERE id = ?
    `;

    db.get(sql, [userId], (err, row) => {

        if (err) {

            return res.status(500).json({
                message: '조회 실패'
            });

        }

        res.json(row);

    });

});

// 할 일 목록 조회 API
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

            // 완료 처리가 아니면 종료
            if (is_completed !== 1) {

                return res.json({
                    message: '할 일 수정 성공'
                });

            }

            // 현재 task 정보 조회
            db.get(
                `SELECT * FROM tasks WHERE id = ?`,
                [id],
                (err, task) => {

                    if (!task) {

                        return res.json({
                            message: '할 일 수정 성공'
                        });

                    }

                    const today =
                        new Date().toISOString().split('T')[0];

                    // 오늘 추천 목록 확인
                    db.all(
                        `
                        SELECT *
                        FROM daily_recommendations
                        WHERE user_id = ?
                        AND recommend_date = ?
                        `,
                        [task.user_id, today],
                        (err, recommendations) => {

                            const isRecommended =
                                recommendations.some(
                                    r => r.task_id == id
                                );

                            // 추천 목록 아니면 종료
                            if (!isRecommended) {

                                return res.json({
                                    message: '할 일 수정 성공'
                                });

                            }

                            // 사용자 정보 조회
                            db.get(
                                `
                                SELECT *
                                FROM users
                                WHERE id = ?
                                `,
                                [task.user_id],
                                (err, user) => {

                                    // 이미 오늘 streak 증가함
                                    if (
                                        user.last_completion_date ===
                                        today
                                    ) {

                                        return res.json({
                                            message:
                                                '할 일 수정 성공'
                                        });

                                    }

                                    const newStreak =
                                        user.streak_count + 1;

                                    const newBest =
                                        Math.max(
                                            newStreak,
                                            user.best_streak
                                        );

                                    db.run(
                                        `
                                        UPDATE users
                                        SET
                                            streak_count = ?,
                                            best_streak = ?,
                                            last_completion_date = ?
                                        WHERE id = ?
                                        `,
                                        [
                                            newStreak,
                                            newBest,
                                            today,
                                            task.user_id
                                        ],
                                        () => {

                                            res.json({
                                                message:
                                                    '할 일 수정 성공',
                                                streak_count:
                                                    newStreak
                                            });

                                        }
                                    );

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});

// 내일로 미루기 API
app.put('/tasks/:id/postpone', (req, res) => {

    const { id } = req.params;

    db.get(
        `
        SELECT *
        FROM tasks
        WHERE id = ?
        `,
        [id],
        (err, task) => {

            if (err || !task) {

                return res.status(404).json({
                    message: '할 일을 찾을 수 없습니다.'
                });

            }

            const today =
                new Date().toISOString().split('T')[0];

            let newDate = task.deadline_date;

            //오늘 마감인 경우만 마감일 연장
            if (task.deadline_date === today) {

                const currentDate = new Date(task.deadline_date);
                currentDate.setDate(currentDate.getDate() + 1);

                newDate = currentDate.toISOString().split('T')[0];
        }

            db.run(
                `
                UPDATE tasks
                SET
                    deadline_date = ?,
                    delay_count = delay_count + 1
                WHERE id = ?
                `,
                [newDate, id],
                function(err) {

                    if (err) {

                        return res.status(500).json({
                            message: '미루기 실패'
                        });

                    }

                    db.run(
                        `
                        UPDATE daily_recommendations
                        SET is_postponed = 1
                        WHERE task_id = ?
                        AND recommend_date = ?
                        `,
                        [id, today],
                        function(err) {

                            console.log("변경된 행 수", this.changes);

                            if (err) {
                                console.log(err);
                            }
                        }
                    );

                    res.json({
                        message: '내일로 미루기 성공',
                        new_deadline: newDate
                    });

                }
            );

        }
    );
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

// 오늘의 추천 할 일 조회
app.get('/recommend/:userId', (req, res) => {

    const { userId } = req.params;

    const sql = `
        SELECT *
        FROM tasks
        WHERE user_id = ?
        AND is_completed = 0
    `;

    db.all(sql, [userId], (err, tasks) => {

        if (err) {
            return res.status(500).json({
                message: '추천 조회 실패'
            });
        }

        if (tasks.length === 0) {
            return res.json({
                message: '할 일이 없습니다.'
            });
        }

        const priority = {
            '당장 해': 4,
            '그래도 해': 3,
            '해치워': 2,
            '나중에 해': 1
        };

        tasks.sort((a, b) => {
            return priority[b.quadrant] - priority[a.quadrant];
        });

        const recommendedTasks = tasks.slice(0, 3);

        const today = new Date().toISOString().split('T')[0];

        const checkSql = `
            SELECT task_id, is_postponed
            FROM daily_recommendations
            WHERE user_id = ?
            AND recommend_date = ?
        `;

        db.all(checkSql, [userId, today], (err, rows) => {

            if (err) {
                return res.status(500).json({
                    message: '추천 기록 조회 실패'
                });
            }

            // 오늘 추천이 이미 존재하면 반환
            if (rows.length > 0) {

                const ids = rows.map(row => row.task_id);

                //현재 추천 중인 작업
                const activeIds = rows
                .filter(row => row.is_postponed === 0)
                .map(row => row.task_id);

                const existingTasks = tasks.filter(task =>
                    activeIds.includes(task.id)
                );

                //오늘 이미 추천되었거나 미뤄진 작업
                const excludedIds = rows.map(row => row.task_id);


                //새로 추천 가능한 작업
                const remainingTasks = tasks.filter(task =>
                    !excludedIds.includes(task.id)
                );

                const needCount = 3 - existingTasks.length;

                const additionalTasks = remainingTasks.slice(0, needCount);

                additionalTasks.forEach(task => {

                    db.run(
                        `
                        INSERT INTO daily_recommendations (
                            user_id,
                            task_id,
                            recommend_date
                        )
                        VALUES (?, ?, ?)
                        `,
                        [
                            userId,
                            task.id,
                            today
                        ]
                    );

                });

                const finalTasks = existingTasks.concat(additionalTasks);

                return res.json(finalTasks);

            }

            // 오늘 추천이 없으면 저장
            recommendedTasks.forEach(task => {

                db.run(
                    `
                    INSERT INTO daily_recommendations (
                        user_id,
                        task_id,
                        recommend_date
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        userId,
                        task.id,
                        today
                    ]
                );

            });

            res.json(recommendedTasks);

        });

    });

});

// 추천 기록 조회 API
app.get('/recommendations', (req, res) => {

    const sql = `
        SELECT *
        FROM daily_recommendations
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {

            return res.status(500).json({
                message: '조회 실패'
            });

        }

        res.json(rows);

    });

});

// 연속달성 판정 API
app.post('/check-streak/:userId', (req, res) => {

    const { userId } = req.params;

    const today =
        new Date().toISOString().split('T')[0];

    db.all(
        `
        SELECT *
        FROM tasks
        WHERE user_id = ?
        AND is_completed = 0
        AND deadline_date < ?
        `,
        [userId, today],
        (err, overdueTasks) => {

            if (err) {

                return res.status(500).json({
                    message: '판정 실패'
                });

            }

            db.get(
                `
                SELECT *
                FROM users
                WHERE id = ?
                `,
                [userId],
                (err, user) => {

                    if (overdueTasks.length === 0) {

                        const newStreak =
                            user.streak_count + 1;
let newShield = user.shield_count;

if (
    newStreak % 7 === 0 &&
    newShield < 3
) {
    newShield++;
}

                        db.run(
                            `
                            UPDATE users
                            SET streak_count = ?,
                                best_streak = ?,
                                shield_count = ?
                            WHERE id = ?
                            `,
                            [
                                newStreak,
                                Math.max(
                                    newStreak,
                                    user.best_streak
                                ),
                                newShield,
                                userId
                            ]
                        );

                        return res.json({
                            message: '연속달성 성공',
                            streak_count: newStreak,
                            shield_count: newShield
                        });

                    }

                    if (user.shield_count > 0) {

                        db.run(
                            `
                            UPDATE users
                            SET shield_count =
                                shield_count - 1
                            WHERE id = ?
                            `,
                            [userId]
                        );

                        return res.json({
                            message:
                                '방어권 사용',
                            shield_left:
                                user.shield_count - 1
                        });

                    }

                    db.run(
                        `
                        UPDATE users
                        SET streak_count = 0
                        WHERE id = ?
                        `,
                        [userId]
                    );

                    res.json({
                        message:
                            '연속달성 실패',
                        streak_count: 0
                    });

                }
            );

        }
    );

});

// 오늘 성공 판정 API
app.post('/check-today-success/:userId', (req, res) => {

    const { userId } = req.params;

    const today =
        new Date().toISOString().split('T')[0];

    db.all(
        `
        SELECT t.*, d.is_postponed
        FROM daily_recommendations d
        JOIN tasks t
        ON d.task_id = t.id
        WHERE d.user_id = ?
        AND d.recommend_date = ?
        `,
        [userId, today],
        (err, recommendedTasks) => {
            const activeTasks = 
                recommendedTasks.filter(task => 
                    task.is_postponed === 0
                );

            if (err) {

                return res.status(500).json({
                    message: '판정 실패'
                });

            }

            // 오늘 마감 추천 할 일 찾기
            const todayDeadlineTasks =
                activeTasks.filter(task =>
                    task.deadline_date === today
                );

            // 오늘 마감 추천이 존재하는 경우
            if (todayDeadlineTasks.length > 0) {

                const allCompleted =
                    todayDeadlineTasks.every(task =>
                        task.is_completed === 1
                    );

                return res.json({
                    success: allCompleted,
                    reason: allCompleted
                        ? '오늘 마감 추천 할 일 완료'
                        : '오늘 마감 추천 할 일이 남아있음'
                });

            }

            //추천 가능한 할 일이 없는 경우
            if (activeTasks.length === 0) {

                return res.json({
                    success: true,
                    reason: '추천 할 일 없어 자동 성공'
                });
            }
            
            // 오늘 마감 추천이 없는 경우
            const anyCompleted =
                activeTasks.some(task =>
                    task.is_completed === 1
                );

            res.json({
                success: anyCompleted,
                reason: anyCompleted
                    ? '추천 할 일 완료'
                    : '추천 할 일 미완료'
            });

        }

    );

});

// 하루 최종 판정 API
app.post('/daily-check/:userId', (req, res) => {

    const { userId } = req.params;

    const today =
        new Date().toISOString().split('T')[0];

    // 오늘 추천 목록 조회
    db.all(
        `
        SELECT t.*
        FROM daily_recommendations d
        JOIN tasks t
        ON d.task_id = t.id
        WHERE d.user_id = ?
        AND d.recommend_date = ?
        `,
        [userId, today],
        (err, recommendedTasks) => {

            if (err) {

                return res.status(500).json({
                    message: '판정 실패'
                });

            }

            let success = false;

            // 오늘 마감 추천 찾기
            const todayDeadlineTasks =
                recommendedTasks.filter(task =>
                    task.deadline_date === today
                );

            // 오늘 마감 추천 존재
            if (todayDeadlineTasks.length > 0) {

                success =
                    todayDeadlineTasks.every(task =>
                        task.is_completed === 1
                    );

            }
            else {

                // 추천 TOP3 중 하나 완료
                success =
                    recommendedTasks.some(task =>
                        task.is_completed === 1
                    );

            }

            // 사용자 조회
            db.get(
                `
                SELECT *
                FROM users
                WHERE id = ?
                `,
                [userId],
                (err, user) => {

                    if (err || !user) {

                        return res.status(404).json({
                            message: '사용자 없음'
                        });

                    }

                    // 성공
                    if (success) {

                        const newStreak =
                            user.streak_count + 1;

                        let newShield =
                            user.shield_count;

                        // 7일마다 방어권 지급
                        if (
                            newStreak % 7 === 0 &&
                            newShield < 3
                        ) {
                            newShield++;
                        }

                        const newBest =
                            Math.max(
                                newStreak,
                                user.best_streak
                            );

                        db.run(
                            `
                            UPDATE users
                            SET
                                streak_count = ?,
                                best_streak = ?,
                                shield_count = ?
                            WHERE id = ?
                            `,
                            [
                                newStreak,
                                newBest,
                                newShield,
                                userId
                            ],
                            () => {

                                res.json({
                                    success: true,
                                    message: '연속달성 성공',
                                    streak_count: newStreak,
                                    shield_count: newShield
                                });

                            }
                        );

                        return;
                    }

                    // 실패 + 방어권 있음
                    if (user.shield_count > 0) {

                        db.run(
                            `
                            UPDATE users
                            SET shield_count =
                                shield_count - 1
                            WHERE id = ?
                            `,
                            [userId],
                            () => {

                                res.json({
                                    success: false,
                                    message: '방어권 사용',
                                    streak_count:
                                        user.streak_count,
                                    shield_count:
                                        user.shield_count - 1
                                });

                            }
                        );

                        return;
                    }

                    // 실패 + 방어권 없음
                    db.run(
                        `
                        UPDATE users
                        SET streak_count = 0
                        WHERE id = ?
                        `,
                        [userId],
                        () => {

                            res.json({
                                success: false,
                                message:
                                    '연속달성 실패',
                                streak_count: 0,
                                shield_count: 0
                            });

                        }
                    );

                }
            );

        }

    );

});

app.listen(3000, () => {
    console.log('서버 실행 중!');
});