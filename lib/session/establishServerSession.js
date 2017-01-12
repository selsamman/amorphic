'use strict';

let AmorphicContext = require('../AmorphicContext');
let getSessionCache = require('./getSessionCache').getSessionCache;
let establishInitialServerSession = require('./establishInitialServerSession').establishInitialServerSession;
let establishContinuedServerSession = require('./establishContinuedServerSession').establishContinuedServerSession;
let url = require('url');

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
 * @param {Object} req - Connect request object.
 * @param {String} path - The app name, used to identify future requests from XML.
 * @param {Boolean|String} newPage - force returning everything since this is likely a session continuation on a
 * new web page.
 * @param {unknown} reset - create new clean empty controller losing all data
 * @param {unknown} newControllerId - client is sending us data for a new controller that it has created
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 *
 * @returns {Promise<Object>} Promise that resolves to server session object.
 */
function establishServerSession(req, path, newPage, reset, newControllerId, sessions, controllers, nonObjTemplatelogLevel) {

    let applicationConfig = AmorphicContext.applicationConfig;

    // Retrieve configuration information
    let config = applicationConfig[path];

    if (!config) {
        throw new Error('Semotus: establishServerSession called with a path of ' + path + ' which was not registered');
    }

    let initObjectTemplate = config.initObjectTemplate;
    let controllerPath = config.appPath + '/' + (config.appConfig.controller || 'controller.js');
    let objectCacheExpiration = config.objectCacheExpiration;
    let sessionExpiration = config.sessionExpiration;
    let sessionStore = config.sessionStore;
    let appVersion = config.appVersion;
    let session = req.session;
    let sessionData = getSessionCache(path, req.session.id, false, sessions);

    if (newPage === 'initial') {

        sessionData.sequence = 1;

        // For a new page determine if a controller is to be omitted
        if (config.appConfig.createControllerFor && !session.semotus) {

            let referer = '';

            if (req.headers['referer']) {
                referer = url.parse(req.headers['referer'], true).path;
            }

            let createControllerFor = config.appConfig.createControllerFor;

            if (!referer.match(createControllerFor) && createControllerFor !== 'yes') {

                return establishInitialServerSession(req, controllerPath, initObjectTemplate, path,
                    appVersion, sessionExpiration);
            }
        }
    }

    return establishContinuedServerSession(req, controllerPath, initObjectTemplate, path, appVersion,
        sessionExpiration, session, sessionStore, newControllerId, objectCacheExpiration, newPage,
        controllers, nonObjTemplatelogLevel, sessions, reset);
}

module.exports = {
    establishServerSession: establishServerSession
};
