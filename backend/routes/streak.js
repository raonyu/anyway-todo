const express = require("express");
const db = require("../database");
const { getAppDate } = require("../utils/date");
const router = express.Router();

/*
====================================
1. 유저 스트릭 정보 조회
GET /users/streak?user_id=1
====================================
*/
router.get("/users/streak", (req, res) => {
    const userId = req.query.user_id;

    db.get(`SELECT streak_count, shield_count, today_success, today_success_date, last_coupon_date FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ success: false });
        if (!user) return res.status(404).json({ success: false, message: "유저 없음" });

        // 프로토타입 데모용: 최초 가입 시 방어권이 0개라면 강제로 3개 부여하는 트리거
        if (user.shield_count === 0 && user.streak_count === 0 && !user.today_success_date) {
            db.run(`UPDATE users SET shield_count = 3 WHERE id = ?`, [userId]);
            user.shield_count = 3;
        }

        // 2주 회생 쿠폰 발급 가능 여부 계산 (현재 방어권 0개이고, 마지막 쿠폰 발급일로부터 14일 지났는지)
        let couponAvailable = false;
        if (user.shield_count === 0) {
            if (!user.last_coupon_date) {
                couponAvailable = true; // 쿠폰 받은 적 없으면 즉시 발급 가능
            } else {
                const lastCoupon = new Date(user.last_coupon_date);
                const now = new Date();
                const diffTime = Math.abs(now - lastCoupon);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 14) couponAvailable = true;
            }
        }

        res.json({
            success: true,
            streak_count: user.streak_count,
            shield_count: user.shield_count,
            today_success: user.today_success,
            coupon_available: couponAvailable
        });
    });
});

/*
====================================
2. 스트릭 마감 체크 (날짜 변경 시 호출)
POST /users/check-streak
====================================
*/
router.post("/users/check-streak", (req, res) => {
    const { user_id, is_rest_day } = req.body;
    const today = getAppDate();

    db.get(`SELECT * FROM users WHERE id = ?`, [user_id], (err, user) => {
        if (err || !user) return res.status(500).json({ success: false });

        // 만약 오늘 이미 체크를 완료했다면 패스
        if (user.last_streak_check_date === today) {
            return res.json({ success: true, needs_shield: false });
        }

        // 어제 할 일을 안 채웠고, 어제가 휴식일도 아니었다면 -> 방어권 사용 팝업 필요!
        if (user.today_success === 0 && !is_rest_day && user.streak_count > 0) {
            // 오늘 날짜로 체크 마킹은 하되, 쉴드를 쓸지 물어보라고 프론트에 알림
            db.run(`UPDATE users SET last_streak_check_date = ? WHERE id = ?`, [today, user_id]);
            return res.json({ success: true, needs_shield: true });
        }

        // 정상 유지 혹은 휴식일인 경우: 안전하게 다음 날로 상태 전송 및 오늘 서공 여부 초기화
        db.run(`UPDATE users SET today_success = 0, last_streak_check_date = ? WHERE id = ?`, [today, user_id]);
        res.json({ success: true, needs_shield: false });
    });
});

/*
====================================
3. 방어권 사용 여부 결정 처리
POST /users/use-shield
====================================
*/
router.post("/users/use-shield", (req, res) => {
    const { user_id, use_shield } = req.body;

    db.get(`SELECT shield_count FROM users WHERE id = ?`, [user_id], (err, user) => {
        if (err || !user) return res.status(500).json({ success: false });

        if (use_shield && user.shield_count > 0) {
            // 방어권 차감, 스트릭 유지
            db.run(`UPDATE users SET shield_count = shield_count - 1 WHERE id = ?`, [user_id], () => {
                res.json({ success: true, message: "방어 완료!" });
            });
        } else {
            // 방어권을 안 쓰거나 없으면 스트릭 0회 초기화
            db.run(`UPDATE users SET streak_count = 0 WHERE id = ?`, [user_id], () => {
                res.json({ success: true, message: "스트릭 리셋 완료" });
            });
        }
    });
});

/*
====================================
4. 2주 무료 회생 쿠폰 수령
POST /users/claim-coupon
====================================
*/
router.post("/users/claim-coupon", (req, res) => {
    const { user_id } = req.body;
    const today = getAppDate();

    db.run(`UPDATE users SET shield_count = 1, last_coupon_date = ? WHERE id = ?`, [today, user_id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

module.exports = router;