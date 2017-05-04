'use strict';

let AmorphicContext = require('../AmorphicContext');

/**
 * Manage a set of data keyed by the session id used for message sequence and serialization tracking
 *
 * @param {String} path - The app name.
 * @param {unknown} sessionId unknown
 * @param {unknown} keepTimeout unknown
 * @param {unknown} sessions unknown
 *
 * @returns {*|{sequence: number, serializationTimeStamp: null, timeout: null}}
 */
function getSessionCache(path, sessionId, keepTimeout, sessions) {
    let key = path + '-' + sessionId;
    let session = sessions[key] || {sequence: 1, serializationTimeStamp: null, timeout: null, semotus: {}};
    sessions[key] = session;

    if (!keepTimeout) {
        if (session.timeout) {
            clearTimeout(session.timeout);
        }

        session.timeout = setTimeout(function jj() {
            if (sessions[key]) {
                delete sessions[key];
            }
        }, AmorphicContext.amorphicOptions.sessionExpiration);
    }

    return session;
}

module.exports = {
    getSessionCache: getSessionCache
};
