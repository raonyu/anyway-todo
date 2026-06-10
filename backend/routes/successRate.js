const express = require("express");
const db = require("../database");

const {
    getAppDate,
    parseAppDate,
    parseDeadlineDate,
    getDaysBetween
} = require("../utils/date");

const router = express.Router();

function getSuccessRateMessage(successRate) {

    if (successRate >= 80) {
        return "넷플릭스 한 편 정도의 여유";
    }

    if (successRate >= 60) {
        return "커피 한 잔 정도의 여유";
    }

    if (successRate >= 30) {
        return "여유가 없어짐";
    }

    return "벼락치기 엔딩";
}

function isTaskSuccessful(task) {

    if (task.is_completed !== 1) {
        return false;
    }

    const completedDate =
        parseAppDate(task.completed_date);

    const deadlineDate =
        parseDeadlineDate(task.deadline_date);

    if (!completedDate || !deadlineDate) {
        return false;
    }

    return completedDate <= deadlineDate;
}

function getLeadDays(task) {

    const createdDate =
        parseAppDate(task.created_at);

    const deadlineDate =
        parseDeadlineDate(task.deadline_date);

    return getDaysBetween(
        createdDate,
        deadlineDate
    );
}

function filterByLeadDays(tasks, targetLeadDays, range) {

    return tasks.filter(task => {

        const leadDays =
            getLeadDays(task);

        if (leadDays === null) {
            return false;
        }

        return Math.abs(
            leadDays - targetLeadDays
        ) <= range;
    });
}

function calculateSuccessResult(comparableTasks) {

    const successCount =
        comparableTasks.filter(task =>
            isTaskSuccessful(task)
        ).length;

    const successRate =
        Math.round(
            (successCount / comparableTasks.length) * 100
        );

    return {
        successCount,
        successRate,
        successRateMessage:
            getSuccessRateMessage(successRate)
    };
}

/*
====================================
할일 성공률 조회
GET /tasks/:id/success-rate
====================================
*/
router.get("/tasks/:id/success-rate", (req, res) => {

    const taskId =
        req.params.id;

    db.get(
        `
        SELECT *
        FROM tasks
        WHERE id = ?
        `,
        [taskId],
        (targetErr, targetTask) => {

            if (targetErr) {
                return res.status(500).json({
                    success: false,
                    message: targetErr.message
                });
            }

            if (!targetTask) {
                return res.status(404).json({
                    success: false,
                    message: "할 일을 찾을 수 없습니다."
                });
            }

            const targetCreatedDate =
                parseAppDate(
                    targetTask.created_at || getAppDate()
                );

            const targetDeadlineDate =
                parseDeadlineDate(
                    targetTask.deadline_date
                );

            const targetLeadDays =
                getDaysBetween(
                    targetCreatedDate,
                    targetDeadlineDate
                );

            if (targetLeadDays === null) {
                return res.json({
                    success: true,
                    status: "수집중...",
                    message: "마감일 또는 생성일 데이터가 부족합니다."
                });
            }

            db.all(
                `
                SELECT *
                FROM tasks
                WHERE user_id = ?
                AND id != ?
                AND created_at IS NOT NULL
                AND deadline_date IS NOT NULL
                `,
                [
                    targetTask.user_id,
                    taskId
                ],
                (historyErr, historyTasks) => {

                    if (historyErr) {
                        return res.status(500).json({
                            success: false,
                            message: historyErr.message
                        });
                    }

                    const today =
                        parseAppDate(getAppDate());

                    const validHistoryTasks =
                        historyTasks.filter(task => {

                            if (task.is_completed === 1) {
                                return true;
                            }

                            const deadlineDate =
                                parseDeadlineDate(task.deadline_date);

                            if (!deadlineDate || !today) {
                                return false;
                            }

                            return deadlineDate < today;
                        });

                    const sameCategoryAndQuadrant =
                        validHistoryTasks.filter(task =>
                            task.category === targetTask.category &&
                            task.quadrant === targetTask.quadrant
                        );

                    const sameCategory =
                        validHistoryTasks.filter(task =>
                            task.category === targetTask.category
                        );

                    const step1 =
                        filterByLeadDays(
                            sameCategoryAndQuadrant,
                            targetLeadDays,
                            3
                        );

                    const step2 =
                        filterByLeadDays(
                            sameCategoryAndQuadrant,
                            targetLeadDays,
                            5
                        );

                    const step3 =
                        filterByLeadDays(
                            sameCategory,
                            targetLeadDays,
                            7
                        );

                    let comparableTasks = [];
                    let matchedLevel = "";

                    if (step1.length >= 5) {
                        comparableTasks = step1;
                        matchedLevel =
                            "같은 카테고리, 같은 중요도, 비슷한 시작 여유일 기준";
                    } else if (step2.length >= 5) {
                        comparableTasks = step2;
                        matchedLevel =
                            "같은 카테고리, 같은 중요도, 넓은 시작 여유일 기준";
                    } else if (step3.length >= 5) {
                        comparableTasks = step3;
                        matchedLevel =
                            "같은 카테고리, 비슷한 시작 여유일 기준";
                    }

                    if (comparableTasks.length < 5) {
                        return res.json({
                            success: true,
                            status: "수집중...",
                            success_message: "과거 데이터가 부족해요!",
                            sample_count: Math.max(
                                step1.length,
                                step2.length,
                                step3.length
                            ),
                            required_count: 5,
                            target_category: targetTask.category,
                            target_quadrant: targetTask.quadrant,
                            target_lead_days: targetLeadDays
                        });
                    }

                    const {
                        successCount,
                        successRate,
                        successRateMessage
                    } = calculateSuccessResult(comparableTasks);

                    res.json({
                        success: true,
                        status: "calculated",
                        success_rate: successRate,
                        success_message: successRateMessage,
                        success_count: successCount,
                        total_count: comparableTasks.length,
                        matched_level: matchedLevel,
                        category: targetTask.category,
                        quadrant: targetTask.quadrant,
                        lead_days: targetLeadDays,
                        explanation:
                            `비슷한 과거 할 일 ${comparableTasks.length}개 중 ${successCount}개를 마감 전에 완료했어요.`
                    });
                }
            );
        }
    );
});

module.exports = router;