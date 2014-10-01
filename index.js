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
/*  @type RemoteObjectTemplate */
var performanceLogging = false;
var ObjectTemplate = require("supertype");
var RemoteObjectTemplate = require("semotus");
var PersistObjectTemplate = require("persistor")(ObjectTemplate, RemoteObjectTemplate, ObjectTemplate);
var formidable = require('formidable');
var url = require('url');
var fs = require('fs');
var Q = require('q');
var logLevel = 1;
var path = require('path');

var applicationConfig = {};
var applicationSource = {};
var deferred = {};
var logger = null;
var sourceMode = 'debug'
function establishApplication (path, controllerPath, initObjectTemplate, sessionExpiration, objectCacheExpiration, sessionStore, loggerCall, appVersion, appConfig) {
    applicationConfig[path] = {
        controllerPath: controllerPath,
        initObjectTemplate: initObjectTemplate,
        sessionExpiration: sessionExpiration,
        objectCacheExpiration: objectCacheExpiration,
        sessionStore: sessionStore,
        appVersion: appVersion,
        appConfig: appConfig
    };
    logger = loggerCall ? loggerCall : logger;
    log(1, "", "semotus extablishing application for " + path);
}
function establishDaemon (path) {
    // Retrieve configuration information
    var config = applicationConfig[path];
    if (!config)
        throw  new Error("Semotus: establishServerSession called with a path of " + path + " which was not registered");
    var initObjectTemplate = config.initObjectTemplate;
    var controllerPath = config.controllerPath;

    var requires = {};
    controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/)
    var prefix = RegExp.$1;
    var prop = RegExp.$2

    // Create a new unique object template utility
    var objectTemplate = require("persistor")(ObjectTemplate, null, ObjectTemplate);

    // Inject into it any db or persist attributes needed for application
    initObjectTemplate(objectTemplate);
    var requires = getTemplates(objectTemplate, prefix, [prop + ".js"], config);

    var controllerTemplate = requires[prop].Controller;
    if (!controllerTemplate)
        throw  new Error("Missing controller template in " + prefix + prop + ".js");
    controllerTemplate.objectTemplate = objectTemplate;

    var controller = new controllerTemplate();
    objectTemplate.controller = controller;

    controller.serverInit();
}
/**
 * Establish a server session

 * The entire session mechanism is predicated on the fact that there is a unique instance
 * of object templates for each session.
 *
 * @param req
 * @param path - used to identify future requests from XML
 * @param newPage - force returning everything since this is likely a session continuation on a new web page
 * @param reset - create new clean empty controller losing all data
 * @param hasReset - client has reset and is sending a controller
 * @return {*}
 */

function establishServerSession (req, path, newPage, reset, newControllerId)
{
    // Retrieve configuration information
    var config = applicationConfig[path];
    if (!config)
        throw  new Error("Semotus: establishServerSession called with a path of " + path + " which was not registered");
    var initObjectTemplate = config.initObjectTemplate;
    var controllerPath = config.controllerPath;
    var objectCacheExpiration = config.objectCacheExpiration;
    var sessionExpiration = config.sessionExpiration;
    var sessionStore = config.sessionStore;
    var appVersion = config.appVersion;
    var session = req.session;

    // For a new page determine if a controller is to be omitted
    if (newPage == "initial" && config.appConfig.createControllerFor && !session.semotus)
    {
        var referer = url.parse(req.headers['referer'], true).path;
        var match = config.appConfig.createControllerFor;
        if (!referer.match(match))
        {
            // Create the templates to get the source but don't instantiate a controller yet
            var requires = {};
            controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/)
            var prefix = RegExp.$1;
            var prop = RegExp.$2

            // Create a new unique object template utility
            var objectTemplate = require("persistor")(ObjectTemplate, RemoteObjectTemplate, RemoteObjectTemplate);

            // Inject into it any db or persist attributes needed for application
            initObjectTemplate(objectTemplate);

            // Get the controller and all of it's dependent requires which will populate a
            // key value pairs where the key is the require prefix and and the value is the
            // key value pairs of each exported template
            applicationSource[path] = "";
            var requires = getTemplates(objectTemplate, prefix, [prop + ".js"], config, path);

            return Q.fcall(function ()
            {
                return {
                    getServerConnectString: function () {
                        return JSON.stringify({
                            url: "amorphic/xhr?path=" + path,
                            message: {ver: appVersion, startingSequence: 0, sessionExpiration: sessionExpiration}
                        })
                    },
                    getModelSource: function () {
                        return applicationSource[path];
                    },
                    getServerConfigString: function () {
                        return JSON.stringify(config.appConfig);
                    }
                }
            });
        }
    }

    // Create or restore the controller
    var newSession = false;
    if (!session.semotus || !session.semotus.controllers[path] || reset || newControllerId)
    {
        newSession = newControllerId ? false : true;
        if (!session.semotus)
            session.semotus = {controllers: {}};
        var time = process.hrtime();
        var controller = getController(path, controllerPath, initObjectTemplate, session, objectCacheExpiration, sessionStore, newPage, true, newControllerId, req);
        controller.__template__.objectTemplate.reqSession = req.session;
        var diff = process.hrtime(time);
        var took = (diff[0] * 1e9 + diff[1]) / 1000000;
        if (performanceLogging)
            console.log("create controller took " + took + " ms");

    } else {
        var controller = getController(path, controllerPath, initObjectTemplate, session, objectCacheExpiration, sessionStore, newPage, false, null, req);
        controller.__template__.objectTemplate.reqSession = req.session;
    }

    controller.__request = req;
    controller.__sessionExpiration = sessionExpiration;

    var ret =
    {
        objectTemplate: controller.__template__.objectTemplate,
        getMessage: function () {
            var message = controller.__template__.objectTemplate.getMessage(session.id, true);
            message.newSession = true;
            message.rootId = controller.__id__;
            message.startingSequence = controller.__template__.objectTemplate.maxClientSequence + 100000;
            message.sessionExpiration = sessionExpiration;
            return message;
        },
        getServerConnectString: function () {
            var message = this.getMessage();
            message.ver = appVersion;
            return JSON.stringify({
                url: "amorphic/xhr?path=" + path,
                message: message
            })
        },
        getServerConfigString: function () {
            return JSON.stringify(config.appConfig);
        },
        getModelSource: function () {
            return applicationSource[path];
        },
        save: function (path, session) {
            saveSession(path, session, controller);
        },
        newSession: newSession,
        appVersion: appVersion
    };

    // Call any initialization function which may actually send messages to the client
    if (newSession && typeof(controller.serverInit) == "function") {
        return Q.resolve(controller.serverInit.call(controller, req, newPage))
            .then(function() {
                // If we are waiting to complete processing of a response take care of that
                if (deferred[session.id])
                    deferred[session.id].resolve();
                saveSession(path, session, controller);
                return Q.fcall(function () {return ret});
            });
    } else {
        if (newPage)
            saveSession(path, session, controller);
        return Q.fcall(function () {return ret});
    }
}
var controllers = {};

function getTemplates(objectTemplate, prefix, templates, config, path) {

    var requires = {};
    var ref = {};
    var mixins = [];
    var toRoot = __dirname.match(/node_modules/) ? "../../" : "./";

    function getTemplate(file) {
        file.match(/([0-9A-Za-z_]*)\.js/);
        var prop = RegExp.$1;
        if (requires[prop])
            return requires[prop];
        if (ref[prop])
            throw  new Error("circular reference on " + file);
        ref[prop] = true;
        if (fs.existsSync(__dirname + "/" + toRoot + prefix + file)) {
            var clientPath = path;
            var require_results = require(toRoot + prefix + file);
        } else {
            var clientPath = 'common';
            var require_results = require(toRoot + 'apps/common/js/' + file);
        }
        var initializer = (require_results[prop]);
        var mixins_initializer = (require_results[prop + "_mixins"]);
        if (typeof(initializer) != "function")
            throw  new Error(prop + " not exported in " + prefix + file);
        var templates = initializer(objectTemplate, getTemplate);
        requires[prop] = templates;
        if (mixins_initializer)
            mixins.push(mixins_initializer);

        if (typeof(path) != 'undefined') {
            if (sourceMode == 'debug') {
                applicationSource[path] += "document.write(\"<script src='/" + clientPath + "/js/" + file + "'></script>\");\n\n";
            } else {
                applicationSource[path] += "module.exports." + prop + " = " + require_results[prop] + "\n\n";
                if (mixins_initializer)
                    applicationSource[path] += "module.exports." + prop + "_mixins = " + mixins_initializer + "\n\n";
            }
        }
        return templates;
    }

    for (var ix = 0; ix < templates.length; ++ix)
        getTemplate(templates[ix]);

    for (var ix = 0;ix < mixins.length;++ix)
        if (mixins[ix])
            (mixins[ix])(objectTemplate, requires);

    if (config && config.appConfig && config.appConfig.modules)
        for(var mixin in config.appConfig.modules)
            if (!config.appConfig.modules[mixin].require)
                console.log("Module " + mixin + " missing a requires property ");
            else if (typeof(require(config.appConfig.modules[mixin].require)[mixin + "_mixins"]) != "function")
                console.log(config.appConfig.modules[mixin].require + " must export a " + mixin +
                    "_mixins property which is an initialization function");
            else {
                var requireName = config.appConfig.modules[mixin].require;
                var results = require(requireName);
                results[mixin + "_mixins"](objectTemplate, requires, config.appConfig.modules[mixin], config.appConfig.nconf);
                if (typeof(path) != 'undefined')
                    if (sourceMode == 'debug') {
                        applicationSource[path] += "document.write(\"<script src='/modules/" + requireName + "/index.js'></script>\");\n\n";
                    } else {
                        applicationSource[path] += "module.exports." + mixin + "_mixins = " + results[mixin + "_mixins"] + "\n\n";
                    }
            }

    objectTemplate.performInjections();
    return requires;
}
/**
 * Create a controller template that has a unique RemoteObjectTemplate instance that is
 * for one unique session
 *
 * @param path - unique path for application
 * @param controllerPath - file path for controller objects
 * @param initObjectTemplate - callback for dependency injection into controller
 * @param session - connect session object
 * @param objectCacheExpiration - seconds to expire controller object cache
 * @param sessionStore - session implementation
 * @param newPage - force returning everything since this is likely a session continuation on a new web page
 * @param reset - create new clean empty controller losing all data
 * @param req - connect request
 * @returns {*}
 */
function getController(path, controllerPath, initObjectTemplate, session, objectCacheExpiration, sessionStore, newPage, reset, controllerId,  req)
{
    var sessionId = session.id;
    var config = applicationConfig[path];


    // Manage the controller cache
    if (!controllers[sessionId + path])
        controllers[sessionId + path] = {};
    var cachedController = controllers[sessionId + path];

    // Clear controller from cache if need be
    if (reset || newPage)
    {
        if (cachedController.timeout)
            clearTimeout(cachedController.timeout);
        controllers[sessionId + path] = {};
        cachedController = controllers[sessionId + path];
        if (reset) // Hard reset makes sure we create a new controller
            session.semotus.controllers[path] = null;
    }

    // We cache the controller object which will reference the object template and expire it
    // as long as there are no pending calls.  Note that with a memory store session manager
    // the act of referencing the session will expire it if needed
    var timeoutAction = function ()
    {
        sessionStore.get(sessionId, function (error, session) {
            if (!session)
                log(1, sessionId, "Session has expired");
            if (!session || cachedController.controller.__template__.objectTemplate.getPendingCallCount() == 0) {
                controllers[sessionId + path] = null;
                log(1, sessionId, "Expiring controller cache for " + path);
            } else {
                cachedController.timeout = setTimeout(timeoutAction, objectCacheExpiration);
                log(2, sessionId, "Extending controller cache timeout because of pending calls for " + path);
            }
        });
    }

    // Return controller from the cache if possible regenerating timeout
    if (cachedController.controller) {
        clearTimeout(cachedController.timeout);
        cachedController.timeout = setTimeout(timeoutAction, objectCacheExpiration);
        log(2, sessionId, "Extending controller cache timeout because of reference ");
        return cachedController.controller;
    }

    var requires = {};
    controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/)
    var prefix = RegExp.$1;
    var prop = RegExp.$2

    // Create a new unique object template utility
    var objectTemplate = require("persistor")(ObjectTemplate, RemoteObjectTemplate, RemoteObjectTemplate);

    // Inject into it any db or persist attributes needed for application
    initObjectTemplate(objectTemplate);


    // Get the controller and all of it's dependent requires which will populate a
    // key value pairs where the key is the require prefix and and the value is the
    // key value pairs of each exported template
    applicationSource[path] = "";
    var requires = getTemplates(objectTemplate, prefix, [prop + ".js"], config, path);

    var controllerTemplate = requires[prop].Controller;
    if (!controllerTemplate)
        throw  new Error("Missing controller template in " + prefix + prop + ".js");
    controllerTemplate.objectTemplate = objectTemplate;

    // Setup unique object template to manage a session

    objectTemplate.createSession("server", null, session.id);
    var browser = " - browser: " + req.headers['user-agent'] + " from: " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress);

    // Either restore the controller from the serialized string in the session or create a new one

    if (!session.semotus.controllers[path]) {
        var controller = controllerId ?
            objectTemplate._createEmptyObject(controllerTemplate, controllerId) :
            new controllerTemplate();
        if (controllerId)
            objectTemplate.syncSession();
        log(1, sessionId, "Creating new controller " + (newPage ? " new page " : "") + browser);
    } else {
        var controller = objectTemplate.fromJSON(session.semotus.controllers[path], controllerTemplate);
        log(1, sessionId, "Restoring saved controller " + (newPage ? " new page " : "") + browser);
        if (!newPage) // No changes queued as a result unless we need it for init.js
            objectTemplate.syncSession();
    }
    objectTemplate.controller = controller;
    controller.__sessionId = sessionId;

    // Set it up in the cache
    cachedController.controller = controller;
    cachedController.timeout = setTimeout(timeoutAction, objectCacheExpiration);

    return controller;
}

function saveSession(path, session, controller) {
    var request = controller.__request;
    controller.__request = null;
    var time = process.hrtime();
    session.semotus.controllers[path] = controller.toJSONString();
    session.semotus.lastAccess = new Date(); // Tickle it to force out cookie
    var diff = process.hrtime(time);
    var took = (diff[0] * 1e9 + diff[1]) / 1000000;
    if (performanceLogging)
        console.log("save session " + took + " ms - length = " + session.semotus.controllers[path].length);

    controller.__request = request;
    var ourObjectTemplate = controller.__template__.objectTemplate;
}
var downloads;
function setDownloadDir(dir) {
    downloads = dir;
}
function processFile(req, resp, next)
{
    if (!downloads) {
        console.log("no download directory");
        next();
        return;
    }

    var form = new formidable.IncomingForm();
    form.uploadDir = downloads;
    form.parse(req, function(err, fields, files) {
        if (err)
            console.log(err);
        resp.writeHead(200, {'content-type': 'text/html'});
        var file = files.file.path;
        console.log(file);
        setTimeout(function () {
            fs.unlink(file, function (err) {
                if (err)
                    console.log(err)
                else {
                    console.log(file + ' deleted');
                }
            })}, 60000);
        resp.end('<html><body><script>top.amorphic.prepareFileUpload(\'package\');top.amorphic.uploadFunction.call()</script></body></html>');
        req.session.file = file;
    });
}

/**
 * Process JSON request message
 *
 * @param req
 * @param resp
 */

function processMessage(req, resp)
{
    var start = process.hrtime();
    var session = req.session;
    var message = req.body;
    var path = url.parse(req.url, true).query.path;
    if (!message.sequence) {
        log(1, req.session.id, "ignoring non-sequenced message");
        resp.writeHead(500, {"Content-Type": "text/plain"});
        resp.end("ignoring non-sequenced message");
        return;
    }
    var newPage = message.type == "refresh" ? true : false;
    var forceReset = message.type == "reset" ? true : false;

    establishServerSession(req, path, newPage, forceReset, message.rootId).then (function (semotus)
    {
        var diff = process.hrtime(start);
        var took = (diff[0] * 1e9 + diff[1]) / 1000000;
        if (performanceLogging)
            console.log("establish session " + took);

        var ourObjectTemplate = semotus.objectTemplate;
        var remoteSessionId = req.session.id;

        // If we expired just return a message telling the client to reset itself
        if (semotus.newSession || newPage || forceReset)
        {
            log(1, remoteSessionId, "Force reset on " + message.type + " " + (semotus.newSession ? 'new session' : '') +
                " [" + message.sequence + "]");
            semotus.save(path, session);
            var outbound = semotus.getMessage();
            outbound.ver = semotus.appVersion;
            resp.end(JSON.stringify(outbound));  // return a sync message assuming no queued messages
            return;
        }

        // When RemoteObjectTemplate sends a message it will either be a response or
        // a callback to the client.  In either case return a response and prevent
        // any further messages from being generated as these will get handled on
        // the next call into the server
        var sendMessage = function (message)
        {
            ourObjectTemplate.setSession(remoteSessionId);
            ourObjectTemplate.enableSendMessage(false);
            semotus.save(path, session);
            message.ver = semotus.appVersion;
            var respstr = JSON.stringify(message)
            resp.end(respstr);
            var diff = process.hrtime(start);
            var took = (diff[0] * 1e9 + diff[1]) / 1000000;
            if (performanceLogging)
                console.log("processing request took " + took + " response length = " + respstr.length);

        }
        deferred[req.session.id] = Q.defer();
        deferred[req.session.id].promise.then(function() {
            log(1, req.session.id, "sending deferred empty response");
            ourObjectTemplate.setSession(remoteSessionId);
            ourObjectTemplate.enableSendMessage(false);
            semotus.save(path, session);
            resp.end("");
            delete deferred[req.session.id];
        }).done();
        ourObjectTemplate.enableSendMessage(true, sendMessage);  // Enable the sending of the message in the response
        try {
            ourObjectTemplate.processMessage(message);
        } catch (error) {
            log(0, req.sessionId, error);
            resp.writeHead(500, {"Content-Type": "text/plain"});
            resp.end(error.toString());
        }
    }).fail(function(error){
        log(0, req.sessionId, error);
        resp.writeHead(500, {"Content-Type": "text/plain"});
        resp.end(error.toString());
    }).done();
}

function route(req, resp, next) {
    if (req.url.match(/amorphic\/xhr\?path\=/))
        processMessage(req, resp);
    else
        next();
}
function uploadRoute(req, resp, next) {
    if (req.url.match(/amorphic\/xhr\?path\=/) && url.parse(req.url, true).query.file)
        processFile(req, resp,next)
    else
        next();
}
function log (level, sessionId, data) {
    if (level > logLevel)
        return;
    var t = new Date();
    var time = t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate() + " " +
        t.toTimeString().replace(/ .*/, '') + ":" + t.getMilliseconds();
    var message = (time + "(" + sessionId +") " + "Semotus:" + data);
    console.log(message);
    if (level == 0 && logger)
        setTimeout(function () {logger.call(null, message)}, 0);

}

function listen(dirname, sessionStore, preSessionInject, postSessionInject)
{
    var sys = require('sys');
    var exec = require('child_process').exec;
    var fs = require('fs');
    var Q = require('q');
    var url = require('url');
    var MongoClient = require('mongodb').MongoClient;
    var connect = require('connect');
    var http = require('http');
    var https = require('https');
    var amorphic = require('amorphic');
    var path = require('path');

    // Create temporary directory for file uploads
    var downloads = path.join(path.dirname(require.main.filename), "download");
    if (!fs.existsSync(downloads))
        fs.mkdirSync(downloads);
    var files = fs.readdirSync(downloads);
    for (var ix = 0; ix < files.length; ++ix)
        fs.unlinkSync(path.join(downloads, files[ix]));
    amorphic.setDownloadDir(downloads);


    // Configuraiton file
    var nconf = require('nconf');
    nconf.argv().env();
    nconf.file('checkedin', 'config.json');
    nconf.file('local', 'config_secure.json');

    // Global varibles
    var sessionExpiration = nconf.get('sessionSeconds') * 1000;
    var objectCacheExpiration = nconf.get('objectCacheSeconds') * 1000;
    var dbname = nconf.get('dbname');
    var dbpath = nconf.get('dbpath');

    sessionStore = sessionStore || new (connect.session.MemoryStore)();
    var sessionRouter = connect.session(
        {store: sessionStore, secret: nconf.get('sessionSecret'),
            cookie: {maxAge: sessionExpiration}, rolling: true}
    );

    // Initialize applications

    var appList = nconf.get('applications');
    var appStartList = nconf.get('application') + ';';
    var mainApp = nconf.get('application').split(';')[0];
    var promises = [];
    var isNonBatch = false;
    var schemas = {};
    for (var appKey in appList)
    {
        if (appStartList.match(appKey + ';'))
        (function () {
            var appName = appKey;
            var path = appList[appName];
            var cpath = dirname + '/apps/common/';
            function readFile (file) {return file && fs.existsSync(file) ? fs.readFileSync(file) : null;}
            var config = JSON.parse((readFile(path + "/config.json") || readFile(cpath + "/config.json")).toString());
            config.nconf = nconf; // global config
            var schema = JSON.parse((readFile(path + "/schema.json") || readFile(cpath + "/schema.json")).toString());
            schemas[appKey] = schema;

            var dbName = nconf.get(appName + '_dbName') || config.dbName || dbname;
            var dbPath = nconf.get(appName + '_dbPath') || config.dbPath || dbpath;
            if (dbName && dbPath) {
                promises.push(Q.ninvoke(MongoClient, "connect", dbPath + dbName).then (function (db)
                        {
                            console.log("DB connection established to " + dbName);
                            function injectObjectTemplate (objectTemplate) {
                                objectTemplate.setDB(db);
                                objectTemplate.setSchema(schema);
                                objectTemplate.config = config;
                                objectTemplate.logLevel = nconf.get('logLevel') || 1;
                            }

                            amorphic.establishApplication(appName,
                                    path + (config.isDaemon ? '/js/controller.js' :'/public/js/controller.js'), injectObjectTemplate,
                                sessionExpiration, objectCacheExpiration, sessionStore, null, config.ver, config);

                            if (config.isDaemon) {
                                amorphic.establishDaemon(appName);
                                console.log(appName + " started as a daemon");
                            } else
                                promises.push(Q(true));

                        },
                        function(e) {console.log(e.message)}).fail(function (e) {console.log(e.message + e.stack)})
                )} else {

                // No database case

                function injectObjectTemplate(objectTemplate) {
                    objectTemplate.config = config;
                    objectTemplate.logLevel = nconf.get('logLevel') || 1;
                }

                amorphic.establishApplication(appName,
                        path + (config.isDaemon ? '/js/controller.js' :'/public/js/controller.js'), injectObjectTemplate,
                    sessionExpiration, objectCacheExpiration, sessionStore, null, config.ver, config);

                if (config.isDaemon) {
                    amorphic.establishDaemon(appName);
                    console.log(appName + " started as a daemon");
                } else
                    promises.push(Q(true));


            }
        })();
    }

    Q.all(promises).then( function ()
    {
        var app = connect();

        if (preSessionInject)
            preSessionInject.call(null, app);

        for (var appName in appList) {
            if (appStartList.match(appKey + ';')) {
                var path = dirname + "/" + appList[appName] + "/public";
                app.use("/" + appName + '/', connect.static(path, {index: "index.html"}));
                if (appName == mainApp)
                    app.use("/", connect.static(path, {index: "index.html"}));
                console.log("Url " + url + " connected to " + path);
            }
        }

        rootSuperType = fs.existsSync(dirname + "/node_modules/supertype") ? dirname : __dirname;
        rootSemotus = fs.existsSync(dirname + "/node_modules/semotus") ? dirname : __dirname;

        app
            .use('/modules/', connect.static(dirname + "/node_modules"))
            .use('/bindster/', connect.static(__dirname + "/node_modules/amorphic-bindster"))
            .use('/amorphic/', connect.static(__dirname))
            .use('/common/', connect.static(dirname + "/apps/common"))
            .use('/supertype/', connect.static(rootSuperType + "/node_modules/supertype"))
            .use('/semotus/', connect.static(rootSemotus + "/node_modules/semotus"))
            .use(connect.cookieParser())
            .use(sessionRouter)
            .use(amorphic.uploadRouter)
            .use(connect.bodyParser())
            .use('/amorphic/init/' , function (request, response) {
                console.log ("Requesting " + request.originalUrl);
                if(request.originalUrl.match(/([A-Za-z0-9_]*)\.js/)) {
                    var appName = RegExp.$1;
                    console.log("Establishing " + appName);
                    amorphic.establishServerSession(request, appName, "initial")
                        .then (function (session) {
                        response.setHeader("Content-Type", "application/javascript");
                        response.setHeader("Cache-Control", "public, max-age=0");
                        response.end(
                                "amorphic.setSchema(" + JSON.stringify(schemas[appName]) + ");" +
                                session.getModelSource() +
                                "amorphic.setConfig(" + session.getServerConfigString() +");" +
                                "amorphic.setInitialMessage(" + session.getServerConnectString() +");"
                        );
                    }).done();
                }
            })
            .use(amorphic.router);

        if (postSessionInject)
            postSessionInject.call(null, app);

        app.listen(nconf.get('port'));
    }).fail(function(e){console.log(e.message + " " + e.stack)});
}
module.exports = {
    establishApplication: establishApplication,
    establishDaemon: establishDaemon,
    establishServerSession: establishServerSession,
    saveSession: saveSession,
    processMessage: processMessage,
    router: route,
    uploadRouter: uploadRoute,
    getTemplates: getTemplates,
    setDownloadDir: setDownloadDir,
    listen: listen
}