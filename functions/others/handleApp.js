function handleProp(info, userId, prop, value) {
    if (!info[userId]) {
        info[userId] = {};
    }
    info[userId][prop] = value;
}

module.exports = { handleProp }