var getSessionCache = require('./getSessionCache').getSessionCache;
var establishInitialServerSession = require('./establishInitialServerSession').establishInitialServerSession;
var Utils = require('./utils');
var getLoggingContext = Utils.getLoggingContext;
var getController = require('./getController').getController;
var getServerConfigString = require('./getServerConfigString').getServerConfigString;
var saveSession = require('./saveSession').saveSession;
var restoreSession = require('./restoreSession').restoreSession;
var Q = require('q');
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
 * @param {unknown} applicationConfig unknown
 * @param {unknown} sessions unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} sendToLog unknown
 *
 * @returns {*}
 */
function establishServerSession(req, path, newPage, reset, newControllerId, applicationConfig, sessions, amorphicOptions, applicationSource, applicationSourceMap,
                                applicationPersistorProps, hostName, controllers, nonObjTemplatelogLevel, sendToLog) {
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
    var sessionData = getSessionCache(path, req.session.id, false, sessions, amorphicOptions);

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

                return establishInitialServerSession(req, config, controllerPath, initObjectTemplate, path, time, appVersion, sessionExpiration,
                    applicationPersistorProps, amorphicOptions, applicationSource, applicationSourceMap);
            }
        }
    }

    // Create or restore the controller
    var newSession = false;
    var controller;

    if (!session.semotus || !session.semotus.controllers[path] || reset || newControllerId) {
        newSession = !newControllerId;

        if (!session.semotus) {
            session.semotus = {controllers: {}, loggingContext: {}};
        }

        if (!session.semotus.loggingContext[path]) {
            session.semotus.loggingContext[path] = getLoggingContext(path, null, hostName);
        }

        controller = getController(path, controllerPath, initObjectTemplate, session, objectCacheExpiration, sessionStore, newPage, true, newControllerId, req, applicationConfig, controllers, nonObjTemplatelogLevel, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps, sessions, sendToLog);
        controller.__template__.objectTemplate.reqSession = req.session;
    }
    else {
        controller = getController(path, controllerPath, initObjectTemplate, session, objectCacheExpiration, sessionStore, newPage, false, null, req, applicationConfig, controllers, nonObjTemplatelogLevel, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps, sessions, sendToLog);
        controller.__template__.objectTemplate.reqSession = req.session;
    }

    req.amorphicTracking.addServerTask({name: 'Create Controller'}, time);

    controller.__request = req;
    controller.__sessionExpiration = sessionExpiration;

    var objectTemplate = controller.__template__.objectTemplate;

    var ret = {
        objectTemplate: controller.__template__.objectTemplate,

        getMessage: function gotMessage() {
            var message = objectTemplate.getMessage(session.id, true);

            message.newSession = true;
            message.rootId = controller.__id__;
            message.startingSequence = objectTemplate.maxClientSequence + 100000;
            message.sessionExpiration = sessionExpiration;

            return message;
        },

        getServerConnectString: function yelo() {
            var message = this.getMessage();

            message.ver = appVersion;

            return JSON.stringify({
                url: '/amorphic/xhr?path=' + path,
                message: message
            });
        },

        getServerConfigString: function yolo() {
            return getServerConfigString(config);
        },

        save: function surve(path, session, req) {
            saveSession(path, session, controller, req, sessions, amorphicOptions);
        },

        restoreSession: function rastaSess() {
            return restoreSession(path, session, controller.__template__, sessions, amorphicOptions);
        },

        newSession: newSession,
        appVersion: appVersion,

        getPersistorProps: function getPersistorProps() {
            if (objectTemplate.getPersistorProps) {
                return objectTemplate.getPersistorProps();
            }

            return {};
        }
    };

    if (newPage) {
        saveSession(path, session, controller, req, sessions, amorphicOptions);
    }

    return Q.fcall(function g() {
        return ret;
    });
}

module.exports = {
    establishServerSession: establishServerSession
};
