const express = require("express");
const db = require("../database");

const {
    generateRecommendations
} = require("./recommendations");

const {
    getAppDate
} = require("../utils/date");

const router = express.Router();

const {
    ALLOWED_CATEGORIES,
    ALLOWED_QUADRANTS,
    ALLOWED_ESTIMATED_TIME_LEVELS,
    getEstimatedMinutes
} = require("../utils/constants");

/*
====================================
1. 할 일 목록 조회
GET /tasks?user_id=1&category=개인
====================================
*/
router.get("/tasks", (req, res) => {
    const userId = req.query.user_id;
    const category = req.query.category;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    let sql = `
        SELECT *
        FROM tasks
        WHERE user_id = ?
    `;

    const params = [userId];

    if (category) {
        sql += `
        AND category = ?
        `;

        params.push(category);
    }

    sql += `
        ORDER BY id DESC
    `;

    db.all(
        sql,
        params,
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

//사분면 별 조회
router.get("/tasks/quadrant", (req, res) => {

    const userId = req.query.user_id;

    const category =
        req.query.category;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    let sql = `
        SELECT *
        FROM tasks
        WHERE user_id = ?
        AND is_completed = 0
    `;

    const params = [userId];

    if (category) {
        sql += `
        AND category = ?
        `;

        params.push(category);
    }

    sql += `
        ORDER BY id DESC
    `;

    db.all(
        sql,
        params,
        (err, tasks) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                category: category || "전체",

                urgent_important:
                    tasks.filter(
                        t => t.quadrant === "당장 해"
                    ),

                important:
                    tasks.filter(
                        t => t.quadrant === "그래도 해"
                    ),

                urgent:
                    tasks.filter(
                        t => t.quadrant === "해치워"
                    ),

                later:
                    tasks.filter(
                        t => t.quadrant === "나중에 해"
                    )
            });
        }
    );
});

//통합 조회(작업 + 일정)
router.get("/todo-items", (req, res) => {

    const userId =
        req.query.user_id;

    const category =
        req.query.category;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    let taskSql = `
        SELECT *
        FROM tasks
        WHERE user_id = ?
    `;

    const taskParams = [userId];

    if (category) {
        taskSql += `
        AND category = ?
        `;

        taskParams.push(category);
    }

    taskSql += `
        ORDER BY id DESC
    `;

    let scheduleSql = `
        SELECT *
        FROM schedules
        WHERE user_id = ?
    `;

    const scheduleParams = [userId];

    if (category) {
        scheduleSql += `
        AND category = ?
        `;

        scheduleParams.push(category);
    }

    scheduleSql += `
        ORDER BY schedule_date ASC, start_time ASC
    `;

    db.all(
        taskSql,
        taskParams,
        (taskErr, tasks) => {

            if (taskErr) {
                return res.status(500).json({
                    success: false,
                    message: taskErr.message
                });
            }

            db.all(
                scheduleSql,
                scheduleParams,
                (scheduleErr, schedules) => {

                    if (scheduleErr) {
                        return res.status(500).json({
                            success: false,
                            message: scheduleErr.message
                        });
                    }

                    const taskItems =
                        tasks.map(task => ({
                            item_type: "task",
                            id: task.id,
                            user_id: task.user_id,
                            title: task.title,
                            memo: task.memo,
                            category: task.category,
                            quadrant: task.quadrant,
                            is_completed: task.is_completed,
                            date: task.deadline_date,
                            start_time: null,
                            end_time: task.deadline_time,
                            original: task
                        }));

                    const scheduleItems =
                        schedules.map(schedule => ({
                            item_type: "schedule",
                            id: schedule.id,
                            user_id: schedule.user_id,
                            title: schedule.title,
                            memo: schedule.memo,
                            category: schedule.category,
                            quadrant: schedule.quadrant,
                            is_completed: schedule.is_completed,
                            date: schedule.schedule_date,
                            start_time: schedule.start_time,
                            end_time: schedule.end_time,
                            original: schedule
                        }));

                    const items =
                        [
                            ...taskItems,
                            ...scheduleItems
                        ];

                    res.json({
                        success: true,
                        category: category || "전체",
                        task_count: tasks.length,
                        schedule_count: schedules.length,
                        total_count: items.length,
                        tasks,
                        schedules,
                        items
                    });
                }
            );
        }
    );
});

/*
====================================
2. 할 일 추가
POST /tasks
====================================
*/
router.post("/tasks", (req, res) => {

    const {
        user_id,
        title,
        memo,
        deadline_date,
        deadline_time,
        quadrant,
        category,
        estimated_time_level
    } = req.body || {};

    let finalCategory =
        category || "개인";

    let finalEstimatedTimeLevel =
        estimated_time_level || "보통";
    
    if (!user_id || !title) {
        return res.status(400).json({
            success: false,
            message: "user_id와 title은 필수입니다."
        });
    }

    if (!ALLOWED_ESTIMATED_TIME_LEVELS.includes(finalEstimatedTimeLevel)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 예상시간 값입니다."
        });
    }

    const finalEstimatedMinutes =
        getEstimatedMinutes(finalEstimatedTimeLevel);

    if (
        Number.isNaN(finalEstimatedMinutes) ||
        finalEstimatedMinutes <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "estimated_minutes는 1 이상의 숫자여야 합니다."
        });
    }

    if (!ALLOWED_CATEGORIES.includes(finalCategory)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 카테고리 값입니다."
        });
    }

    let finalDeadlineDate =
        deadline_date;

    let finalDeadlineTime =
        deadline_time;

    let finalQuadrant =
        quadrant;

    if (!finalDeadlineDate) {

        const future =
            new Date();

        future.setDate(
            future.getDate() + 21
        );

        finalDeadlineDate =
            `${future.getFullYear()}. ${future.getMonth() + 1}. ${future.getDate()}.`;
    }

    if (!finalDeadlineTime) {
        finalDeadlineTime = "22:00";
    }

    if (!finalQuadrant) {
        finalQuadrant = "나중에 해";
    }

    if (!ALLOWED_QUADRANTS.includes(finalQuadrant)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 중요도 값입니다."
        });
    }

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
        category,
        estimated_time_level,
        estimated_minutes,
        created_at,
        is_completed
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
            user_id,
            title,
            memo,
            finalDeadlineDate,
            finalDeadlineTime,
            finalQuadrant,
            finalCategory,
            finalEstimatedTimeLevel,
            finalEstimatedMinutes,
            getAppDate()
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
router.put("/tasks/:id", (req, res) => {

    const taskId = req.params.id;

    const {
        user_id,
        title,
        memo,
        deadline_date,
        deadline_time,
        quadrant,
        category,
        estimated_time_level,
        is_completed
    } = req.body || {};

    const finalCategory =
        category || "개인";

    let finalEstimatedTimeLevel =
        estimated_time_level || "보통";

    if (!ALLOWED_ESTIMATED_TIME_LEVELS.includes(finalEstimatedTimeLevel)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 예상시간 값입니다."
        });
    }

    const finalEstimatedMinutes =
        getEstimatedMinutes(finalEstimatedTimeLevel);

    if (
        Number.isNaN(finalEstimatedMinutes) ||
        finalEstimatedMinutes <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "estimated_minutes는 1 이상의 숫자여야 합니다."
        });
    }

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    if (!title || !deadline_date || !deadline_time || !quadrant) {
        return res.status(400).json({
            success: false,
            message: "title, deadline_date, deadline_time, quadrant는 필수입니다."
        });
    }

    if (!ALLOWED_CATEGORIES.includes(finalCategory)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 카테고리 값입니다."
        });
    }

    if (!ALLOWED_QUADRANTS.includes(quadrant)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 중요도 값입니다."
        });
    }

    db.get(
        `
        SELECT *
        FROM tasks
        WHERE id = ?
        AND user_id = ?
        `,
        [
            taskId,
            user_id
        ],
        (selectErr, previousTask) => {

            if (selectErr) {
                return res.status(500).json({
                    success: false,
                    message: selectErr.message
                });
            }

            if (!previousTask) {
                return res.status(404).json({
                    success: false,
                    message: "할 일을 찾을 수 없습니다."
                });
            }

            const wasRecommendedToday =
                previousTask.recommended_today === 1;

            const wasAlreadyCompleted =
                previousTask.is_completed === 1;

            const shouldProcessStreak =
                is_completed &&
                !wasAlreadyCompleted &&
                wasRecommendedToday;

            db.run(
                `
                UPDATE tasks
                SET
                    title = ?,
                    memo = ?,
                    deadline_date = ?,
                    deadline_time = ?,
                    quadrant = ?,
                    category = ?,
                    estimated_time_level = ?,
                    estimated_minutes = ?,
                    is_completed = ?,
                    completed_date =
                        CASE
                            WHEN ? = 1 THEN ?
                            ELSE NULL
                        END
                WHERE id = ?
                AND user_id = ?
                `,
                [
                    title,
                    memo,
                    deadline_date,
                    deadline_time,
                    quadrant,
                    finalCategory,
                    finalEstimatedTimeLevel,
                    finalEstimatedMinutes,
                    is_completed ? 1 : 0,
                    is_completed ? 1 : 0,
                    getAppDate(),
                    taskId,
                    user_id
                ],
                function(updateErr) {

                    if (updateErr) {
                        return res.status(500).json({
                            success: false,
                            message: updateErr.message
                        });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({
                            success: false,
                            message: "수정할 할 일을 찾을 수 없습니다."
                        });
                    }

                    function refreshRecommendations() {
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
                                    updated: 1,
                                    streak_checked: shouldProcessStreak
                                });
                            }
                        );
                    }

                    if (!shouldProcessStreak) {
                        return refreshRecommendations();
                    }

                    const today =
                        getAppDate();

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

                            if (!user) {
                                return res.status(404).json({
                                    success: false,
                                    message: "사용자를 찾을 수 없습니다."
                                });
                            }

                            if (
                                user.today_success === 1 &&
                                user.today_success_date === today
                            ) {
                                return refreshRecommendations();
                            }

                            const nextStreak =
                                user.streak_count + 1;

                            const rewardShield =
                                nextStreak % 7 === 0 &&
                                nextStreak > user.last_shield_reward_streak;

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
                                (streakErr) => {

                                    if (streakErr) {
                                        return res.status(500).json({
                                            success: false,
                                            message: streakErr.message
                                        });
                                    }

                                    refreshRecommendations();
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

/*
====================================
사분면 이동
PUT /tasks/:id/quadrant
====================================
*/
router.put("/tasks/:id/quadrant", (req, res) => {

    const taskId =
        req.params.id;

    const {
        user_id,
        quadrant
    } = req.body || {};

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    if (!quadrant) {
        return res.status(400).json({
            success: false,
            message: "quadrant가 필요합니다."
        });
    }

    if (!ALLOWED_QUADRANTS.includes(quadrant)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 중요도 값입니다."
        });
    }

    db.run(
        `
        UPDATE tasks
        SET
            quadrant = ?
        WHERE id = ?
        AND user_id = ?
        `,
        [
            quadrant,
            taskId,
            user_id
        ],
        function(err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: "이동할 할 일을 찾을 수 없습니다."
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
                        moved: this.changes,
                        task_id: Number(taskId),
                        quadrant
                    });
                }
            );
        }
    );
});
/*
====================================
4. 할 일 삭제
DELETE /tasks/:id
====================================
*/
router.delete("/tasks/:id", (req, res) => {

    const taskId = req.params.id;

    const body =
        req.body || {};

    const userId = 
        req.query.user_id || body.user_id;
    


    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    db.run(
        `
        DELETE FROM tasks
        WHERE id = ?
        AND user_id = ?
        `,
        [
            taskId,
            userId
        ],
        function(err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: "삭제할 할 일을 찾을 수 없습니다."
                });
            }

            generateRecommendations(
                userId,
                (recommendErr) => {

                    if (recommendErr) {
                        return res.status(500).json({
                            success: false,
                            message: recommendErr.message
                        });
                    }

                    res.json({
                        success: true,
                        deleted: this.changes
                    });
                }
            );
        }
    );
});

module.exports = router;