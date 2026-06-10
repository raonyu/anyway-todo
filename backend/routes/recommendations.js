const express = require("express");
const db = require("../database");

//date.js 호출
const {
    getAppDate,
    parseAppDate
} = require("../utils/date");

const {
    QUADRANT_SCORE,
    CONDITION_THRESHOLD
} = require("../utils/constants");

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

    const today =
        parseAppDate(getAppDate());

    if (!today) {
        return 0;
    }

    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffDays =
        Math.floor(
            (target - today) /
            (1000 * 60 * 60 * 24)
        );

    if (diffDays <= 0) return 40;
    if (diffDays === 1) return 30;
    if (diffDays >= 2 && diffDays <= 5) {
        return 20;
    }
    if (diffDays >=6 && diffDays <= 14) {
        return 10;
    }

    return 0;
}

function getRecommendationThreshold(condition) {
    return CONDITION_THRESHOLD[condition] || 50;
}

function generateRecommendations(userId, callback) {

    db.run(
        `
        UPDATE tasks
        SET
            recommended_today = 0,
            recommendation_score = 0
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

                    const threshold =
                        getRecommendationThreshold(currentCondition);

                    db.all(
                        `
                        SELECT *
                        FROM tasks
                        WHERE user_id = ?
                        AND is_completed = 0
                        `,
                        [userId],
                        (taskErr, tasks) => {

                            if (taskErr) {
                                return callback(taskErr);
                            };

                            const scoredTasks =
                                tasks
                                    .map(task => {

                                        const score =
                                            getDeadlineUrgency(task.deadline_date)
                                            + (QUADRANT_SCORE[task.quadrant] || 0);

                                        return {
                                            ...task,
                                            recommendation_score: score
                                        };
                                    })
                                    .sort((a, b) =>
                                        b.recommendation_score - a.recommendation_score
                                    );

                            const recommendedCandidates =
                                scoredTasks.filter(task =>
                                    task.recommendation_score >= threshold
                                );

                            const topTasks =
                                recommendedCandidates.slice(0, 3);

                            if (scoredTasks.length === 0) {
                                return callback(null, {
                                    tasks: [],
                                    rest_day: true,
                                    message: "오늘은 추천할 만한 급한 일이 없네요! 푹 쉬세요 ☕"
                                });
                            }

                            let remainingScoreUpdates =
                                scoredTasks.length;

                            scoredTasks.forEach(task => {

                                db.run(
                                    `
                                    UPDATE tasks
                                    SET
                                        recommendation_score = ?
                                    WHERE id = ?
                                    `,
                                    [
                                        task.recommendation_score,
                                        task.id
                                    ],
                                    (scoreUpdateErr) => {

                                        if (scoreUpdateErr) {
                                            return callback(scoreUpdateErr);
                                        }

                                        remainingScoreUpdates--;

                                        if (remainingScoreUpdates !== 0) {
                                            return;
                                        }

                                        if (topTasks.length === 0) {
                                            return callback(null, {
                                                tasks: [],
                                                rest_day: true,
                                                message: "오늘은 추천할 만한 급한 일이 없네요! 푹 쉬세요 ☕"
                                            });
                                        }

                                        let remainingTopUpdates =
                                            topTasks.length;

                                        topTasks.forEach(topTask => {

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
                                                    topTask.id
                                                ],
                                                (topUpdateErr) => {

                                                    if (topUpdateErr) {
                                                        return callback(topUpdateErr);
                                                    }

                                                    remainingTopUpdates--;

                                                    if (remainingTopUpdates === 0) {
                                                        callback(null, {
                                                            tasks: topTasks,
                                                            rest_day: false,
                                                            message: null
                                                        });
                                                    }
                                                }
                                            );
                                        });
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

            const currentCondition =
                user.today_condition || "침대와 협상 중";

            const threshold =
                getRecommendationThreshold(currentCondition);

            let sql = `
                SELECT *
                FROM tasks
                WHERE user_id = ?
                AND is_completed = 0
                AND recommendation_score >= ?
            `;

            const params = [
                userId,
                threshold
            ];

            if (category) {
                sql += `
                AND category = ?
                `;

                params.push(category);
            }

            sql += `
                ORDER BY recommendation_score DESC, id DESC
                LIMIT 3
            `;

            db.all(
                sql,
                params,
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

    const { user_id } =
        req.body || {};

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
    generateRecommendations,
    getRecommendationThreshold
};