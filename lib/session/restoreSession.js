'use strict';

let getSessionCache = require('./getSessionCache').getSessionCache;
let decompressSessionData = require('./decompressSessionData').decompressSessionData;

/**
 * Purpose unknown
 *
 * @param {String} path - The app name.
 * @param {unknown} session unknown
 * @param {unknown} controllerTemplate unknown
 * @param {unknown} sessions unknown
 *
 * @returns {unknown} unknown
 */
function restoreSession(path, session, controllerTemplate, sessions) {

    let objectTemplate = controllerTemplate.objectTemplate;

    // Restore the controller from the session
    let controller;

    objectTemplate.withoutChangeTracking(function callBack() {
        let sessionData = getSessionCache(path, objectTemplate.controller.__sessionId, true, sessions);

        // Will return in exising controller object because createEmptyObject does so
        let unserialized = session.semotus.controllers[path];

        controller = objectTemplate.fromJSON(decompressSessionData(unserialized.controller),
            controllerTemplate);

        if (unserialized.serializationTimeStamp !== sessionData.serializationTimeStamp) {
            objectTemplate.logger.error({
                component: 'amorphic',
                module: 'getController',
                activity: 'restore',
                savedAs: sessionData.serializationTimeStamp,
                foundToBe: unserialized.serializationTimeStamp
            }, 'Session data not as saved');
        }

        if (session.semotus.objectMap && session.semotus.objectMap[path]) {
            objectTemplate.objectMap = session.semotus.objectMap[path];
        }

        objectTemplate.logger.info({component: 'amorphic', module: 'restoreSession', activity: 'restoring'});
        objectTemplate.syncSession();  // Clean tracking of changes
    });

    return controller;
}

module.exports = {
    restoreSession: restoreSession
};
