'use strict';

var AmorphicContext = require('./AmorphicContext');
var Utils = require('./utils');
var getLoggingContext = Utils.getLoggingContext;
var getController = require('./getController').getController;
var getServerConfigString = require('./getServerConfigString').getServerConfigString;
var saveSession = require('./saveSession').saveSession;
var restoreSession = require('./restoreSession').restoreSession;
var Q = require('q');

/**
 * Continues an already establised session.
 *
 * @param {unknown} req unknown
 * @param {unknown} controllerPath unknown
 * @param {unknown} initObjectTemplate unknown
 * @param {unknown} path unknown
 * @param {unknown} time unknown
 * @param {unknown} appVersion unknown
 * @param {unknown} sessionExpiration unknown
 * @param {unknown} session unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} newControllerId unknown
 * @param {unknown} hostName unknown
 * @param {unknown} objectCacheExpiration unknown
 * @param {unknown} newPage unknown
 * @param {unknown} controllers unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} sessions unknown
 * @param {unknown} sendToLog unknown
 * @param {unknown} reset unknown
 *
 * @returns {Object} unknown
 */
function establishContinuedServerSession(req, controllerPath, initObjectTemplate, path, time, appVersion,
                                         sessionExpiration, session, sessionStore,
                                         newControllerId, hostName, objectCacheExpiration, newPage,
                                         controllers, nonObjTemplatelogLevel, sessions, sendToLog, reset) {

    var applicationConfig = AmorphicContext.applicationConfig;
    var config = applicationConfig[path];

    newControllerId = newControllerId || null;
    // Create or restore the controller
    var shouldReset = false;
    var newSession = false;
    var controller;
    var ret;

    if (!session.semotus || !session.semotus.controllers[path] || reset || newControllerId) {
        shouldReset = true;
        // TODO what is newSession, why do this?
        newSession = !newControllerId;

        if (!session.semotus) {
            session.semotus = getDefaultSemotus();
        }

        if (!session.semotus.loggingContext[path]) {
            session.semotus.loggingContext[path] = getLoggingContext(path, null, hostName);
        }
    }

    controller = getController(path, controllerPath, initObjectTemplate, session, objectCacheExpiration, sessionStore,
        newPage, shouldReset, newControllerId, req, controllers, nonObjTemplatelogLevel, sessions, sendToLog);

    controller.__template__.objectTemplate.reqSession = req.session;
    controller.__request = req;
    controller.__sessionExpiration = sessionExpiration;

    req.amorphicTracking.addServerTask({name: 'Create Controller'}, time);

    ret = {
        appVersion: appVersion,
        newSession: newSession,
        objectTemplate: controller.__template__.objectTemplate,

        getMessage: function gotMessage() {
            var message = this.objectTemplate.getMessage(session.id, true);

            // TODO Why is newSession always true here?
            message.newSession = true;
            message.rootId = controller.__id__;
            message.startingSequence = this.objectTemplate.maxClientSequence + 100000;
            message.sessionExpiration = sessionExpiration;
            message.ver = this.appVersion;

            return message;
        },

        getServerConnectString: function yelo() {
            return JSON.stringify({
                url: '/amorphic/xhr?path=' + path,
                message: this.getMessage()
            });
        },

        getServerConfigString: function yolo() {
            return getServerConfigString(config);
        },

        save: function surve(path, session, req) {
            saveSession(path, session, controller, req, sessions);
        },

        restoreSession: function rastaSess() {
            return restoreSession(path, session, controller.__template__, sessions);
        },

        getPersistorProps: function getPersistorProps() {
            if (this.objectTemplate.getPersistorProps) {
                return this.objectTemplate.getPersistorProps();
            }

            return {};
        }
    };

    if (newPage) {
        saveSession(path, session, controller, req, sessions);
    }

    return Q.fcall(function g() {
        return ret;
    });
}

function getDefaultSemotus() {
    return {
        controllers: {},
        loggingContext: {}
    };
}

module.exports = {
    establishContinuedServerSession: establishContinuedServerSession
};
