const express = require("express");
const db = require("../database");

const router = express.Router();

const {
    ALLOWED_CATEGORIES,
    ALLOWED_QUADRANTS
} = require("../utils/constants");

/*
====================================
일정 추가
POST /schedules
====================================
*/
router.post("/schedules", (req, res) => {

    const {
        user_id,
        title,
        memo,
        schedule_date,
        start_time,
        end_time,
        category,
        quadrant
    } = req.body || {};

    const finalCategory =
        category || "개인";

    const finalQuadrant =
        quadrant || "나중에 해";

    if (!user_id || !title || !schedule_date || !start_time || !end_time) {
        return res.status(400).json({
            success: false,
            message: "user_id, title, schedule_date, start_time, end_time은 필수입니다."
        });
    }

    if (!ALLOWED_CATEGORIES.includes(finalCategory)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 카테고리 값입니다."
        });
    }

    if (!ALLOWED_QUADRANTS.includes(finalQuadrant)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 중요도 값입니다."
        });
    }

    db.run(
        `
        INSERT INTO schedules
        (
            user_id,
            title,
            memo,
            schedule_date,
            start_time,
            end_time,
            category,
            quadrant,
            is_completed
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
            user_id,
            title,
            memo,
            schedule_date,
            start_time,
            end_time,
            finalCategory,
            finalQuadrant
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
                schedule_id: this.lastID
            });
        }
    );
});

/*
====================================
일정 조회
GET /schedules?user_id=1
GET /schedules?user_id=1&date=2026-06-10
GET /schedules?user_id=1&category=개인
====================================
*/
router.get("/schedules", (req, res) => {

    const userId =
        req.query.user_id;

    const date =
        req.query.date;

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
        FROM schedules
        WHERE user_id = ?
    `;

    const params = [userId];

    if (date) {
        sql += `
        AND schedule_date = ?
        `;

        params.push(date);
    }

    if (category) {
        sql += `
        AND category = ?
        `;

        params.push(category);
    }

    sql += `
        ORDER BY schedule_date ASC, start_time ASC
    `;

    db.all(
        sql,
        params,
        (err, schedules) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                count: schedules.length,
                schedules
            });
        }
    );
});

/*
====================================
일정 수정
PUT /schedules/:id
====================================
*/
router.put("/schedules/:id", (req, res) => {

    const scheduleId =
        req.params.id;

    const {
        user_id,
        title,
        memo,
        schedule_date,
        start_time,
        end_time,
        category,
        quadrant,
        is_completed
    } = req.body || {};

    const finalCategory =
        category || "개인";

    const finalQuadrant =
        quadrant || "나중에 해";

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    if (!title || !schedule_date || !start_time || !end_time) {
        return res.status(400).json({
            success: false,
            message: "title, schedule_date, start_time, end_time은 필수입니다."
        });
    }

    if (!ALLOWED_CATEGORIES.includes(finalCategory)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 카테고리 값입니다."
        });
    }

    if (!ALLOWED_QUADRANTS.includes(finalQuadrant)) {
        return res.status(400).json({
            success: false,
            message: "올바르지 않은 중요도 값입니다."
        });
    }

    db.run(
        `
        UPDATE schedules
        SET
            title = ?,
            memo = ?,
            schedule_date = ?,
            start_time = ?,
            end_time = ?,
            category = ?,
            quadrant = ?,
            is_completed = ?
        WHERE id = ?
        AND user_id = ?
        `,
        [
            title,
            memo,
            schedule_date,
            start_time,
            end_time,
            finalCategory,
            finalQuadrant,
            is_completed ? 1 : 0,
            scheduleId,
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
                    message: "수정할 일정을 찾을 수 없습니다."
                });
            }

            res.json({
                success: true,
                updated: this.changes,
                schedule_id: Number(scheduleId)
            });
        }
    );
});

/*
====================================
일정 삭제
DELETE /schedules/:id
====================================
*/
router.delete("/schedules/:id", (req, res) => {

    const scheduleId =
        req.params.id;

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
        DELETE FROM schedules
        WHERE id = ?
        AND user_id = ?
        `,
        [
            scheduleId,
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
                    message: "삭제할 일정을 찾을 수 없습니다."
                });
            }

            res.json({
                success: true,
                deleted: this.changes,
                schedule_id: Number(scheduleId)
            });
        }
    );
});
module.exports = router;