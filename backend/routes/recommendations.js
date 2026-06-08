const express = require("express");
const db = require("../database");

const router = express.Router();

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

/*
====================================
오늘의 추천 조회
GET /recommendations?user_id=1
====================================
*/
router.get("/recommendations", (req, res) => {

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
router.post("/recommendations/generate", (req, res) => {

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

module.exports = {
    router,
    generateRecommendations
};