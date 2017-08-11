'use strict';

let getSessionCache = require('./getSessionCache').getSessionCache;
let getObjectTemplate = require('../utils/getObjectTemplate');
let compressSessionData = require('./compressSessionData').compressSessionData;

/**
 * Purpose unknown
 *
 * @param {String} path - The app name.
 * @param {unknown} session unknown
 * @param {unknown} controller unknown
 * @param {Object} req - Connect request object.
 * @param {unknown} sessions unknown
 */
function saveSession(path, session, controller, req, sessions) {
    let request = controller.__request;
    controller.__request = null;

    let time = process.hrtime();

    let ourObjectTemplate = getObjectTemplate(controller);

    let serialSession;

    if (typeof(ourObjectTemplate.serializeAndGarbageCollect) === 'function') {
        serialSession = ourObjectTemplate.serializeAndGarbageCollect();
    }
    else {
        serialSession = controller.toJSONString();
    }

    // Track the time of the last serialization to make sure it is valid
    let sessionData = getSessionCache(path, ourObjectTemplate.controller.__sessionId, true, sessions);
    sessionData.serializationTimeStamp = (new Date ()).getTime();

    session.semotus.controllers[path] = {controller: compressSessionData(serialSession),
        serializationTimeStamp: sessionData.serializationTimeStamp};

    session.semotus.lastAccess = new Date(); // Tickle it to force out cookie

    if (ourObjectTemplate.objectMap) {
        if (!session.semotus.objectMap) {
            session.semotus.objectMap = {};
        }

        session.semotus.objectMap[path] = ourObjectTemplate.objectMap;
    }

    req.amorphicTracking.addServerTask(
        {
            name: 'Save Session',
            size: session.semotus.controllers[path].controller.length
        },
        time);

    controller.__request = request;
}

module.exports = {
    saveSession: saveSession
};
