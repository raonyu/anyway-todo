const express = require("express");
const db = require("../database");

const {
    generateRecommendations
} = require("./recommendations");

const {
    getAppDate
} = require("../utils/date");

const router = express.Router();

db.run(`ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT '진행 전'`, (err) => {
    if (!err) console.log("tasks 테이블에 status 컬럼 추가 완료");
});

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
        estimated_time_level,
        status // 💡 status 분할 추출 추가
    } = req.body || {};

    let finalCategory =
        category || "개인";

    let finalEstimatedTimeLevel =
        estimated_time_level || "보통";

    let finalStatus =
        status || "진행 전";
    
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
        finalDeadlineDate = "";
    }

    if (!finalDeadlineTime) {
        finalDeadlineTime = "";
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
        is_completed,
        status -- 💡 status 컬럼 반영
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
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
            getAppDate(),
            finalStatus // 💡 status 값 바인딩
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
태스크 수정 및 스트릭 실시간 연동
PUT /tasks/:id
====================================
*/
router.put("/tasks/:id", (req, res) => {
    const taskId = req.params.id;
    const { 
        user_id, is_completed, title, quadrant, category, 
        memo, deadline_date, deadline_time, estimated_time_level, status 
    } = req.body;

    const isCompletedInt = is_completed ? 1 : 0;
    const today = getAppDate(); // YYYY. MM. DD. 형식

    // 1. 현재 수정하려는 태스크가 오늘 추천된 태스크(recommended_today)인지 먼저 조회합니다.
    db.get(`SELECT recommended_today, is_completed FROM tasks WHERE id = ?`, [taskId], (err, task) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!task) return res.status(404).json({ success: false, message: "태스크를 찾을 수 없습니다." });

        const wasCompleted = task.is_completed;

        // 2. 태스크 정보 및 완료 상태 업데이트 실행
        const updateTaskSql = `
            UPDATE tasks 
            SET is_completed = ?, status = ?, title = ?, quadrant = ?, category = ?, 
                memo = ?, deadline_date = ?, deadline_time = ?, estimated_time_level = ?, completed_date = ?
            WHERE id = ?
        `;
        // 완료 시점 전용 날짜 마킹 처리
        const completedDateParam = (isCompletedInt === 1) ? today : null;
        const params = [
            isCompletedInt, status, title, quadrant, category, 
            memo, deadline_date, deadline_time, estimated_time_level, completedDateParam, taskId
        ];

        db.run(updateTaskSql, params, function (updateErr) {
            if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });

            // 3. 오늘의 추천(TODAY'S PICK) 태스크일 때만 스트릭(연속 달성) 연동 로직 작동
            if (task.recommended_today === 1) {
                
                // [CASE A] 미완료 -> 완료로 체크했을 때 (스트릭 증가 조건)
                if (wasCompleted === 0 && isCompletedInt === 1) {
                    db.get(`SELECT today_success FROM users WHERE id = ?`, [user_id], (userErr, user) => {
                        if (!userErr && user && user.today_success === 0) {
                            // 오늘 처음으로 추천 할 일을 해치운 것이므로 스트릭을 +1 올리고 오늘 성공 마킹
                            db.run(
                                `UPDATE users SET today_success = 1, streak_count = streak_count + 1 WHERE id = ?`,
                                [user_id],
                                () => {
                                    return res.json({ success: true, streak_checked: true });
                                }
                            );
                        } else {
                            // 오늘 이미 다른 추천 할 일을 완료해서 스트릭이 오른 상태라면 중복 증가 방지
                            return res.json({ success: true, streak_checked: false });
                        }
                    });
                    return;
                }
                
                // [CASE B] 완료 -> 미완료로 체크를 취소했을 때 (실수 정정 및 복구 조건)
                if (wasCompleted === 1 && isCompletedInt === 0) {
                    // 오늘 추천된 3개 태스크 중 '여전히 완료 상태인 다른 추천 태스크'가 남아있는지 갯수 세기
                    db.get(
                        `SELECT COUNT(*) as active_count FROM tasks WHERE user_id = ? AND recommended_today = 1 AND is_completed = 1`,
                        [user_id],
                        (countErr, row) => {
                            const activeCount = row ? row.active_count : 0;
                            
                            if (activeCount === 0) {
                                // 오늘 완료한 다른 추천 할 일이 하나도 없다면, 오늘 성공 취소 및 오른 스트릭 1 차감 복구
                                db.run(
                                    `UPDATE users SET today_success = 0, streak_count = CASE WHEN streak_count > 0 THEN streak_count - 1 ELSE 0 END WHERE id = ?`,
                                    [user_id],
                                    () => {
                                        return res.json({ success: true, streak_checked: false });
                                    }
                                );
                            } else {
                                // 아직 다른 추천 할 일이 완료된 상태로 남아있다면 오늘 성공 상태 유지
                                return res.json({ success: true, streak_checked: false });
                            }
                        }
                    );
                    return;
                }
            }

            // 일반 4분할 탭에서 완료 처리했거나 상태 변화가 없는 경우의 기본 반환
            res.json({ success: true, streak_checked: false });
        });
    });
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

/*
====================================
대시보드 통계 조회 (오늘 해치운 일 + 이번 주 달성률)
GET /dashboard-stats?user_id=1
====================================
*/
router.get("/dashboard-stats", (req, res) => {
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ success: false, message: "user_id가 필요합니다." });
    }

    const today = getAppDate(); // YYYY. MM. DD. 형식

    // 1. 오늘 해치운 일 개수 쿼리
    const todaySql = `
        SELECT COUNT(*) as count 
        FROM tasks 
        WHERE user_id = ? AND is_completed = 1 AND completed_date = ?
    `;

    // 2. 이번 주 전체 할 일 대비 완료 요율 (최근 7일 혹은 생성된 전체 기준 방어 요율)
    const weekSql = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
        FROM tasks 
        WHERE user_id = ?
    `;

    db.get(todaySql, [userId, today], (err, todayRow) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        db.get(weekSql, [userId], (err, weekRow) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            const todayCompleted = todayRow ? todayRow.count : 0;
            const totalTasks = weekRow ? weekRow.total : 0;
            const completedTasks = weekRow ? weekRow.completed : 0;

            // 달성률 계산 (할 일이 아예 없으면 0%)
            const achievementRate = totalTasks > 0 
                ? Math.round((completedTasks / totalTasks) * 100) 
                : 0;

            res.json({
                success: true,
                today_completed: todayCompleted,
                weekly_achievement: achievementRate
            });
        });
    });
});

module.exports = router;