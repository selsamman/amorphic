/* Copyright 2012-2013 Sam Elsamman
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Node Modules
var connect = require('connect');
var formidable = require('formidable');
var fs = require('fs');
var os = require('os');
var path = require('path');
var Persistor = require('persistor');
var Q = require('q');
var Semotus = require('semotus');
var SuperType = require('supertype');
var url = require('url');
var zlib = require('zlib');

// Local Modules
var configBuilder = require('./configBuilder').ConfigBuilder;
var configApi = require('./configBuilder').ConfigAPI;

Semotus.maxCallTime = 60 * 1000; // Max time for call interlock

// Module Global Variables
var amorphicOptions;
var appContext = {};
var applicationConfig = {};
var applicationPersistorProps = {};
var applicationSource = {};
var applicationSourceMap = {};
var controllers = {};
var downloads;
var hostName = os.hostname();
var nonObjTemplatelogLevel = 1;
var PersistObjectTemplate = Persistor(null, null, SuperType);
var sendToLog = null;
var sessions = {};

// TODO: Remove this - this is just to set the default config options
/**
 * Purpose unknown
 *
 * @returns {unknown} unknown
 */
function reset() {
    if (appContext.connection) {
        appContext.connection.close();
    }

    appContext.connection = undefined;
    applicationConfig = {};
    applicationSource = {};
    applicationSourceMap = {};
    applicationPersistorProps = {};

    amorphicOptions = {
        conflictMode: 'soft',       // Whether to abort changes based on "old value" matching.  Values: 'soft', 'hard'
        compressSession: false,     // Whether to compress data going to REDIS
        compressXHR: true,          // Whether to compress XHR responses
        sourceMode: 'debug'         // Whether to minify templates.  Values: 'debug', 'prod' (minify)
    };

    return Q(true);
}

reset();


var establishApplication = require('./lib/establishApplication').establishApplication;
var Utils = require('./lib/utils');
var log = Utils.log;
var logMessage = Utils.logMessage;
var getTemplates = require('./lib/getTemplates').getTemplates;
function localGetTemplates(objectTemplate, appPath, templates, config, path, sourceOnly, detailedInfo) {
    return getTemplates(objectTemplate, appPath, templates, config, path, sourceOnly, detailedInfo,
  amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
}

/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 */
function establishDaemon(path) {
    // Retrieve configuration information
    var config = applicationConfig[path];

    if (!config) {
        throw new Error('Amorphic: establishDaemon called with a path of ' + path + ' which was not registered');
    }

    var initObjectTemplate = config.initObjectTemplate;
    var controllerPath = config.appPath + (config.appConfig.controller || 'controller.js');

    var matches = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    var prefix = matches[1] || '';
    var prop = matches[2] || '';

    // Create a new unique object template utility
    var persistableTemplate = Persistor(null, null, SuperType);

    // Inject into it any db or persist attributes needed for application
    initObjectTemplate(persistableTemplate);

    var requires = getTemplates(persistableTemplate, config.appPath, [prop + '.js'], config, path, null, null, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);

    var controllerTemplate = requires[prop].Controller;

    if (!controllerTemplate) {
        throw new Error('Missing controller template in ' + prefix + prop + '.js');
    }

    controllerTemplate.objectTemplate = persistableTemplate;

    var controller = new controllerTemplate();
    persistableTemplate.controller = controller;

    controller.serverInit();
}

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
 *
 * @returns {*}
 */
function establishServerSession(req, path, newPage, reset, newControllerId) {
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
    var sessionData = getSessionCache(path, req.session.id, false);

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
                applicationPersistorProps);
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
            session.semotus.loggingContext[path] = getLoggingContext(path);
        }

        controller = getController(path, controllerPath, initObjectTemplate, session, objectCacheExpiration, sessionStore, newPage, true, newControllerId, req);
        controller.__template__.objectTemplate.reqSession = req.session;
    }
    else {
        controller = getController(path, controllerPath, initObjectTemplate, session, objectCacheExpiration, sessionStore, newPage, false, null, req);
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
            saveSession(path, session, controller, req);
        },

        restoreSession: function rastaSess() {
            return restoreSession(path, session, controller.__template__);
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
        saveSession(path, session, controller, req);
    }

    return Q.fcall(function g() {
        return ret;
    });
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} config unknown
 * @param {unknown} controllerPath unknown
 * @param {unknown} initObjectTemplate unknown
 * @param {unknown} path unknown
 * @param {unknown} time unknown
 * @param {unknown} appVersion unknown
 * @param {unknown} sessionExpiration unknown
 *
 * @returns {unknown} unknown
 */
function establishInitialServerSession(req, config, controllerPath, initObjectTemplate, path, time, appVersion, sessionExpiration,
    applicationPersistorProps) {

    var match = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);

    var prop = match[2];

    // Create a new unique object template utility
    var persistableSemotableTemplate = Persistor(null, null, Semotus);

    // Inject into it any db or persist attributes needed for application
    initObjectTemplate(persistableSemotableTemplate);

    // Get the controller and all of it's dependent requires which will populate a
    // key value pairs where the key is the require prefix and and the value is the
    // key value pairs of each exported template

    // Get the templates to be packaged up in the message if not pre-staged
    if (amorphicOptions.sourceMode == 'debug') {
        getTemplates(persistableSemotableTemplate, config.appPath, [prop + '.js'], config, path, null, null, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
    }

    req.amorphicTracking.addServerTask({name: 'Creating Session without Controller'}, time);

    return Q.fcall(function h() {
        return {
            getServerConnectString: function i() {
                return JSON.stringify({
                    url: '/amorphic/xhr?path=' + path,
                    message: {ver: appVersion, startingSequence: 0, sessionExpiration: sessionExpiration}
                });
            },

            getServerConfigString: function j() {
                return getServerConfigString(config);
            },

            getPersistorProps: function k() {
                if (amorphicOptions.sourceMode == 'debug') {
                    if (persistableSemotableTemplate.getPersistorProps) {
                        return persistableSemotableTemplate.getPersistorProps();
                    }

                    return {};
                }
                else {
                    return applicationPersistorProps[path];
                }
            }
        };
    });
}

/**
 * Purpose unknown
 *
 * @param {unknown} config unknown
 *
 * @returns {unknown} unknown
 */
function getServerConfigString(config) {
    var browserConfig = {};
    var whitelist = (config.appConfig.toBrowser || {});

    whitelist.modules = true;
    whitelist.templateMode = true;

    for (var key in whitelist) {
        browserConfig[key] = config.appConfig[key];
    }

    return JSON.stringify(browserConfig);
}

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
 * @param {unknown} newPage - force returning everything since this is likely a session continuation on a new web page
 * @param {unknown} reset - create new clean empty controller losing all data
 * @param {unknown} controllerId - unknown
 * @param {unknown} req - connect request
 *
 * @returns {*}
 */
function getController(path, controllerPath, initObjectTemplate, connectSession, objectCacheExpiration, sessionStore, newPage, reset, controllerId, req) {
    var sessionId = connectSession.id;
    var config = applicationConfig[path];

    // Manage the controller cache
    if (!controllers[sessionId + path]) {
        controllers[sessionId + path] = {};
    }

    var cachedController = controllers[sessionId + path];

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
    var timeoutAction = function teamOutAction() {
        sessionStore.get(sessionId, function aa(_error, connectSession) {
            if (!connectSession) {
                log(1, sessionId, 'Session has expired', nonObjTemplatelogLevel);
            }

            if (!connectSession || cachedController.controller.__template__.objectTemplate.getPendingCallCount() == 0) {
                controllers[sessionId + path] = null;
                log(1, sessionId, 'Expiring controller cache for ' + path, nonObjTemplatelogLevel);
            }
            else {
                cachedController.timeout = setTimeout(timeoutAction, objectCacheExpiration);
                log(2, sessionId, 'Extending controller cache timeout because of pending calls for ' + path, nonObjTemplatelogLevel);
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

    var matches = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    var prefix = matches[1];
    var prop = matches[2];

    // Create a new unique object template utility
    var persistableSemotableTemplate = Persistor(null, null, Semotus);

    setupLogger(persistableSemotableTemplate.logger, path, connectSession.semotus.loggingContext[path]);

    // Inject into it any db or persist attributes needed for application
    initObjectTemplate(persistableSemotableTemplate);

    // Restore any saved objectMap
    if (connectSession.semotus.objectMap && connectSession.semotus.objectMap[path]) {
        persistableSemotableTemplate.objectMap = connectSession.semotus.objectMap[path];
    }

    // Get the controller and all of it's dependent templates which will populate a
    // key value pairs where the key is the require prefix and and the value is the
    // key value pairs of each exported template
    var templates = getTemplates(persistableSemotableTemplate, prefix, [prop + '.js'], config, path, null, null, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
    var controllerTemplate = templates[prop].Controller;

 
    if (!controllerTemplate) {
        throw  new Error('Missing controller template in ' + prefix + prop + '.js');
    }

    controllerTemplate.objectTemplate = persistableSemotableTemplate;

    // Setup unique object template to manage a session
    persistableSemotableTemplate.createSession('server', null, connectSession.id);

    var browser = ' - browser: ' + req.headers['user-agent'] + ' from: ' + (req.headers['x-forwarded-for'] || req.connection.remoteAddress);

    // Either restore the controller from the serialized string in the session or create a new one
    var controller;

    if (!connectSession.semotus.controllers[path]) {
        if (controllerId) {
            // Since we are restoring we don't changes saved or going back to the browser
            persistableSemotableTemplate.withoutChangeTracking(function bb() {
                controller = persistableSemotableTemplate._createEmptyObject(controllerTemplate, controllerId);
                persistableSemotableTemplate.syncSession(); // Kill changes to browser
            });
        }
        else {
            controller = new controllerTemplate();
        }

        if (typeof(controller.serverInit) == 'function') {
            controller.serverInit();
        }

        // With a brand new controller we don't want old object to persist id mappings
        if (persistableSemotableTemplate.objectMap) {
            persistableSemotableTemplate.objectMap = {};
        }

        if (newPage) {
            persistableSemotableTemplate.logger.info({component: 'amorphic', module: 'getController', activity: 'new', controllerId: controller.__id__, requestedControllerId: controllerId || 'none'},
                'Creating new controller new page ' + browser);
        }
        else {
            persistableSemotableTemplate.logger.info({component: 'amorphic', module: 'getController', activity: 'new', controllerId: controller.__id__, requestedControllerId: controllerId || 'none'},
                'Creating new controller ' + browser);
        }
    }
    else {
        persistableSemotableTemplate.withoutChangeTracking(function cc() {
            var sessionData = getSessionCache(path, sessionId, true);
            var unserialized = connectSession.semotus.controllers[path];
            controller = persistableSemotableTemplate.fromJSON(decompressSessionData(unserialized.controller), controllerTemplate);

            if (unserialized.serializationTimeStamp != sessionData.serializationTimeStamp) {
                persistableSemotableTemplate.logger.error({component: 'amorphic', module: 'getController', activity: 'restore',
                    savedAs: sessionData.serializationTimeStamp, foundToBe: unserialized.serializationTimeStamp},
                    'Session data not as saved');
            }

            // Make sure no duplicate ids are issued
            var semotusSession = persistableSemotableTemplate._getSession();

            for (var obj in semotusSession.objects) {
                if (obj.match(/^server-[\w]*?-([0-9]+)/)) {
                    semotusSession.nextObjId = Math.max(semotusSession.nextObjId, RegExp.$1 + 1);
                }
            }

            persistableSemotableTemplate.logger.info({component: 'amorphic', module: 'getController', activity: 'restore'},
                'Restoreing saved controller ' + (newPage ? ' new page ' : '') + browser);

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

/**
 * Purpose unknown
 *
 * @param {unknown} app unknown
 * @param {unknown} context unknown
 *
 * @returns {unknown} unknown
 */
function getLoggingContext(app, context) {
    context = context || {};
    context.environment = process.env.NODE_ENV || 'local';
    context.name = app;
    context.hostname = hostName;
    context.pid = process.pid;

    return context;
}

/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 *
 * @returns {unknown} unknown
 */
function getModelSource(path) {
    return applicationSource[path];
}

/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 *
 * @returns {unknown} unknown
 */
function getModelSourceMap(path) {
    return applicationSourceMap[path];
}

/**
 * Purpose unknown
 *
 * @param {unknown} data unknown
 *
 * @returns {unknown} unknown
 */
function compressSessionData(data) {
    if (amorphicOptions.compressSession) {
        return zlib.deflateSync(data);
    }

    return data;
}

/**
 * Purpose unknown
 *
 * @param {unknown} objData unknown
 *
 * @returns {unknown} unknown
 */
function decompressSessionData(objData) {
    if (amorphicOptions.compressSession && objData.data) {
        var buffer = new Buffer(objData.data);

        return zlib.inflateSync(buffer);
    }

    return objData;
}

/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 * @param {unknown} session unknown
 * @param {unknown} controller unknown
 * @param {unknown} req unknown
 */
function saveSession(path, session, controller, req) {
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
    var sessionData = getSessionCache(path, ourObjectTemplate.controller.__sessionId, true);
    sessionData.serializationTimeStamp = (new Date ()).getTime();

    session.semotus.controllers[path] = {controller: compressSessionData(serialSession), serializationTimeStamp: sessionData.serializationTimeStamp};

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

/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 * @param {unknown} session unknown
 * @param {unknown} controllerTemplate unknown
 *
 * @returns {unknown} unknown
 */
function restoreSession(path, session, controllerTemplate) {

    var objectTemplate = controllerTemplate.objectTemplate;

    // Restore the controller from the session
    var controller;

    objectTemplate.withoutChangeTracking(function dd() {
        var sessionData = getSessionCache(path, objectTemplate.controller.__sessionId, true);

        // Will return in exising controller object because createEmptyObject does so
        var unserialized = session.semotus.controllers[path];
        controller = objectTemplate.fromJSON(decompressSessionData(unserialized.controller), controllerTemplate);

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

/**
 * Purpose unknown
 *
 * @param {unknown} dir unknown
 */
function setDownloadDir(dir) {
    downloads = dir;
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function processFile(req, resp, next) {
    if (!downloads) {
        logMessage('no download directory');
        next();
        return;
    }

    var form = new formidable.IncomingForm();
    form.uploadDir = downloads;

    form.parse(req, function ee(err, _fields, files) {
        if (err) {
            logMessage(err);
        }

        resp.writeHead(200, {'content-type': 'text/html'});

        var file = files.file.path;
        logMessage(file);

        setTimeout(function yz() {
            fs.unlink(file, function zy(err) {
                if (err) {
                    logMessage(err);
                }
                else {
                    logMessage(file + ' deleted');
                }
            });
        }, 60000);

        var fileName = files.file.name;
        req.session.file = file;
        resp.end('<html><body><script>parent.amorphic.prepareFileUpload(\'package\');parent.amorphic.uploadFunction.call(null, "' +  fileName + '"' + ')</script></body></html>');
    });
}

/**
 * Process a post request by establishing a session and calling the controllers processPost method
 * which can return a response to be sent back
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 */
function processPost(req, resp) {
    var session = req.session;
    var path = url.parse(req.url, true).query.path;

    establishServerSession(req, path, false, false, null).then(function ff(semotus) {
        var ourObjectTemplate = semotus.objectTemplate;
        var remoteSessionId = req.session.id;

        if (typeof(ourObjectTemplate.controller.processPost) == 'function') {
            Q(ourObjectTemplate.controller.processPost(null, req.body)).then(function gg(controllerResp) {
                ourObjectTemplate.setSession(remoteSessionId);
                semotus.save(path, session, req);
                resp.writeHead(controllerResp.status, controllerResp.headers || {'Content-Type': 'text/plain'});
                resp.end(controllerResp.body);
            }).catch(function hh(e) {
                ourObjectTemplate.logger.info({component: 'amorphic', module: 'processPost', activity: 'error'}, 'Error ' + e.message + e.stack);
                resp.writeHead(500, {'Content-Type': 'text/plain'});
                resp.end('Internal Error');
            });
        }
        else {
            throw 'Not Accepting Posts';
        }
    }).catch(function ii(error) {
        logMessage('Error establishing session for processPost ', req.session.id, error.message + error.stack);
        resp.writeHead(500, {'Content-Type': 'text/plain'});
        resp.end('Internal Error');
    }).done();
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 */
function processLoggingMessage(req, resp) {
    var path = url.parse(req.url, true).query.path;
    var session = req.session;
    var message = req.body;
    var persistableSemotableTemplate = Persistor(null, null, Semotus);

    if (!session.semotus) {
        session.semotus = {controllers: {}, loggingContext: {}};
    }

    if (!session.semotus.loggingContext[path]) {
        session.semotus.loggingContext[path] = getLoggingContext(path);
    }

    setupLogger(persistableSemotableTemplate.logger, path, session.semotus.loggingContext[path]);
    persistableSemotableTemplate.logger.setContextProps(message.loggingContext);

    persistableSemotableTemplate.logger.setContextProps({session: req.session.id,
        ipaddress: (String(req.headers['x-forwarded-for'] || req.connection.remoteAddress))
            .split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown'});

    message.loggingData.from = 'browser';
    persistableSemotableTemplate.logger[message.loggingLevel](message.loggingData);
    resp.writeHead(200, {'Content-Type': 'text/plain'});
    resp.end('');
}

/**
 * Purpose unknown
 *
 * @param {unknown} logger unknown
 * @param {unknown} path unknown
 * @param {unknown} context unknown
 */
function setupLogger(logger, path, context) {
    logger.startContext(context);
    logger.setLevel(applicationConfig[path].logLevel);

    if (sendToLog) {
        logger.sendToLog = sendToLog;
    }
}

/**
 * Manage a set of data keyed by the session id used for message sequence and serialization tracking
 *
 * @param {String} path unknown
 * @param {unknown} sessionId unknown
 * @param {unknown} keepTimeout unknown
 *
 * @returns {*|{sequence: number, serializationTimeStamp: null, timeout: null}}
 */
function getSessionCache(path, sessionId, keepTimeout) {
    var key = path + '-' + sessionId;
    var session = sessions[key] || {sequence: 1, serializationTimeStamp: null, timeout: null};
    sessions[key] = session;

    if (!keepTimeout) {
        if (session.timeout) {
            clearTimeout(session.timeout);
        }

        setTimeout(function jj() {
            if (sessions[key]) {
                delete sessions[key];
            }
        }, amorphicOptions.sessionExpiration);
    }

    return session;
}

/**
 * Process JSON request message
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 */
function processMessage(req, resp) {
    var session = req.session;
    var message = req.body;
    var path = url.parse(req.url, true).query.path;
    var sessionData = getSessionCache(path, req.session.id);

    if (!message.sequence) {
        log(1, req.session.id, 'ignoring non-sequenced message', nonObjTemplatelogLevel);
        resp.writeHead(500, {'Content-Type': 'text/plain'});
        resp.end('ignoring non-sequenced message');

        return;
    }

    var expectedSequence = sessionData.sequence || message.sequence;
    var newPage = message.type == 'refresh' || message.sequence != expectedSequence;
    var forceReset = message.type == 'reset';

    establishServerSession(req, path, newPage, forceReset, message.rootId).then(function kk(semotus) {
        if (message.performanceLogging) {
            req.amorphicTracking.browser = message.performanceLogging;
        }

        semotus.objectTemplate.logger.setContextProps(message.loggingContext);

        var callContext = message.type;

        if (message.type == 'call') {
            callContext += '.' + message.id + '[' + message.name + ']';
        }

        var context = semotus.objectTemplate.logger.setContextProps({app: path, message: callContext,
            sequence: message.sequence, expectedSequence: sessionData.sequence, session: req.session.id,
            ipaddress: (String(req.headers['x-forwarded-for'] || req.connection.remoteAddress))
                .split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown'});

        ++sessionData.sequence;

        var ourObjectTemplate = semotus.objectTemplate;
        var remoteSessionId = req.session.id;

        ourObjectTemplate.expireSession = function expoSession() {
            req.session.destroy();
            ourObjectTemplate.sessionExpired = true;
        };

        ourObjectTemplate.sessionExpired = false;
        var startMessageProcessing;

        // If we expired just return a message telling the client to reset itself
        if (semotus.newSession || newPage || forceReset) {
            if (semotus.newSession) {
                ourObjectTemplate.logger.info({component: 'amorphic', module: 'processMessage', activity: 'reset'},
                    remoteSessionId, 'Force reset on ' + message.type + ' ' + 'new session' + ' [' + message.sequence + ']');
            }
            else {
                ourObjectTemplate.logger.info({component: 'amorphic', module: 'processMessage', activity: 'reset'},
                    remoteSessionId, 'Force reset on ' + message.type + ' ' +  ' [' + message.sequence + ']');
            }

            semotus.save(path, session, req);

            startMessageProcessing = process.hrtime();
            var outbound = semotus.getMessage();

            outbound.ver = semotus.appVersion;
            ourObjectTemplate.logger.clearContextProps(context);
            resp.end(JSON.stringify(outbound));  // return a sync message assuming no queued messages

            for (var prop in ourObjectTemplate.logger.context) {
                req.amorphicTracking.loggingContext[prop] = ourObjectTemplate.logger.context[prop];
            }

            req.amorphicTracking.addServerTask({name: 'Reset Processing'}, startMessageProcessing);
            sessionData.sequence = message.sequence + 1;
            displayPerformance(req);

            return;
        }

        // When Semotus sends a message it will either be a response or
        // a callback to the client.  In either case return a response and prevent
        // any further messages from being generated as these will get handled on
        // the next call into the server
        startMessageProcessing = process.hrtime();
        var sendMessage = function surndMessage(message) {
            ourObjectTemplate.setSession(remoteSessionId);
            ourObjectTemplate.enableSendMessage(false);
            req.amorphicTracking.addServerTask({name: 'Request Processing'}, startMessageProcessing);
            semotus.save(path, session, req);
            message.ver = semotus.appVersion;
            message.sessionExpired = ourObjectTemplate.sessionExpired;

            var respstr = JSON.stringify(message);

            for (var prop in ourObjectTemplate.logger.context) {
                req.amorphicTracking.loggingContext[prop] = ourObjectTemplate.logger.context[prop];
            }

            ourObjectTemplate.logger.clearContextProps(context);
            resp.end(respstr);
            displayPerformance(req);
        };

        ourObjectTemplate.incomingIP = (String(req.headers['x-forwarded-for'] || req.connection.remoteAddress)) .split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown';

        ourObjectTemplate.enableSendMessage(true, sendMessage);  // Enable the sending of the message in the response

        try {
            ourObjectTemplate.processMessage(message, null, semotus.restoreSession);
        }
        catch (error) {
            ourObjectTemplate.logger.info({component: 'amorphic', module: 'processMessage', activity: 'error'}, error.message + error.stack);
            resp.writeHead(500, {'Content-Type': 'text/plain'});
            ourObjectTemplate.logger.clearContextProps(context);
            resp.end(error.toString());
        }

    }).catch(function failure(error) {
        log(0, req.session.id, error.message + error.stack, nonObjTemplatelogLevel);
        resp.writeHead(500, {'Content-Type': 'text/plain'});
        resp.end(error.toString());
    }).done();
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function router(req, resp, next) {
    if (req.url.match(/amorphic\/xhr\?path\=/)) {
        req.body.type == 'logging' ? processLoggingMessage(req, resp) : processMessage(req, resp);
    }
    else {
        next();
    }
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function uploadRouter(req, resp, next) {
    if (req.url.match(/amorphic\/xhr\?path\=/) && url.parse(req.url, true).query.file && req.method == 'POST') {
        processFile(req, resp, next);
    }
    else {
        next();
    }
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function amorphicEntry(req, resp, next) {
    // If we're not initalizing
    if (!req.url.match(/amorphic\/init/)) {
        next();
    }

    logMessage('Requesting ' + req.originalUrl);

    req.amorphicTracking.loggingContext.session = req.session.id;

    req.amorphicTracking.loggingContext.ipaddress =
        (String(req.headers['x-forwarded-for'] || req.connection.remoteAddress))
            .split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown';

    var time = process.hrtime();
    var appName;

    if (req.originalUrl.match(/([A-Za-z0-9_]*)\.cached.js.map/)) {
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        resp.setHeader('Content-Type', 'application/javascript');
        resp.setHeader('Cache-Control', 'public, max-age=31556926');
        resp.end(getModelSourceMap(appName));

        req.amorphicTracking.addServerTask({name: 'Request Source Map'}, time);
        displayPerformance(req);
    }
    else if (req.originalUrl.match(/([A-Za-z0-9_]*)\.cached.js/)) {
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        resp.setHeader('Content-Type', 'application/javascript');
        resp.setHeader('Cache-Control', 'public, max-age=31556926');

        if (amorphicOptions.sourceMode == 'prod') {
            if (req.originalUrl.match(/(\?ver=[0-9]+)/)) {
                resp.setHeader('X-SourceMap', '/amorphic/init/' + appName + '.cached.js.map?ver=' + RegExp.$1);
            }
            else {
                resp.setHeader('X-SourceMap', '/amorphic/init/' + appName + '.cached.js.map?ver=');
            }
        }

        resp.end(getModelSource(appName));

        req.amorphicTracking.addServerTask('Request Compressed Sources', time);
        displayPerformance(req);
    }
    else if (req.originalUrl.match(/([A-Za-z0-9_-]*)\.js/)) {
        var url = req.originalUrl;
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        logMessage('Establishing ' + appName);

        establishServerSession(req, appName, 'initial')
            .then (function a(session) {
                var time = process.hrtime();

                if (req.method == 'POST' && session.objectTemplate.controller.processPost) {
                    Q(session.objectTemplate.controller.processPost(req.originalUrl, req.body, req)).then(function b(controllerResp) {
                        session.save(appName, req.session, req);
                        resp.writeHead(controllerResp.status, controllerResp.headers || {'Content-Type': 'text/plain'});
                        resp.end(controllerResp.body || '');
                    });

                    req.amorphicTracking.addServerTask({name: 'Application Post'}, time);
                    displayPerformance(req);
                }
                else {
                    resp.setHeader('Content-Type', 'application/javascript');
                    resp.setHeader('Cache-Control', 'public, max-age=0');

                    if (amorphicOptions.sourceMode != 'debug') {
                        resp.end(
                            "document.write(\"<script src='" + url.replace(/\.js/, '.cached.js') + "'></script>\");\n" +
                            "amorphic.setApplication('" + appName + "');" +
                            'amorphic.setSchema(' + JSON.stringify(session.getPersistorProps()) + ');' +
                            'amorphic.setConfig(' + JSON.stringify(JSON.parse(session.getServerConfigString())) + ');' +
                            'amorphic.setInitialMessage(' + session.getServerConnectString() + ');'
                        );
                    }
                    else {
                        resp.end(
                            getModelSource(appName) +
                            "amorphic.setApplication('" + appName + "');" +
                            'amorphic.setSchema(' + JSON.stringify(session.getPersistorProps()) + ');' +
                            'amorphic.setConfig(' + JSON.stringify(JSON.parse(session.getServerConfigString())) + ');' +
                            'amorphic.setInitialMessage(' + session.getServerConnectString() + ');'
                        );
                    }

                    req.amorphicTracking.addServerTask({name: 'Application Initialization'}, time);
                    displayPerformance(req);
                }
            }).done();
    }
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function postRouter(req, resp, next) {
    if (req.url.match(/amorphic\/xhr\?path\=/) && url.parse(req.url, true).query.form && req.method == 'POST') {
        processPost(req, resp, next);
    }
    else {
        next();
    }
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function downloadRouter(req, resp, next) {
    var file = url.parse(req.url, true).query.file;

    if (req.url.match(/amorphic\/xhr\?path\=/) && file && req.method == 'GET') {
        processContentRequest(req, resp);
    }
    else {
        next();
    }
}

/**
 * Purpose unknown
 *
 * @param {unknown} request unknown
 * @param {unknown} response unknown
 */
function processContentRequest(request, response) {
    var path = url.parse(request.url, true).query.path;

    establishServerSession(request, path, false).then(function zz(semotus) {
        if (typeof(semotus.objectTemplate.controller.onContentRequest) == 'function') {
            semotus.objectTemplate.controller.onContentRequest(request, response);
        }
    });
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 */
function displayPerformance(req) {
    var logger = Semotus.createLogger();

    logger.setContextProps(req.amorphicTracking.loggingContext);

    var diff = process.hrtime(req.amorphicTracking.startTime);
    var totalTime = (diff[0] * 1e9 + diff[1]) / 1000000;
    var taskTime = 0;

    req.amorphicTracking.serverTasks.forEach(function d(task) {
        taskTime += task.time;
    });

    logger.info({
        component: 'amorphic',
        module: 'listen',
        duration: totalTime,
        browserPerformance: req.amorphicTracking.browser,
        serverTasks: req.amorphicTracking.serverTasks,
        unaccounted: totalTime - taskTime},
        'Request Performance');
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} _resp unknown
 * @param {unknown} next unknown
 */
function intializePerformance(req, _resp, next) {
    req.amorphicTracking = {
        startTime: process.hrtime(),
        serverTasks: [],
        browserTasks: [],
        loggingContext: {},
        addServerTask: function ardTask(props, hrStartTime) {
            var diff = process.hrtime(hrStartTime);
            var took = (diff[0] * 1e9 + diff[1]) / 1000000;
            props.time = took;
            this.serverTasks.push(props);
        }
    };

    next();
}

/**
 * Purpose unknown
 *
 * @param {unknown} configStore unknown
 */
function fetchStartUpParams(configStore) {
    var rootCfg = configStore['root'];

    amorphicOptions.compressXHR = rootCfg.get('compressXHR') || amorphicOptions.compressXHR;
    amorphicOptions.sourceMode = rootCfg.get('sourceMode') || amorphicOptions.sourceMode;
    amorphicOptions.compressSession = rootCfg.get('compressSession') || amorphicOptions.compressSession;
    amorphicOptions.conflictMode = rootCfg.get('conflictMode') || amorphicOptions.conflictMode;
    amorphicOptions.sessionExpiration = rootCfg.get('sessionSeconds') * 1000;
    amorphicOptions.objectCacheExpiration = rootCfg.get('objectCacheSeconds') * 1000;
    amorphicOptions.sessionSecret = rootCfg.get('sessionSecret');

    amorphicOptions.appList = rootCfg.get('applications');
    amorphicOptions.appStartList = rootCfg.get('application').split(';');
    amorphicOptions.mainApp = amorphicOptions.appStartList[0];

    amorphicOptions.port = rootCfg.get('port');
}

/**
 * Purpose unknown
 */
function generateDownloadsDir() {
    // Create temporary directory for file uploads
    var downloads = path.join(path.dirname(require.main.filename), 'download');

    if (!fs.existsSync(downloads)) {
        fs.mkdirSync(downloads);
    }

    var files = fs.readdirSync(downloads);

    for (var ix = 0; ix < files.length; ++ix) {
        fs.unlinkSync(path.join(downloads, files[ix]));
    }

    setDownloadDir(downloads);
}

// TODO: Refactor this to be a readSchema function
/**
 * Purpose unknown
 *
 * @param {unknown} file unknown
 *
 * @returns {unknown} unknown
 */
function readFile(file) {

    if (file && fs.existsSync(file)) {
        return fs.readFileSync(file);
    }

    return null;
}

/**
 * Purpose unknown
 *
 * @param {unknown} appName unknown
 * @param {unknown} appDirectory unknown
 * @param {unknown} appList unknown
 * @param {unknown} configStore unknown
 * @param {unknown} sessionStore unknown
 *
 * @returns {unknown} unknown
 */
function startApplication(appName, appDirectory, appList, configStore, sessionStore) {

    var path = appDirectory + '/' + appList[appName] + '/';
    var cpath = appDirectory + '/apps/common/';

    // TODO: Completely change how we do configurations
    var config = configStore[appName].get();
    config.nconf = configStore[appName]; // global config
    config.configStore = configStore;

    var schema = JSON.parse((readFile(path + '/schema.json') || readFile(cpath + '/schema.json')).toString());

    var dbConfig = {
        dbName : config.nconf.get(appName + '_dbName') || config.nconf.get('dbName') || config.nconf.get('dbname'),
        dbPath : config.nconf.get(appName + '_dbPath') || config.nconf.get('dbPath') || config.nconf.get('dbpath'),
        dbDriver : config.nconf.get(appName + '_dbDriver') || config.nconf.get('dbDriver') || config.nconf.get('dbdriver') || 'mongo',
        dbType : config.nconf.get(appName + '_dbType') || config.nconf.get('dbType') || config.nconf.get('dbtype') || 'mongo',
        dbUser : config.nconf.get(appName + '_dbUser') || config.nconf.get('dbUser') || config.nconf.get('dbuser') || 'nodejs',
        dbPassword : config.nconf.get(appName + '_dbPassword') || config.nconf.get('dbPassword') || config.nconf.get('dbpassword') || null,
        dbConnections : config.nconf.get(appName + '_dbConnections') || config.nconf.get('dbconnections') || 20,
        dbConcurrency : config.nconf.get(appName + '_dbConcurrency') || config.nconf.get('dbconcurrency') || 5
    };

    var dbClient;

    if (dbConfig.dbName && dbConfig.dbPath) {
        if (dbConfig.dbDriver == 'mongo') {
            var MongoClient = require('mongodb-bluebird');
            dbClient = MongoClient.connect(dbConfig.dbPath + dbConfig.dbName);
        }
        else if (dbConfig.dbDriver == 'knex') {
            var knex = require('knex')({
                client: dbConfig.dbType,
                connection: {
                    host     : dbConfig.dbPath,
                    database : dbConfig.dbName,
                    user: dbConfig.dbUser,
                    password: dbConfig.dbPassword
                }, pool: {min: 0, max: dbConfig.dbConnections}
            });

            dbClient = Q(knex); // TODO: knex is already initialized because it is a synchronous function that is called when require('knex') occurs
        }

        return dbClient.then(handleDBCase.bind(this, dbConfig, config, appName, path, cpath, schema, sessionStore)).catch(function errorrr(e) {
            logMessage(e.message + e.stack);
        });
    }
    else {
        // No database case
        if (config.isDaemon) {
            establishApplication(appName, path + '/js/', cpath + '/js/', injectObjectTemplate,
                amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null, config.ver, config,
                config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
                amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps);
        }
        else {
            establishApplication(appName, path + '/public/js/', cpath + '/js/', injectObjectTemplate,
                amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null, config.ver, config,
                config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
                amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps);
        }

        if (config.isDaemon) {
            establishDaemon(appName);
            logMessage(appName + ' started as a daemon');
        }
    }

    function injectObjectTemplate(objectTemplate) {
        objectTemplate.config = config;
        objectTemplate.logLevel = config.nconf.get('logLevel') || 1;
        objectTemplate.__conflictMode__ = amorphicOptions.conflictMode;
    }
}

/**
 * Purpose unknown
 *
 * @param {unknown} dbConfig unknown
 * @param {unknown} config unknown
 * @param {unknown} appName unknown
 * @param {unknown} path unknown
 * @param {unknown} cpath unknown
 * @param {unknown} schema unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} db unknown
 */
function handleDBCase(dbConfig, config, appName, path, cpath, schema, sessionStore, db) {
    logMessage('DB connection established to ' + dbConfig.dbName);

    // TODO: Try to pull this function out
    function injectObjectTemplate(objectTemplate) {

        if (dbConfig.dbDriver == 'knex') {
            objectTemplate.setDB(db, PersistObjectTemplate.DB_Knex);
        }
        else {
            objectTemplate.setDB(db);
        }

        objectTemplate.setSchema(schema);
        objectTemplate.config = config;
        objectTemplate.logLevel = config.nconf.get('logLevel') || 1;

        objectTemplate.concurrency = dbConfig.dbConcurrency; //TODO: What does dbConcurrency do?
        objectTemplate.__conflictMode__ = amorphicOptions.conflictMode;
    }

    if (config.isDaemon) {
        establishApplication(appName, path + '/js/', cpath + '/js/', injectObjectTemplate,
            amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null, config.ver, config,
            config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
            amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps);
    }
    else {
        establishApplication(appName, path + '/public/js/', cpath + '/js/', injectObjectTemplate,
            amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null, config.ver, config,
            config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
            amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps);
    }

    if (config.isDaemon) {
        establishDaemon(appName);
        logMessage(appName + ' started as a daemon');
    }
}

/**
 * Purpose unknown
 *
 * @param {unknown} preSessionInject unknown
 * @param {unknown} postSessionInject unknown
 * @param {unknown} appList unknown
 * @param {unknown} appStartList unknown
 * @param {unknown} appDirectory unknown
 * @param {unknown} mainApp unknown
 * @param {unknown} sessionRouter unknown
 */
function startUpServer(preSessionInject, postSessionInject, appList, appStartList, appDirectory, mainApp, sessionRouter) {
    var app = connect();

    if (amorphicOptions.compressXHR) {
        app.use(require('compression')());
    }

    if (preSessionInject) {
        preSessionInject.call(null, app);
    }

    for (var appName in appList) {
        if (appStartList.indexOf(appName) >= 0) {
            var path = appDirectory + '/' + appList[appName] + '/public';

            app.use('/' + appName + '/', connect.static(path, {index: 'index.html'}));

            if (appName == mainApp) {
                app.use('/', connect.static(path, {index: 'index.html'}));
            }

            logMessage(appName + ' connected to ' + path);
        }
    }

    var rootSuperType;

    if (fs.existsSync(appDirectory + '/node_modules/supertype')) {
        rootSuperType = appDirectory;
    }
    else {
        rootSuperType = __dirname;
    }

    var rootSemotus;

    if (fs.existsSync(appDirectory + '/node_modules/semotus')) {
        rootSemotus = appDirectory;
    }
    else {
        rootSemotus = __dirname;
    }

    var rootBindster;

    if (fs.existsSync(appDirectory + '/node_modules/amorphic-bindster')) {
        rootBindster = appDirectory;
    }
    else {
        rootBindster = __dirname;
    }

    app.use(intializePerformance)
        .use('/modules/', connect.static(appDirectory + '/node_modules'))
        .use('/bindster/', connect.static(rootBindster + '/node_modules/amorphic-bindster'))
        .use('/amorphic/', connect.static(appDirectory))
        .use('/common/', connect.static(appDirectory + '/apps/common'))
        .use('/supertype/', connect.static(rootSuperType + '/node_modules/supertype'))
        .use('/semotus/', connect.static(rootSemotus + '/node_modules/semotus'))
        .use(connect.cookieParser())
        .use(sessionRouter)
        .use(uploadRouter)
        .use(downloadRouter)
        .use(connect.bodyParser())
        .use(postRouter)
        .use(amorphicEntry);

    if (postSessionInject) {
        postSessionInject.call(null, app);
    }

    app.use(router);
    appContext.connection = app.listen(amorphicOptions.port);
}

/**
 * Purpose unknown
 *
 * @param {unknown} appDirectory unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} preSessionInject unknown
 * @param {unknown} postSessionInject unknown
 * @param {unknown} sendToLogFunction unknown
 */
function listen(appDirectory, sessionStore, preSessionInject, postSessionInject, sendToLogFunction) {
    sendToLog = sendToLogFunction;

    var builder = new configBuilder(new configApi());
    var configStore = builder.build(appDirectory);

    fetchStartUpParams(configStore);
    generateDownloadsDir();

    logMessage('Starting Amorphic with options: ' + JSON.stringify(amorphicOptions));

    sessionStore = sessionStore || new (connect.session.MemoryStore)();

    var sessionRouter = connect.session(
        {
            store: sessionStore, secret: amorphicOptions.sessionSecret,
            cookie: {maxAge: amorphicOptions.sessionExpiration},
            rolling: true
        } // TODO: What is rolling: true?
    );

    // Initialize applications
    var appList = amorphicOptions.appList;
    var appStartList = amorphicOptions.appStartList;
    var mainApp = amorphicOptions.mainApp;
    var promises = [];

    for (var appKey in appList) {
        if (appStartList.indexOf(appKey) >= 0) {
            promises.push(startApplication(appKey, appDirectory, appList, configStore, sessionStore));
        }
    }

    Q.all(promises).then(startUpServer.bind(this, preSessionInject, postSessionInject, appList, appStartList, appDirectory, mainApp, sessionRouter))
        .catch(function f(e) {
            logMessage(e.message + ' ' + e.stack);
        });
}

module.exports = {
    establishApplication: establishApplication,
    establishDaemon: establishDaemon,
    establishServerSession: establishServerSession,
    saveSession: saveSession,
    processMessage: processMessage,
    router: router,
    uploadRouter: uploadRouter,
    postRouter: postRouter,
    downloadRouter: downloadRouter,
    getTemplates: localGetTemplates,
    setDownloadDir: setDownloadDir,
    listen: listen,
    getModelSource: getModelSource,
    getModelSourceMap: getModelSourceMap,
    reset: reset
};
