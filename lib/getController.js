'use strict';

let AmorphicContext = require('./AmorphicContext');
let Logger = require('./utils/logger');
let log = Logger.log;
let setupLogger = Logger.setupLogger;
let persistor = require('persistor');
let semotus = require('semotus');
let getTemplates = require('./getTemplates').getTemplates;
let getSessionCache = require('./session/getSessionCache').getSessionCache;
let decompressSessionData = require('./session/decompressSessionData').decompressSessionData;

/**
 * Create a controller template that has a unique Semotus instance that is
 * for one unique session
 *
 * @param {unknown} path - unique path for application
 * @param {unknown} controllerPath - file path for controller objects
 * @param {unknown} initObjectTemplate - callback for dependency injection into controller
 * @param {unknown} connectSession - connect session object
 * @param {unknown} objectCacheExpiration - seconds to expire controller object cache
 * @param {unknown} sessionStore - session implementation
 * @param {Boolean|String} newPage - force returning everything since this is likely a session continuation on a
 * new web page.
 * @param {unknown} reset - create new clean empty controller losing all data
 * @param {unknown} controllerId - unknown
 * @param {Object} req - Connect request object.
 * @param {unknown} controllers unknown
 * @param {unknown} sessions unknown
 *
 * @returns {*}
 */
function getController(path, controllerPath, initObjectTemplate, connectSession, objectCacheExpiration, sessionStore,
                       newPage, reset, controllerId, req, controllers, nonObjTemplatelogLevel, sessions) {
    let applicationConfig = AmorphicContext.applicationConfig;
    let sessionId = connectSession.id;
    let config = applicationConfig[path];

    // Manage the controller cache
    if (!controllers[sessionId + path]) {
        controllers[sessionId + path] = {};
    }

    let cachedController = controllers[sessionId + path];

    // Clear controller from cache if need be
    if (reset || newPage) {
        if (cachedController.timeout) {
            clearTimeout(cachedController.timeout);
        }

        controllers[sessionId + path] = {};
        cachedController = controllers[sessionId + path];

        if (reset) { // Hard reset makes sure we create a new controller
            connectSession.semotus.controllers[path] = null;
        }
    }

    // We cache the controller object which will reference the object template and expire it
    // as long as there are no pending calls.  Note that with a memory store session manager
    // the act of referencing the session will expire it if needed
    let timeoutAction = function teamOutAction() {
        sessionStore.get(sessionId, function aa(_error, connectSession) {
            if (!connectSession) {
                log(1, sessionId, 'Session has expired', nonObjTemplatelogLevel);
            }

            if (!connectSession ||
                cachedController.controller.__template__.objectTemplate.getPendingCallCount() === 0) {
                controllers[sessionId + path] = null;
                log(1, sessionId, 'Expiring controller cache for ' + path, nonObjTemplatelogLevel);
            }
            else {
                cachedController.timeout = setTimeout(timeoutAction, objectCacheExpiration);
                log(2, sessionId, 'Extending controller cache timeout because of pending calls for ' + path,
 -                    nonObjTemplatelogLevel);
            }
        });
    };

    // Return controller from the cache if possible regenerating timeout
    if (cachedController.controller) {
        clearTimeout(cachedController.timeout);
        cachedController.timeout = setTimeout(timeoutAction, objectCacheExpiration);
        log(2, sessionId, 'Extending controller cache timeout because of reference ', nonObjTemplatelogLevel);

        return cachedController.controller;
    }

    let matches = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    let prefix = matches[1];
    let prop = matches[2];

    // Create a new unique object template utility
    let persistableSemotableTemplate = persistor(null, null, semotus);
    persistableSemotableTemplate.lazyTemplateLoad = config.appConfig.lazyTemplateLoad;

    if (config.appConfig.templateMode === 'typescript') {
        injectTemplatesIntoCurrentSession(require('../index.js').amorphicStatic, persistableSemotableTemplate);
    }

    setupLogger(persistableSemotableTemplate.logger, path, connectSession.semotus.loggingContext[path],
        applicationConfig);

    // Inject into it any db or persist attributes needed for application
    initObjectTemplate(persistableSemotableTemplate);

    // Restore any saved objectMap
    if (connectSession.semotus.objectMap && connectSession.semotus.objectMap[path]) {
        persistableSemotableTemplate.objectMap = connectSession.semotus.objectMap[path];
    }

    // Get the controller and all of it's dependent templates which will populate a
    // key value pairs where the key is the require prefix and and the value is the
    // key value pairs of each exported template
	let ControllerTemplate = AmorphicContext.applicationTSController[path] ||
		getTemplates(persistableSemotableTemplate, prefix, [prop + '.js'], config, path)[prop].Controller;

    if (!ControllerTemplate) {
        throw  new Error('Missing controller template in ' + prefix + prop + '.js');
    }

    ControllerTemplate.objectTemplate = persistableSemotableTemplate;

    // Setup unique object template to manage a session
    persistableSemotableTemplate.createSession('server', null, connectSession.id);

    let browser = ' - browser: ' + req.headers['user-agent'] + ' from: ' + (req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress);

    // Either restore the controller from the serialized string in the session or create a new one
    let controller;
    let loggingDetails;
    let loggingMessage;

    if (!connectSession.semotus.controllers[path]) {
        if (controllerId) {
            // Since we are restoring we don't changes saved or going back to the browser
            persistableSemotableTemplate.withoutChangeTracking(function bb() {
                controller = persistableSemotableTemplate._createEmptyObject(ControllerTemplate, controllerId);
                persistableSemotableTemplate.syncSession(); // Kill changes to browser
            });
        }
        else {
            controller = new ControllerTemplate();

            if (config.appConfig.templateMode === 'typescript') {
                persistableSemotableTemplate.sessionize(controller);
            }
        }

        // With a brand new controller we don't want old object to persist id mappings
        if (persistableSemotableTemplate.objectMap || config.appConfig.keepOriginalIdForSavedObjects) {
            persistableSemotableTemplate.objectMap = {};
        }

        if (typeof(controller.serverInit) === 'function') {
            controller.serverInit();
        }

        loggingDetails = {
            component: 'amorphic',
            module: 'getController',
            activity: 'new',
            controllerId: controller.__id__,
            requestedControllerId: controllerId || 'none'
        };

        loggingMessage = newPage ? 'Creating new controller new page ' : 'Creating new controller ';
        persistableSemotableTemplate.logger.info(loggingDetails, loggingMessage + browser);
    }
    else {
        persistableSemotableTemplate.withoutChangeTracking(function cc() {
            let sessionData = getSessionCache(path, sessionId, true, sessions);
            let unserialized = connectSession.semotus.controllers[path];

            controller = persistableSemotableTemplate.fromJSON(
                decompressSessionData(unserialized.controller),
                ControllerTemplate
            );

            if (config.appConfig.templateMode === 'typescript') {
                persistableSemotableTemplate.sessionize(controller);
            }

            if (unserialized.serializationTimeStamp !== sessionData.serializationTimeStamp) {
                persistableSemotableTemplate.logger.error({
                    component: 'amorphic',
                    module: 'getController',
                    activity: 'restore',
                    savedAs: sessionData.serializationTimeStamp,
                    foundToBe: unserialized.serializationTimeStamp
                }, 'Session data not as saved');
            }

            // Make sure no duplicate ids are issued
            let semotusSession = persistableSemotableTemplate._getSession();

            for (let obj in semotusSession.objects) {
                if (obj.match(/^server-[\w]*?-([0-9]+)/)) {
                    semotusSession.nextObjId = Math.max(semotusSession.nextObjId, RegExp.$1 + 1);
                }
            }

            persistableSemotableTemplate.logger.info({
                component: 'amorphic',
                module: 'getController',
                activity: 'restore'
            }, 'Restoring saved controller ' + (newPage ? ' new page ' : '') + browser);

            if (!newPage) { // No changes queued as a result unless we need it for init.js
                persistableSemotableTemplate.syncSession();
            }
        });
    }

    persistableSemotableTemplate.controller = controller;
    controller.__sessionId = sessionId;

    // Set it up in the cache
    cachedController.controller = controller;
    cachedController.timeout = setTimeout(timeoutAction, objectCacheExpiration);

    return controller;
}

function injectTemplatesIntoCurrentSession(source, destination) {
    for (var templateName in source.__dictionary__) {
        destination.__dictionary__[templateName] = source.__dictionary__[templateName];
    }
}

module.exports = {
    getController: getController
};
