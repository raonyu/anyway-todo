const express = require("express");
const db = require("../database");

//date.js 호출
const {
    getAppDate
} = require("../utils/date");

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

function getConditionScore(condition) {

    if (condition === "침대에게 승리") {
        return 10;
    }

    if (condition === "침대에게 패배") {
        return -10;
    }

    return 0;
}

function getRecommendationThreshold(condition) {

    if (condition === "침대에게 승리") {
        return 45;
    }

    if (condition === "침대에게 패배") {
        return 60;
    }

    return 50;
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

            db.get(
                `
                SELECT
                    today_condition
                FROM users
                WHERE id = ?
                `,
                [userId],
                (userErr, user) => {

                    if (userErr) {
                        return callback(userErr);
                    }

                    const currentCondition =
                        user && user.today_condition
                            ? user.today_condition
                            : "침대와 협상 중";

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

                            const threshold =
                                getRecommendationThreshold(currentCondition);

                            const scoredTasks =
                                tasks
                                    .map(task => {

                                        const score =
                                            getDeadlineUrgency(task.deadline_date)
                                            + (quadrantScore[task.quadrant] || 0)
                                            + getConditionScore(currentCondition);

                                        return {
                                            ...task,
                                            recommendation_score: score
                                        };
                                    })
                                    .filter(task =>
                                        task.recommendation_score >= threshold
                                    )
                                    .sort((a, b) =>
                                        b.recommendation_score - a.recommendation_score
                                    );

                            const topTasks =
                                scoredTasks.slice(0, 3);

                            let remaining =
                                topTasks.length;

                            if (remaining === 0) {
                                return callback(null, {
                                    tasks: [],
                                    rest_day: true,
                                    message: "오늘은 추천할 만한 급한 일이 없네요! 푹 쉬세요 ☕"
                                });
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
                                        getAppDate(),
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
                                                {
                                                    tasks: topTasks,
                                                    rest_day: false,
                                                    message: null
                                                }
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

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    generateRecommendations(
        user_id,
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                count: result.tasks.length,
                tasks: result.tasks,
                rest_day: result.rest_day,
                message: result.message
            });
        }
    );
});

module.exports = {
    router,
    generateRecommendations
};