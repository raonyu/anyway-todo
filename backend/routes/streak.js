const express = require("express");
const db = require("../database");

const router = express.Router();

/*
====================================
추천 할일 성공 판정
POST /streak/check-recommendation-success
====================================
*/
router.post(
    "/streak/check-recommendation-success",
    (req, res) => {

        const { user_id } = req.body || {};

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id가 필요합니다."
            });
        }

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

                const today =
                    new Date()
                        .toISOString()
                        .split("T")[0];

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
                    return res.json({
                        success: true,
                        already_processed: true
                    });
                }

                db.get(
                    `
                    SELECT *
                    FROM tasks
                    WHERE user_id = ?
                    AND recommended_date = ?
                    AND is_completed = 1
                    LIMIT 1
                    `,
                    [
                        user_id,
                        today
                    ],
                    (taskErr, task) => {

                        if (taskErr) {
                            return res.status(500).json({
                                success: false,
                                message: taskErr.message
                            });
                        }

                        if (!task) {
                            return res.json({
                                success: false,
                                completed: false
                            });
                        }

                        const nextStreak =
                            user.streak_count + 1;

                        let rewardShield = false;

                        if (
                            nextStreak % 7 === 0 &&
                            nextStreak >
                            user.last_shield_reward_streak
                        ) {
                            rewardShield = true;
                        }

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
                            
                            function(updateErr) {

                                if (updateErr) {
                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            updateErr.message
                                    });
                                }

                                if (this.changes === 0) {
                                    return req.status(404).json({
                                        success: false,
                                        message: "연속달성 정보를 업데이트할 사용자를 찾지 못했습니다."
                                    })
                                }

                                res.json({
                                    success: true,
                                    completed: true,
                                    reward_shield: rewardShield
                                });
                            }
                        );
                    }
                );
            }
        );
    }
);

module.exports = router;