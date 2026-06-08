const express = require("express");
const db = require("../database");

const router = express.Router();

/*
====================================
오늘 컨디션 저장
POST /condition
====================================
*/
router.post("/condition", (req, res) => {

    const {
        user_id,
        condition
    } = req.body;

    const allowedConditions = [
    "교수님도 이겨",
    "출석만 함",
    "휴학마려움"
    ];

    const finalCondition =
        condition || "출석만 함";

    if (!allowedConditions.includes(finalCondition)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 컨디션 값입니다."
        });
    }

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    db.run(
        `
        UPDATE users
        SET
            today_condition = ?,
            today_condition_date = ?
        WHERE id = ?
        `,
        [
            finalCondition,
            today,
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
                condition: finalCondition,
                date: today
            });
        }
    );
});

/*
====================================
오늘 컨디션 입력 필요 여부
GET /condition/check
====================================
*/
router.get("/condition/check", (req, res) => {

    const userId =
        req.query.user_id;

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    db.get(
        `
        SELECT
            today_condition,
            today_condition_date
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

            const needCondition =
                user.today_condition_date !== today;

            res.json({
                success: true,
                need_condition: needCondition,
                today_condition:
                    needCondition
                        ? null
                        : user.today_condition
            });
        }
    );
});

module.exports = router;