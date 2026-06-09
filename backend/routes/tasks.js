const express = require("express");
const db = require("../database");

const {
    generateRecommendations
} = require("./recommendations");

const router = express.Router();

/*
====================================
1. 할 일 목록 조회
GET /tasks?user_id=1&category=개인
====================================
*/
router.get("/tasks", (req, res) => {
    const userId = req.query.user_id;
    // 💡 프론트엔드에서 넘어온 카테고리 값 받기 (없으면 기본값 '개인')
    const category = req.query.category || "개인"; 

    db.all(
        `
        SELECT *
        FROM tasks
        WHERE user_id = ? AND category = ?
        ORDER BY id DESC
        `,
        [userId, category], 
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
사분면별 조회
GET /tasks/quadrant?user_id=1&category=개인
====================================
*/
router.get("/tasks/quadrant", (req, res) => {

    const userId = req.query.user_id;
    const category = req.query.category || "개인"; 

    db.all(
        `
        SELECT *
        FROM tasks
        WHERE user_id = ? AND is_completed = 0 AND category = ?
        ORDER BY id DESC
        `,
        [userId, category], 
        (err, tasks) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,

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
        difficulty,
        status,    
        category   
    } = req.body;

    let finalDeadlineDate = deadline_date;
    let finalDeadlineTime = deadline_time;
    let finalQuadrant = quadrant;
    let finalDifficulty = difficulty;
    let finalStatus = status;     
    let finalCategory = category; 

    if (!finalDifficulty) {
        finalDifficulty = "보통";
    }
    
    if (!finalStatus) {
        finalStatus = "진행 전"; // 기본값
    }

    if (!finalCategory) {
        finalCategory = "개인"; // 기본값
    }

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
            difficulty,
            is_completed,
            status,     
            category   
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `,
        [
            user_id,
            title,
            memo,
            finalDeadlineDate,
            finalDeadlineTime,
            finalQuadrant,
            finalDifficulty,
            finalStatus,   
            finalCategory  
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
        difficulty,
        is_completed,
        status,     
        category   
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
            difficulty = ?,
            is_completed = ?,
            status = ?,   
            category = ?  
        WHERE id = ?
        `,
        [
            title,
            memo,
            deadline_date,
            deadline_time,
            quadrant,
            difficulty || "보통",
            is_completed ? 1 : 0,
            status || "진행 전", 
            category || "개인",  
            taskId,
        ],
        function (err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message,
                });
            } 
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

    const taskId = req.params.id;

    const {
        user_id,
        quadrant
    } = req.body;

    db.run(
        `
        UPDATE tasks
        SET
            quadrant = ?
        WHERE id = ?
        `,
        [
            quadrant,
            taskId
        ],
        function(err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
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
                        moved: this.changes
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

module.exports = router;