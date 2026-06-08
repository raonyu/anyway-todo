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

module.exports = router;