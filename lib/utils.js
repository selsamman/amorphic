// Logging for rare situations where we don't have an objectTemplate
/**
 * Purpose unknown
 *
 * @param {unknown} level unknown
 * @param {unknown} sessionId unknown
 * @param {unknown} data unknown
 * @param {unknown} logLevel unknown
 */
function log(level, sessionId, data,
  logLevel) {
    if (level > logLevel) {
        return;
    }

    var t = new Date();
    var time = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate() + ' ' + t.toTimeString().replace(/ .*/, '') + ':' + t.getMilliseconds();
    var message = (time + '(' + sessionId + ') ' + 'Semotus:' + data);

    logMessage(message);
}

/**
 * Writing a function to consolidate our logMessage statements so they can be easily replaced later
 *
 * @param {String} message A message to be printed to the console.
 */
function logMessage(message) {
    console.log(message);
}

module.exports = {
    log: log,
    logMessage: logMessage
};
