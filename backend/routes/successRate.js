const express = require("express");
const db = require("../database");

const {
    getAppDate
} = require("../utils/date");

const router = express.Router();

function parseDeadlineDate(deadlineDate) {

    if (!deadlineDate) {
        return null;
    }

    const match = deadlineDate.match(
        /(\d+)\.\s*(\d+)\.\s*(\d+)\./
    );

    if (!match) {
        return null;
    }

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
    );
}

function parseAppDate(appDate) {

    if (!appDate) {
        return null;
    }

    const parts =
        appDate.split("-");

    if (parts.length !== 3) {
        return null;
    }

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );
}

function getDaysBetween(startDate, endDate) {

    if (!startDate || !endDate) {
        return null;
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return Math.floor(
        (endDate - startDate) /
        (1000 * 60 * 60 * 24)
    );
}

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
                AND category = ?
                AND quadrant = ?
                AND created_at IS NOT NULL
                AND deadline_date IS NOT NULL
                `,
                [
                    targetTask.user_id,
                    taskId,
                    targetTask.category,
                    targetTask.quadrant
                ],
                (historyErr, historyTasks) => {

                    if (historyErr) {
                        return res.status(500).json({
                            success: false,
                            message: historyErr.message
                        });
                    }

                    const comparableTasks =
                        historyTasks.filter(task => {

                            const createdDate =
                                parseAppDate(task.created_at);

                            const deadlineDate =
                                parseDeadlineDate(task.deadline_date);

                            const leadDays =
                                getDaysBetween(
                                    createdDate,
                                    deadlineDate
                                );

                            if (leadDays === null) {
                                return false;
                            }

                            return Math.abs(
                                leadDays - targetLeadDays
                            ) <= 3;
                        });

                    if (comparableTasks.length < 5) {
                        return res.json({
                            success: true,
                            status: "수집중...",
                            success_message: "과거 데이터가 부족해요!",
                            sample_count: comparableTasks.length,
                            required_count: 5
                        });
                    }

                    const successCount =
                        comparableTasks.filter(
                            task => isTaskSuccessful(task)
                        ).length;

                    const successRate =
                        Math.round(
                            (successCount / comparableTasks.length) * 100
                        );

                    const successRateMessage =
                        getSuccessRateMessage(successRate);

                    res.json({
                        success: true,
                        status: "calculated",
                        success_rate: successRate,
                        success_message: successRateMessage,
                        success_count: successCount,
                        total_count: comparableTasks.length,
                        category: targetTask.category,
                        quadrant: targetTask.quadrant,
                        lead_days: targetLeadDays
                    });
                }
            );
        }
    );
});

module.exports = router;