const express = require("express");
const db = require("../database");

const router = express.Router();

/*
====================================
테스트용 유저 수정
POST /debug/set-user
====================================
*/
router.post("/debug/set-user", (req, res) => {

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
router.post("/debug/set-login-state", (req, res) => {

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
router.get("/debug/user", (req, res) => {

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
router.delete("/debug/tasks", (req, res) => {

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

/*
====================================
성공률 테스트용 과거 할일 데이터 생성
POST /debug/success-rate-samples
====================================
*/
router.post("/debug/success-rate-samples", (req, res) => {

    const {
        user_id,
        category,
        quadrant
    } = req.body;

    const finalCategory =
        category || "학업";

    const finalQuadrant =
        quadrant || "나중에 해";

    const samples = [
        {
            title: "성공률 샘플 1",
            created_at: "2026-06-01",
            deadline_date: "2026. 6. 11.",
            completed_date: "2026-06-09",
            is_completed: 1
        },
        {
            title: "성공률 샘플 2",
            created_at: "2026-06-01",
            deadline_date: "2026. 6. 11.",
            completed_date: "2026-06-10",
            is_completed: 1
        },
        {
            title: "성공률 샘플 3",
            created_at: "2026-06-01",
            deadline_date: "2026. 6. 11.",
            completed_date: "2026-06-12",
            is_completed: 1
        },
        {
            title: "성공률 샘플 4",
            created_at: "2026-06-01",
            deadline_date: "2026. 6. 11.",
            completed_date: "2026-06-08",
            is_completed: 1
        },
        {
            title: "성공률 샘플 5",
            created_at: "2026-06-01",
            deadline_date: "2026. 6. 11.",
            completed_date: null,
            is_completed: 0
        }
    ];

    let remaining =
        samples.length;

    let responseSent =
        false;

    samples.forEach(sample => {

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
                created_at,
                completed_date,
                is_completed,
                recommended_today
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            `,
            [
                user_id,
                sample.title,
                "성공률 테스트용 데이터",
                sample.deadline_date,
                "12:00",
                finalQuadrant,
                finalCategory,
                sample.created_at,
                sample.completed_date,
                sample.is_completed
            ],
            (err) => {

                if (responseSent) {
                    return;
                }

                if (err) {
                    responseSent = true;

                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                remaining--;

                if (remaining === 0) {
                    responseSent = true;

                    res.json({
                        success: true,
                        inserted: samples.length,
                        category: finalCategory,
                        quadrant: finalQuadrant
                    });
                }
            }
        );
    });
});

module.exports = router;