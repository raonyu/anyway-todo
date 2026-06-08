const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const conditionRoutes = require("./routes/condition");
const taskRoutes = require("./routes/tasks");
const streakRoutes = require("./routes/streak");
const debugRoutes = require("./routes/debug");

const {
    router: recommendationRoutes
} = require("./routes/recommendations");



const app = express();
app.use(express.json());
app.use(cors());

//auth.js 연결
app.use(authRoutes);

//condition.js 연결
app.use(conditionRoutes);

//recommendations.js 연결
app.use(recommendationRoutes);

//tasks.js 연결
app.use(taskRoutes);

//streak.js 연결
app.use(streakRoutes);

//debug.js 연결
app.use(debugRoutes);

app.listen(3000, () => {
    console.log("서버 실행 중");
});