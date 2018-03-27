'use strict';

let getSessionCache = require('./getSessionCache').getSessionCache;
let getObjectTemplate = require('../utils/getObjectTemplate');
let decompressSessionData = require('./decompressSessionData').decompressSessionData;

/**
 * Purpose unknown
 *
 * @param {String} path - The app name.
 * @param {unknown} session unknown
 * @param {unknown} controller unknown
 * @param {unknown} sessions unknown
 *
 * @returns {unknown} unknown
 */
function restoreSession(path, session, controller, sessions) {
    let ourObjectTemplate = getObjectTemplate(controller);

    ourObjectTemplate.withoutChangeTracking(function callBack() {
        let sessionData = getSessionCache(path, ourObjectTemplate.controller.__sessionId, true, sessions);
        // Will return in exising controller object because createEmptyObject does so
        let unserialized = session.semotus.controllers[path];

        controller = ourObjectTemplate.fromJSON(
            decompressSessionData(unserialized.controller),
            controller.__template__
        );

        if (unserialized.serializationTimeStamp !== sessionData.serializationTimeStamp) {
            ourObjectTemplate.logger.error({
                component: 'amorphic',
                module: 'restoreSession',
                activity: 'restore',
                savedAs: sessionData.serializationTimeStamp,
                foundToBe: unserialized.serializationTimeStamp
            }, 'Session data not as saved');
        }

        if (session.semotus.objectMap && session.semotus.objectMap[path]) {
            ourObjectTemplate.objectMap = session.semotus.objectMap[path];
        }

        ourObjectTemplate.logger.info({component: 'amorphic', module: 'restoreSession', activity: 'restoring'});
        ourObjectTemplate.syncSession();  // Clean tracking of changes
    });

    return controller;
}

module.exports = {
    restoreSession: restoreSession
};
