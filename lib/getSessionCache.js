/**
 * Manage a set of data keyed by the session id used for message sequence and serialization tracking
 *
 * @param {String} path unknown
 * @param {unknown} sessionId unknown
 * @param {unknown} keepTimeout unknown
 * @param {unknown} sessions unknown
 * @param {unknown} amorphicOptions unknown
 *
 * @returns {*|{sequence: number, serializationTimeStamp: null, timeout: null}}
 */
function getSessionCache(path, sessionId, keepTimeout,
                         sessions, amorphicOptions) {
    var key = path + '-' + sessionId;
    var session = sessions[key] || {sequence: 1, serializationTimeStamp: null, timeout: null};
    sessions[key] = session;

    if (!keepTimeout) {
        if (session.timeout) {
            clearTimeout(session.timeout);
        }

        setTimeout(function jj() {
            if (sessions[key]) {
                delete sessions[key];
            }
        }, amorphicOptions.sessionExpiration);
    }

    return session;
}

module.exports = {
    getSessionCache: getSessionCache
};
