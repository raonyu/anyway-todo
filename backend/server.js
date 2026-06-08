const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
app.use(express.json());
app.use(cors());

function getDeadlineUrgency(deadlineDate) {

    if (!deadlineDate) {
        return 0;
    }

    const match = deadlineDate.match(
        /(\d+)\.\s*(\d+)\.\s*(\d+)\./
    );

    if (!match) {
        return 0;
    }

    const target = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
    );

    const today = new Date();

    today.setHours(0,0,0,0);
    target.setHours(0,0,0,0);

    const diffDays =
        Math.floor(
            (target - today) /
            (1000 * 60 * 60 * 24)
        );

    if (diffDays <= 0) return 25;
    if (diffDays === 1) return 15;
    if (diffDays >= 2 && diffDays <= 5) {
        return 10;
    }
    if (diffDays >=6 && diffDays <= 14) {
        return 5;
    }

    return 0;
}

function generateRecommendations(userId, callback) {

    db.run(
        `
        UPDATE tasks
        SET
            recommended_today = 0
        WHERE user_id = ?
        `,
        [userId],
        (resetErr) => {

            if (resetErr) {
                return callback(resetErr);
            }

            db.all(
                `
                SELECT *
                FROM tasks
                WHERE user_id = ?
                AND is_completed = 0
                AND postponed_today = 0
                `,
                [userId],
                (err, tasks) => {

                    if (err) {
                        return callback(err);
                    }

                    const quadrantScore = {
                        "당장 해": 40,
                        "그래도 해": 30,
                        "해치워": 20,
                        "나중에 해": 10
                    };

                    tasks.sort((a, b) => {

                        const scoreA =
                            getDeadlineUrgency(a.deadline_date)
                            + (quadrantScore[a.quadrant] || 0);

                        const scoreB =
                            getDeadlineUrgency(b.deadline_date)
                            + (quadrantScore[b.quadrant] || 0);

                        return scoreB - scoreA;
                    });

                    const topTasks =
                        tasks.slice(0, 3);

                    let remaining =
                        topTasks.length;

                    if (remaining === 0) {
                        return callback(null, []);
                    }

                    topTasks.forEach(task => {

                        db.run(
                            `
                            UPDATE tasks
                            SET
                                recommended_today = 1,
                                recommended_date = ?
                            WHERE id = ?
                            `,
                            [
                                new Date()
                                    .toISOString()
                                    .split("T")[0],
                                task.id
                            ],
                            (updateErr) => {

                                if (updateErr) {
                                    return callback(updateErr);
                                }

                                remaining--;

                                if (remaining === 0) {
                                    callback(
                                        null,
                                        topTasks
                                    );
                                }
                            }
                        );
                    });
                }
            );
        }
    );
}

// 회원가입
app.post("/signup", (req, res) => {
    const { username, password } = req.body;

    db.run(
        `
        INSERT INTO users
        (
            username,
            password
        )
        VALUES (?, ?)
        `,
        [username, password],
        function(err) {

            if(err) {
                return res.status(400).json({
                    success:false,
                    message: "이미 존재하는 아이디입니다."
                });
            }

            res.json({
                success: true,
                message: "회원가입 완료"
            });
        }
    );
});

// 로그인
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get(
        `
        SELECT *
        FROM users
        WHERE username = ?
        AND password = ?
        `,
        [username, password],
        (err, user) => {

            if(err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (!user) {
                return res.json({
                    success: false,
                    message: "아이디 또는 비밀번호가 틀렸습니다."
                });
            }

            const today =
              new Date()
                  .toISOString()
                  .split("T")[0];

            const shouldCheckStreak =
              user.last_streak_check_date !== today;

            if (
              user.today_success_date &&
              user.today_success_date !== today
            ) {
              db.run(
                `
                UPDATE users
                SET
                    today_success = 0
                WHERE id = ?
                `,
                [user.id]
              );
              user.today_success = 0;
            }

            let shieldUsed = false;
            let streakFailed = false;

            if (
              shouldCheckStreak &&
              user.today_success === 0 &&
              user.streak_count > 0
            ) {

              if (user.shield_count > 0) {

                db.run(
                  `
                  UPDATE users
                  SET
                    shield_count = shield_count - 1,
                    last_streak_check_date = ?
                  WHERE id = ?
                  `,
                  [today, user.id]
                );

                user.shield_count -= 1;
                shieldUsed = true;

              } else {

                db.run(
                  `
                  UPDATE users
                  SET
                    streak_count = 0,
                    last_streak_check_date = ?
                  WHERE id = ?
                  `,
                  [today, user.id]
                );
                user.streak_count = 0;
                streakFailed = true;
              }
            }

            db.run(
              `
              UPDATE tasks
              SET
                postponed_today = 0
              WHERE user_id = ?
              AND postponed_date IS NOT NULL
              AND postponed_date < ?    
              `,
              [user.id, today]
            );

            db.run(
                `
                UPDATE users
                SET
                    last_login_date = ?
                WHERE id = ?
                `,
                [
                    today,
                    user.id
                ]
            );

            res.json({
                success: true,

                shield_used: shieldUsed,
                streak_failed: streakFailed,

                user_id: user.id,
                username: user.username,

                streak_count: user.streak_count,
                best_streak: user.best_streak,
                shield_count: user.shield_count,

                message: "로그인 성공"
            });
        }
    );
});

/*
====================================
1. 할 일 목록 조회
GET /tasks?user_id=1
====================================
*/
app.get("/tasks", (req, res) => {
  const userId = req.query.user_id;

  db.all(
    `
    SELECT *
    FROM tasks
    WHERE user_id = ?
    ORDER BY id DESC
    `,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      res.json(rows);
    }
  );
});

/*
====================================
오늘의 추천 조회
GET /recommendations?user_id=1
====================================
*/
app.get("/recommendations", (req, res) => {

    const userId = req.query.user_id;

    db.all(
        `
        SELECT *
        FROM tasks
        WHERE user_id = ?
        AND recommended_today = 1
        ORDER BY id DESC
        LIMIT 3
        `,
        [userId],
        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json(rows);
        }
    );
});

/*
====================================
추천 할일 생성
POST /recommendations/generate
====================================
*/
app.post("/recommendations/generate", (req, res) => {

    const { user_id } = req.body;

    generateRecommendations(
        user_id,
        (err, tasks) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
            res.json({
                success: true,
                count: tasks.length
            });
        }
    );
});

/*
====================================
2. 할 일 추가
POST /tasks
====================================
*/
app.post("/tasks", (req, res) => {
  const {
    user_id,
    title,
    memo,
    deadline_date,
    deadline_time,
    quadrant,
  } = req.body;

  db.run(
    `
    INSERT INTO tasks
    (
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
    `,
    [
      user_id,
      title,
      memo,
      deadline_date,
      deadline_time,
      quadrant,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

    generateRecommendations(
        user_id,
        (recommendErr) => {

            if (recommendErr) {
                return res.status(500).json({
                    success: false,
                    message: recommendErr.message
                });
            }

            res.json({
                success: true,
                task_id: this.lastID,
                recommended: true
            });
        }
      );
    }
  );
});

/*
====================================
3. 할 일 수정
PUT /tasks/:id
====================================
*/
app.put("/tasks/:id", (req, res) => {

  const taskId = req.params.id;

  const {
    user_id,
    title,
    memo,
    deadline_date,
    deadline_time,
    quadrant,
    delay_count,
    is_completed,
  } = req.body;

  db.run(
    `
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
    `,
    [
      title,
      memo,
      deadline_date,
      deadline_time,
      quadrant,
      delay_count,
      is_completed ? 1 : 0,
      taskId,
    ],
    function (err) {

      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

        if (is_completed) {

            db.get(
                `
                SELECT *
                FROM tasks
                WHERE id = ?
                `,
                [taskId],
                (taskErr, task) => {

                    if (
                        !taskErr &&
                        task &&
                        task.recommended_today === 1
                    ) {

                        db.get(
                            `
                            SELECT *
                            FROM users
                            WHERE id = ?
                            `,
                            [user_id],
                            (userErr, user) => {

                                const today =
                                    new Date()
                                        .toISOString()
                                        .split("T")[0];

                                if (
                                    !userErr &&
                                    user &&
                                    !(
                                        user.today_success === 1 &&
                                        user.today_success_date === today
                                    )
                                ) {

                                    const nextStreak =
                                        user.streak_count + 1;

                                    let rewardShield = false;

                                    if (
                                        nextStreak % 7 === 0 &&
                                        nextStreak >
                                        user.last_shield_reward_streak
                                    ) {
                                        rewardShield = true;
                                    }

                                    db.run(
                                        `
                                        UPDATE users
                                        SET
                                            today_success = 1,
                                            today_success_date = ?,

                                            streak_count = streak_count + 1,

                                            shield_count =
                                            CASE
                                                WHEN ? = 1
                                                THEN shield_count + 1
                                                ELSE shield_count
                                            END,

                                            last_shield_reward_streak =
                                            CASE
                                                WHEN ? = 1
                                                THEN ?
                                                ELSE last_shield_reward_streak
                                            END,

                                            best_streak =
                                            CASE
                                                WHEN streak_count + 1 > best_streak
                                                THEN streak_count + 1
                                                ELSE best_streak
                                            END
                                        WHERE id = ?
                                        `,
                                        [
                                            today,

                                            rewardShield ? 1 : 0,

                                            rewardShield ? 1 : 0,
                                            nextStreak,

                                            user_id
                                        ]
                                    );
                                }
                            }
                        );
                    }
                }
            );
        }

        generateRecommendations(
            user_id,
            (recommendErr) => {
                if (recommendErr) {
                    return res.status(500).json({
                        success:false,
                        message: recommendErr.message
                    });
                }
        
                res.json({
                    success: true,
                    updated: this.changes
                });
            }
        );
    }
  );
});


/*
====================================
추천 할일 성공 판정
POST /streak/check-recommendation-success
====================================
*/
app.post(
    "/streak/check-recommendation-success",
    (req, res) => {

        const { user_id } = req.body;

        db.get(
            `
            SELECT *
            FROM users
            WHERE id = ?
            `,
            [user_id],
            (userErr, user) => {

                if (userErr) {
                    return res.status(500).json({
                        success: false,
                        message: userErr.message
                    });
                }

                const today =
                    new Date()
                        .toISOString()
                        .split("T")[0];

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: "사용자를 찾을 수 없습니다."
                    })
                }

                if (
                    user.today_success === 1 &&
                    user.today_success_date === today
                ) {
                    return res.json({
                        success: true,
                        already_processed: true
                    });
                }

                db.get(
                    `
                    SELECT *
                    FROM tasks
                    WHERE user_id = ?
                    AND recommended_date = ?
                    AND is_completed = 1
                    LIMIT 1
                    `,
                    [
                        user_id,
                         today
                    ],
                    (taskErr, task) => {

                        if (taskErr) {
                            return res.status(500).json({
                                success: false,
                                message: taskErr.message
                            });
                        }

                        if (!task) {
                            return res.json({
                                success: false,
                                completed: false
                            });
                        }

                        const nextStreak =
                          user.streak_count + 1;

                        let rewardShield = false;

                        if (
                          nextStreak % 7 === 0 &&
                          nextStreak >
                          user.last_shield_reward_streak
                        ) {
                          rewardShield = true;
                        }

                        db.run(
                            `
                            UPDATE users
                            SET
                                today_success = 1,
                                today_success_date = ?,

                                streak_count = streak_count + 1,

                                shield_count =
                                CASE
                                    WHEN ? = 1
                                    THEN shield_count + 1
                                    ELSE shield_count
                                END,

                                last_shield_reward_streak =
                                CASE
                                    WHEN ? = 1
                                    THEN ?
                                    ELSE last_shield_reward_streak
                                END,

                                best_streak =
                                CASE
                                    WHEN streak_count + 1 > best_streak
                                    THEN streak_count + 1
                                    ELSE best_streak
                                END
                            WHERE id = ?
                            `,
                            [
                                today,

                                rewardShield ? 1 : 0,

                                rewardShield ? 1 : 0,
                                nextStreak,

                                user_id
                            ],
                            (updateErr) => {

                                if (updateErr) {
                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            updateErr.message
                                    });
                                }

                                res.json({
                                    success: true,
                                    completed: true
                                });
                            }
                        );
                    }
                );
            }
        );
    }
);

/*
====================================
4. 할 일 삭제
DELETE /tasks/:id
====================================
*/
app.delete("/tasks/:id", (req, res) => {
  const taskId = req.params.id;

  db.run(
    `
    DELETE FROM tasks
    WHERE id = ?
    `,
    [taskId],
    function (err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      res.json({
        success: true,
        deleted: this.changes,
      });
    }
  );
});

/*
====================================
테스트용 유저 수정
POST /debug/set-user
====================================
*/
app.post("/debug/set-user", (req, res) => {

    const {
        user_id,
        streak_count,
        shield_count,
        today_success
    } = req.body;

    db.run(
        `
        UPDATE users
        SET
            streak_count = ?,
            shield_count = ?,
            today_success = ?
        WHERE id = ?
        `,
        [
            streak_count,
            shield_count,
            today_success,
            user_id
        ],
        function(err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                updated: this.changes
            });
        }
    );
});

/*
====================================
테스트용 로그인 상태 수정
POST /debug/set-login-state
====================================
*/
app.post("/debug/set-login-state", (req, res) => {

    const {
        user_id,
        today_success,
        today_success_date,
        last_streak_check_date
    } = req.body;

    db.run(
        `
        UPDATE users
        SET
            today_success = ?,
            today_success_date = ?,
            last_streak_check_date = ?
        WHERE id = ?
        `,
        [
            today_success,
            today_success_date,
            last_streak_check_date,
            user_id
        ],
        function(err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                updated: this.changes
            });
        }
    );
});

/*
====================================
테스트용 유저 조회
GET /debug/user?user_id=1
====================================
*/
app.get("/debug/user", (req, res) => {

    const userId = req.query.user_id;

    db.get(
        `
        SELECT *
        FROM users
        WHERE id = ?
        `,
        [userId],
        (err, user) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "사용자를 찾을 수 없습니다."
                });
            }

            res.json({
                success: true,
                user
            });
        }
    );
});

/*
====================================
테스트용 전체 할일 삭제
DELETE /debug/tasks?user_id=1
====================================
*/
app.delete("/debug/tasks", (req, res) => {

    const userId = req.query.user_id;

    db.run(
        `
        DELETE FROM tasks
        WHERE user_id = ?
        `,
        [userId],
        function(err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                deleted: this.changes
            });
        }
    );
});

app.listen(3000, () => {
    console.log("서버 실행 중");
});