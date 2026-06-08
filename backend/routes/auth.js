const express = require("express");
const db = require("../database");

const router = express.Router();

// 회원가입
router.post("/signup", (req, res) => {
    const { username, password } = req.body;

    db.run(
        `
        INSERT INTO users
        (
            username,
            password
        )
        VALUES (?, ?)
        `,
        [username, password],
        function(err) {

            if(err) {
                return res.status(400).json({
                    success:false,
                    message: "이미 존재하는 아이디입니다."
                });
            }

            res.json({
                success: true,
                message: "회원가입 완료"
            });
        }
    );
});

// 로그인
router.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get(
      `
      SELECT *
      FROM users
      WHERE username = ?
      AND password = ?
      `,
      [username, password],
      (err, user) => {

          if(err) {
            return res.status(500).json({
              success: false,
              message: err.message
            });
          }

          if (!user) {
            return res.json({
              success: false,
              message: "아이디 또는 비밀번호가 틀렸습니다."
            });
          }

            const today =
              new Date()
                    .toISOString()
                    .split("T")[0];

            const isNewDay =
              user.today_success_date &&
              user.today_success_date !== today;

            const wasSuccessfulBeforeReset =
              isNewDay &&
              user.today_success === 1;

            let shieldUsed = false;
            let streakFailed = false;

            if (isNewDay) {

              if (wasSuccessfulBeforeReset) {
                db.run(
                  `
                  UPDATE users
                  SET
                    today_success = 0,
                    today_success_date = ?,
                    last_streak_check_date = ?
                  WHERE id = ?
                  `,
                  [
                   today,
                    today,
                    user.id
                  ]
                );

              user.today_success = 0;
              user.today_success_date = today;
              user.last_streak_check_date = today;
            
            } else {
              db.run(
                `
                UPDATE users
                SET
                  today_success = 0,
                  today_success_date = ?
                WHERE id = ?
                `,
                [
                  today,
                  user.id
                ]
              );

              user.today_success = 0;
              user.today_success_date = today;
            }
          }

          const shouldCheckStreak =
            user.last_streak_check_date !== today;

          const shouldFailStreak =
            shouldCheckStreak &&
            user.streak_count > 0 &&
            user.today_success === 0 &&
            !wasSuccessfulBeforeReset;

          if (shouldFailStreak) {

            if (user.shield_count > 0) {

              db.run(
                `
                UPDATE users
                SET
                  shield_count = shield_count - 1,
                  last_streak_check_date = ?
                WHERE id = ?
                `,
                [today, user.id]
              );

              user.shield_count -= 1;
              shieldUsed = true;

            } else {

              db.run(
                `
                UPDATE users
                SET
                  streak_count = 0,
                  last_streak_check_date = ?
                WHERE id = ?
                `,
                [today, user.id]
              );

              user.streak_count = 0;
              streakFailed = true;
            }
          }

          db.run(
            `
            UPDATE users
            SET
              last_login_date = ?
            WHERE id = ?
            `,
            [
              today,
              user.id
            ]
          );

          res.json({
            success: true,

            shield_used: shieldUsed,
            streak_failed: streakFailed,

            user_id: user.id,
            username: user.username,

            streak_count: user.streak_count,
            best_streak: user.best_streak,
            shield_count: user.shield_count,

            message: "로그인 성공"
          });
        }

    );
});

module.exports = router;