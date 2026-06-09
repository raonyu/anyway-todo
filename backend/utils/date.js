function getAppDate() {
    const now = new Date();

    if (now.getHours() < 7) {
        now.setDate(now.getDate() - 1);
    }

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const date =
        String(now.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${date}`;
}

module.exports = {
    getAppDate
};