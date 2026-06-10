const ALLOWED_CATEGORIES = [
    "학업",
    "개인",
    "성장"
];

const ALLOWED_QUADRANTS = [
    "당장 해",
    "그래도 해",
    "해치워",
    "나중에 해"
];

const ALLOWED_ESTIMATED_TIME_LEVELS = [
    "낮음",
    "보통",
    "높음"
];

const QUADRANT_SCORE = {
    "당장 해": 40,
    "그래도 해": 30,
    "해치워": 20,
    "나중에 해": 10
};

const ESTIMATED_MINUTES = {
    "높음": 120,
    "보통": 60,
    "낮음": 30
};

const CONDITION_THRESHOLD = {
    "침대에게 승리": 45,
    "침대와 협상 중": 50,
    "침대에게 패배": 60
};

function getEstimatedMinutes(estimatedTimeLevel) {
    return ESTIMATED_MINUTES[estimatedTimeLevel] || 60;
}

module.exports = {
    ALLOWED_CATEGORIES,
    ALLOWED_QUADRANTS,
    ALLOWED_ESTIMATED_TIME_LEVELS,
    QUADRANT_SCORE,
    ESTIMATED_MINUTES,
    CONDITION_THRESHOLD,
    getEstimatedMinutes
};