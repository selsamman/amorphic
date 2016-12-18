var getSessionCache = require('./getSessionCache').getSessionCache;
var compressSessionData = require('./compressSessionData').compressSessionData;

/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 * @param {unknown} session unknown
 * @param {unknown} controller unknown
 * @param {unknown} req unknown
 * @param {unknown} sessions unknown
 * @param {unknown} amorphicOptions unknown
 */
function saveSession(path, session, controller, req, sessions, amorphicOptions) {
    var request = controller.__request;
    controller.__request = null;

    var time = process.hrtime();

    var ourObjectTemplate = controller.__template__.objectTemplate;

    var serialSession;

    if (typeof(ourObjectTemplate.serializeAndGarbageCollect) == 'function') {
        serialSession = ourObjectTemplate.serializeAndGarbageCollect();
    }
    else {
        serialSession = controller.toJSONString();
    }

    // Track the time of the last serialization to make sure it is valid
    var sessionData = getSessionCache(path, ourObjectTemplate.controller.__sessionId, true, sessions, amorphicOptions);
    sessionData.serializationTimeStamp = (new Date ()).getTime();

    session.semotus.controllers[path] = {controller: compressSessionData(serialSession, amorphicOptions), serializationTimeStamp: sessionData.serializationTimeStamp};

    session.semotus.lastAccess = new Date(); // Tickle it to force out cookie

    if (ourObjectTemplate.objectMap) {
        if (!session.semotus.objectMap) {
            session.semotus.objectMap = {};
        }

        session.semotus.objectMap[path] = ourObjectTemplate.objectMap;
    }

    req.amorphicTracking.addServerTask({name: 'Save Session', size: session.semotus.controllers[path].controller.length}, time);

    controller.__request = request;
}

module.exports = {
    saveSession: saveSession
};
