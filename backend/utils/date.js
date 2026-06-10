function getAppDate() {
    const now = new Date();

    if (now.getHours() < 7) {
        now.setDate(now.getDate() - 1);
    }

    return formatAppDate(now);
}

function formatAppDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
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

function parseDeadlineDate(deadlineDate) {

    if (!deadlineDate) {
        return null;
    }

    const match =
        deadlineDate.match(/(\d+)\.\s*(\d+)\.\s*(\d+)\./);

    if (!match) {
        return null;
    }

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
    );
}

function getNextDate(appDate) {

    const date =
        parseAppDate(appDate);

    if (!date) {
        return null;
    }

    date.setDate(
        date.getDate() + 1
    );

    return formatAppDate(date);
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

module.exports = {
    getAppDate,
    formatAppDate,
    parseAppDate,
    parseDeadlineDate,
    getNextDate,
    getDaysBetween
};