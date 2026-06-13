const express = require("express");
const db = require("../database");
const { getAppDate } = require("../utils/date"); // 날짜 유틸 가져오기
const router = express.Router();

function parseAppDate(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d+)\.\s*(\d+)\.\s*(\d+)\./);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function getDeadlineScore(deadlineDate) {
    if (!deadlineDate) return 5; 
    const target = parseAppDate(deadlineDate);
    if (!target) return 5;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 50; 
    if (diffDays === 0) return 40;
    if (diffDays === 1) return 30;
    if (diffDays <= 3) return 20;  
    if (diffDays <= 7) return 10;  
    return 5; 
}

function getQuadrantScore(quadrant) {
    switch (quadrant) {
        case "당장 해": return 40;
        case "그래도 해": return 30;
        case "해치워": return 20;
        case "나중에 해": return 10;
        default: return 0;
    }
}

function getConditionBonus(condition, quadrant) {
    if (condition === "침대에게 승리") {
        if (quadrant === "당장 해" || quadrant === "그래도 해") return 20;
        return 5;
    } else if (condition === "침대에게 패배") {
        if (quadrant === "해치워") return 20;
        return 0; 
    } else {
        return 10; 
    }
}

function generateRecommendations(userId, callback) {
    let today;
    try {
        today = getAppDate();
    } catch(e) {
        const now = new Date();
        today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // 💡 1. 핵심 픽스: "오늘 이미 완료한 추천 할 일"은 도장을 뺏지 않고 유지시킵니다! (화면에서 안 사라지게)
    db.run(
        `UPDATE tasks SET recommended_today = 0 WHERE user_id = ? AND (is_completed = 0 OR completed_date != ?)`, 
        [userId, today], 
        (resetErr) => {
            if (resetErr) return callback(resetErr);

            // 2. 오늘 완료되어서 살아남은 추천 태스크들을 먼저 가져옵니다.
            db.all(
                `SELECT * FROM tasks WHERE user_id = ? AND recommended_today = 1 AND is_completed = 1`, 
                [userId], 
                (err, completedRecs) => {
                    const keptTasks = completedRecs || [];
                    const neededCount = 3 - keptTasks.length; // 3개 중 빈자리만 계산

                    // 이미 3개를 다 완료했다면 더 추천할 필요 없이 그대로 반환
                    if (neededCount <= 0) {
                        return callback(null, { tasks: keptTasks, rest_day: false });
                    }

                    // 3. 유저 컨디션 가져오기
                    db.get(`SELECT today_condition FROM users WHERE id = ?`, [userId], (userErr, user) => {
                        const condition = (user && user.today_condition) ? user.today_condition : "침대와 협상 중";

                        // 4. 빈자리를 채울 '아직 완료 안 된' 태스크들 긁어오기
                        db.all(`SELECT * FROM tasks WHERE user_id = ? AND is_completed = 0`, [userId], (taskErr, tasks) => {
                            if (!tasks || tasks.length === 0) {
                                return callback(null, { tasks: keptTasks, rest_day: keptTasks.length === 0 });
                            }

                            // 점수 계산
                            const scoredTasks = tasks.map(task => {
                                const dScore = getDeadlineScore(task.deadline_date);
                                const qScore = getQuadrantScore(task.quadrant);
                                const cBonus = getConditionBonus(condition, task.quadrant);
                                return { ...task, recommendation_score: dScore + qScore + cBonus };
                            });

                            // 점수순 정렬 후 필요한 개수(빈자리)만큼만 자르기
                            scoredTasks.sort((a, b) => b.recommendation_score - a.recommendation_score);
                            const topTasks = scoredTasks.slice(0, neededCount);

                            if (topTasks.length > 0) {
                                const taskIds = topTasks.map(t => t.id).join(",");
                                // 새로 뽑힌 애들한테 도장 찍어주기
                                db.run(`UPDATE tasks SET recommended_today = 1 WHERE id IN (${taskIds})`, () => {
                                    // 기존 완료된 애들 + 새로 뽑힌 애들 합쳐서 반환
                                    const finalTasks = [...keptTasks, ...topTasks];
                                    callback(null, { tasks: finalTasks, rest_day: false });
                                });
                            } else {
                                callback(null, { tasks: keptTasks, rest_day: keptTasks.length === 0 });
                            }
                        });
                    });
                }
            );
        }
    );
}

/* 오늘의 추천 조회 */
router.get("/recommendations", (req, res) => {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ success: false, message: "user_id가 필요합니다." });

    generateRecommendations(userId, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(result.tasks || []);
    });
});

/* 수동 생성 API */
router.post("/recommendations/generate", (req, res) => {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ success: false });

    generateRecommendations(user_id, (err, result) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, count: result.tasks.length, tasks: result.tasks });
    });
});

module.exports = {
    router,
    generateRecommendations
};