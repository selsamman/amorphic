var getSessionCache = require('./getSessionCache').getSessionCache;
var decompressSessionData = require('./decompressSessionData').decompressSessionData;

/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 * @param {unknown} session unknown
 * @param {unknown} controllerTemplate unknown
 * @param {unknown} sessions unknown
 * @param {unknown} amorphicOptions unknown
 *
 * @returns {unknown} unknown
 */
function restoreSession(path, session, controllerTemplate, sessions, amorphicOptions) {

    var objectTemplate = controllerTemplate.objectTemplate;

    // Restore the controller from the session
    var controller;

    objectTemplate.withoutChangeTracking(function dd() {
        var sessionData = getSessionCache(path, objectTemplate.controller.__sessionId, true, sessions, amorphicOptions);

        // Will return in exising controller object because createEmptyObject does so
        var unserialized = session.semotus.controllers[path];
        controller = objectTemplate.fromJSON(decompressSessionData(unserialized.controller, amorphicOptions), controllerTemplate);

        if (unserialized.serializationTimeStamp != sessionData.serializationTimeStamp) {
            objectTemplate.logger.error({component: 'amorphic', module: 'getController', activity: 'restore',
                    savedAs: sessionData.serializationTimeStamp, foundToBe: unserialized.serializationTimeStamp},
                'Session data not as saved');
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
