'use strict';

var AmorphicContext = require('./AmorphicContext');
var getSessionCache = require('./getSessionCache').getSessionCache;
var establishInitialServerSession = require('./establishInitialServerSession').establishInitialServerSession;
var establishContinuedServerSession = require('./establishContinuedServerSession').establishContinuedServerSession;
var url = require('url');

/**
 * Establish a server session

 * The entire session mechanism is predicated on the fact that there is a unique instance
 * of object templates for each session.  There are three main use cases:
 *
 * 1) newPage == true means the browser wants to get everything sent to it mostly because it is arriving on a new page
 *    or a refresh or recovery from an error (refresh)
 *
 * 2) reset == true - clear the current session and start fresh
 *
 * 3) newControllerID - if specified the browser has created a controller and will be sending the data to the server
 *
 * @param {unknown} req unknown
 * @param {unknown} path - used to identify future requests from XML
 * @param {unknown} newPage - force returning everything since this is likely a session continuation on a new web page
 * @param {unknown} reset - create new clean empty controller losing all data
 * @param {unknown} newControllerId - client is sending us data for a new controller that it has created
 * @param {unknown} sessions unknown
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} sendToLog unknown
 *
 * @returns {Promise<Object>} Promise that resolves to server session object.
 */
function establishServerSession(req, path, newPage, reset, newControllerId, sessions,
                                hostName, controllers, nonObjTemplatelogLevel, sendToLog) {

    var applicationConfig = AmorphicContext.applicationConfig;

    // Retrieve configuration information
    var config = applicationConfig[path];

    if (!config) {
        throw new Error('Semotus: establishServerSession called with a path of ' + path + ' which was not registered');
    }

    var initObjectTemplate = config.initObjectTemplate;
    var controllerPath = config.appPath + '/' + (config.appConfig.controller || 'controller.js');
    var objectCacheExpiration = config.objectCacheExpiration;
    var sessionExpiration = config.sessionExpiration;
    var sessionStore = config.sessionStore;
    var appVersion = config.appVersion;
    var session = req.session;
    var time = process.hrtime();
    var sessionData = getSessionCache(path, req.session.id, false, sessions);

    if (newPage === 'initial') {

        sessionData.sequence = 1;

        // For a new page determine if a controller is to be omitted
        if (config.appConfig.createControllerFor && !session.semotus) {

            var referer = '';

            if (req.headers['referer']) {
                referer = url.parse(req.headers['referer'], true).path;
            }

            var createControllerFor = config.appConfig.createControllerFor;

            if (!referer.match(createControllerFor) && createControllerFor != 'yes') {

                return establishInitialServerSession(req, controllerPath, initObjectTemplate, path, time,
                    appVersion, sessionExpiration);
            }
        }
    }

    return establishContinuedServerSession(req, controllerPath, initObjectTemplate, path, time, appVersion,
        sessionExpiration, session, sessionStore, newControllerId, hostName, objectCacheExpiration, newPage,
        controllers, nonObjTemplatelogLevel, sessions, sendToLog, reset);
}

module.exports = {
    establishServerSession: establishServerSession
};
