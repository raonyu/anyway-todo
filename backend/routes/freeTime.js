const express = require("express");
const db = require("../database");

const {
    getAppDate,
    getNextDate
} = require("../utils/date");

const {
    getRecommendationThreshold
} = require("./recommendations");

const router = express.Router();

const DAY_START_MINUTES =
    7 * 60;

const DAY_END_MINUTES =
    26 * 60;

function timeToMinutes(time) {

    if (!time) {
        return null;
    }

    const parts =
        time.split(":");

    if (parts.length !== 2) {
        return null;
    }

    const hours =
        Number(parts[0]);

    const minutes =
        Number(parts[1]);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {
        return null;
    }

    return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {

    const normalizedMinutes =
        totalMinutes % (24 * 60);

    const hours =
        Math.floor(normalizedMinutes / 60);

    const minutes =
        normalizedMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildBusyBlocks(schedules) {

    return schedules
        .map(schedule => {

            let startMinutes =
                timeToMinutes(schedule.start_time);

            let endMinutes =
                timeToMinutes(schedule.end_time);

            if (
                startMinutes === null ||
                endMinutes === null
            ) {
                return null;
            }

            if (schedule.is_next_day_early) {
                if (startMinutes < DAY_START_MINUTES) {
                    startMinutes += 24 * 60;
                }

                if (endMinutes <= DAY_START_MINUTES) {
                    endMinutes += 24 * 60;
                }
            }

            if (endMinutes <= startMinutes) {
                endMinutes += 24 * 60;
            }

            if (
                endMinutes <= DAY_START_MINUTES ||
                startMinutes >= DAY_END_MINUTES
            ) {
                return null;
            }

            startMinutes =
                Math.max(startMinutes, DAY_START_MINUTES);

            endMinutes =
                Math.min(endMinutes, DAY_END_MINUTES);

            if (endMinutes <= startMinutes) {
                return null;
            }

            return {
                schedule_id: schedule.id,
                title: schedule.title,
                start_time: minutesToTime(startMinutes),
                end_time: minutesToTime(endMinutes),
                start_minutes: startMinutes,
                end_minutes: endMinutes
            };
        })
        .filter(block => block !== null);
}

function mergeBusyBlocks(blocks) {

    if (blocks.length === 0) {
        return [];
    }

    const sortedBlocks =
        blocks
            .slice()
            .sort((a, b) => a.start_minutes - b.start_minutes);

    const merged =
        [sortedBlocks[0]];

    for (let i = 1; i < sortedBlocks.length; i++) {

        const current =
            sortedBlocks[i];

        const last =
            merged[merged.length - 1];

        if (current.start_minutes <= last.end_minutes) {

            last.end_minutes =
                Math.max(
                    last.end_minutes,
                    current.end_minutes
                );

            last.end_time =
                minutesToTime(last.end_minutes);

        } else {
            merged.push(current);
        }
    }

    return merged;
}

function calculateFreeBlocks(busyBlocks) {

    const freeBlocks = [];

    let cursor =
        DAY_START_MINUTES;

    busyBlocks.forEach(block => {

        if (block.start_minutes > cursor) {
            freeBlocks.push({
                start_time: minutesToTime(cursor),
                end_time: minutesToTime(block.start_minutes),
                start_minutes: cursor,
                end_minutes: block.start_minutes,
                minutes: block.start_minutes - cursor
            });
        }

        cursor =
            Math.max(
                cursor,
                block.end_minutes
            );
    });

    if (cursor < DAY_END_MINUTES) {
        freeBlocks.push({
            start_time: minutesToTime(cursor),
            end_time: minutesToTime(DAY_END_MINUTES),
            start_minutes: cursor,
            end_minutes: DAY_END_MINUTES,
            minutes: DAY_END_MINUTES - cursor
        });
    }

    return freeBlocks;
}

function getFreeBlocks(userId, date, callback) {

    const nextDate =
        getNextDate(date);

    if (!nextDate) {
        return callback(
            new Error("올바르지 않은 date 형식입니다.")
        );
    }

    db.all(
        `
        SELECT *
        FROM schedules
        WHERE user_id = ?
        AND (
            (
                schedule_date = ?
                OR end_time > '07:00'
                OR end_time <= start_time
            )
            OR (
                schedule_date = ?
                AND start_time < '02:00'
            )
        )
        ORDER BY schedule_date ASC, start_time ASC
        `,
        [
            userId,
            date,
            nextDate
        ],
        (err, schedules) => {

            if (err) {
                return callback(err);
            }

            const normalizedSchedules =
                schedules.map(schedule => {

                    if (schedule.schedule_date === nextDate) {
                        return {
                            ...schedule,
                            is_next_day_early: true
                        };
                    }

                    return {
                        ...schedule,
                        is_next_day_early: false
                    };
                });

            const busyBlocks =
                buildBusyBlocks(normalizedSchedules);

            const mergedBusyBlocks =
                mergeBusyBlocks(busyBlocks);

            const freeBlocks =
                calculateFreeBlocks(mergedBusyBlocks);

            callback(null, {
                schedules: normalizedSchedules,
                busyBlocks: mergedBusyBlocks,
                freeBlocks
            });
        }
    );
}

/*
====================================
빈 시간 조회
GET /free-time?user_id=1&date=2026-06-10
date 생략 시 getAppDate() 기준
====================================
*/
router.get("/free-time", (req, res) => {

    const userId =
        req.query.user_id;

    const date =
        req.query.date || getAppDate();

    const category =
        req.query.category;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    getFreeBlocks(
        userId,
        date,
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                user_id: Number(userId),
                date,
                day_start: "07:00",
                day_end: "02:00",
                schedule_count: result.schedules.length,
                free_blocks:
                    result.freeBlocks.map(block => ({
                        start_time: block.start_time,
                        end_time: block.end_time,
                        minutes: block.minutes
                    }))
            });
        }
    );
});

/*
====================================
빈 시간 할일 추천
GET /free-time/recommendations?user_id=1&date=2026-06-10
date 생략 시 getAppDate() 기준
====================================
*/
router.get("/free-time/recommendations", (req, res) => {

    const userId =
        req.query.user_id;

    const date =
        req.query.date || getAppDate();

    const category =
        req.query.category;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "user_id가 필요합니다."
        });
    }

    getFreeBlocks(
        userId,
        date,

        (freeTimeErr, result) => {

            if (freeTimeErr) {
                return res.status(500).json({
                    success: false,
                    message: freeTimeErr.message
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

                    let taskSql = `
                        SELECT *
                        FROM tasks
                        WHERE user_id = ?
                        AND is_completed = 0
                        AND recommendation_score >= ?
                    `;

                    const taskParams = [
                        userId,
                        threshold
                    ];

                    if (category) {
                        taskSql += `
                        AND category = ?
                        `;

                        taskParams.push(category);
                    }

                    taskSql += `
                        ORDER BY recommendation_score DESC, id DESC
                        LIMIT 3
                    `;

                    db.all(
                        taskSql,
                        taskParams,
                        (taskErr, tasks) => {
                            if (taskErr) {
                                return res.status(500).json({
                                    success: false,
                                    message: taskErr.message
                                });
                            }

                            if (tasks.length === 0) {
                                return res.json({
                                    success: true,
                                    date,
                                    category: category || "전체",
                                    message: category
                                        ? "이 카테고리에는 추천할 일이 없어요."
                                        : "오늘은 추천할 만한 일이 없어요.",
                                    items: []
                                });
                            }

                            const availableFreeBlocks =
                                result.freeBlocks.map(block => ({
                                    ...block,
                                    current_minutes: block.start_minutes,
                                    remaining_minutes: block.minutes
                                }));

                            const items = [];

                            tasks.forEach(task => {

                                const estimatedMinutes =
                                    task.estimated_minutes || 60;

                                const matchedBlock =
                                    availableFreeBlocks.find(block =>
                                        block.remaining_minutes >= estimatedMinutes
                                    );

                                if (!matchedBlock) {
                                    return;
                                }

                                const startMinutes =
                                    matchedBlock.current_minutes;

                                const endMinutes =
                                    startMinutes + estimatedMinutes;

                                items.push({
                                    task_id: task.id,
                                    title: task.title,
                                    category: task.category,
                                    start_time: minutesToTime(startMinutes),
                                    end_time: minutesToTime(endMinutes),
                                    estimated_time_level:
                                        task.estimated_time_level || "보통",
                                    estimated_minutes: estimatedMinutes,
                                    recommendation_score:
                                        task.recommendation_score || 0
                                });

                                matchedBlock.current_minutes =
                                    endMinutes;

                                matchedBlock.remaining_minutes =
                                    matchedBlock.end_minutes - matchedBlock.current_minutes;
                            });

                            if (items.length === 0) {
                                return res.json({
                                    success: true,
                                    date,
                                    category: category || "전체",
                                    message: "추천할 일을 넣을 만한 빈 시간이 없어요.",
                                    items: []
                                });
                            }

                            res.json({
                                success: true,
                                date,
                                category: category || "전체",
                                message: "이 시간에 하면 될 것 같아요!",
                                items
                            });
                        }
                    );
                }
            );
        }
    );
});

module.exports = router;