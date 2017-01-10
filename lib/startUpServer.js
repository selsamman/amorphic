'use strict';

var AmorphicContext = require('./AmorphicContext');
var Logger = require('./utils/logger');
var logMessage = Logger.logMessage;
var uploadRouter = require('./routers/uploadRouter').uploadRouter;
var initializePerformance = require('./utils/initializePerformance').initializePerformance;
var amorphicEntry = require('./amorphicEntry').amorphicEntry;
var postRouter = require('./routers/postRouter').postRouter;
var downloadRouter = require('./routers/downloadRouter').downloadRouter;
var router = require('./routers/router').router;
var connect = require('connect');
var fs = require('fs');
var controllers = {};
var downloads;
var generateDownloadsDir = require('./utils/generateDownloadsDir').generateDownloadsDir;
var nonObjTemplatelogLevel = 1;
var sessions = {};

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

    var amorphicOptions = AmorphicContext.amorphicOptions;
    var appContext = AmorphicContext.appContext;
    var app = connect();
    downloads = generateDownloadsDir();

    if (amorphicOptions.compressXHR) {
        app.use(require('compression')());
    }

    if (preSessionInject) {
        preSessionInject.call(null, app);
    }

    for (var appName in appList) {
        if (appStartList.indexOf(appName) >= 0) {
            var appPath = appDirectory + '/' + appList[appName] + '/public';

            app.use('/' + appName + '/', connect.static(appPath, {index: 'index.html'}));

            if (appName === mainApp) {
                app.use('/', connect.static(appPath, {index: 'index.html'}));
            }

            logMessage(appName + ' connected to ' + appPath);
        }
    }

    // TODO: Do we actually need these checks?
    var rootSuperType = __dirname;

    if (fs.existsSync(appDirectory + '/node_modules/supertype')) {
        rootSuperType = appDirectory;
    }

    var rootSemotus = __dirname;

    if (fs.existsSync(appDirectory + '/node_modules/semotus')) {
        rootSemotus = appDirectory;
    }

    var rootBindster = __dirname;

    if (fs.existsSync(appDirectory + '/node_modules/amorphic-bindster')) {
        rootBindster = appDirectory;
    }

    app.use(initializePerformance)
        .use('/modules/', connect.static(appDirectory + '/node_modules'))
        .use('/bindster/', connect.static(rootBindster + '/node_modules/amorphic-bindster'))
        .use('/amorphic/', connect.static(appDirectory))
        .use('/common/', connect.static(appDirectory + '/apps/common'))
        .use('/supertype/', connect.static(rootSuperType + '/node_modules/supertype'))
        .use('/semotus/', connect.static(rootSemotus + '/node_modules/semotus'))
        .use(connect.cookieParser())
        .use(sessionRouter)
        .use(uploadRouter.bind(this, downloads))

        .use(downloadRouter.bind(this, sessions, controllers, nonObjTemplatelogLevel))

        .use(connect.bodyParser())

        .use(postRouter.bind(this, sessions, controllers, nonObjTemplatelogLevel))

        .use(amorphicEntry.bind(this, sessions, controllers, nonObjTemplatelogLevel));

    if (postSessionInject) {
        postSessionInject.call(null, app);
    }

    app.use(router.bind(this, sessions, nonObjTemplatelogLevel, controllers));


    appContext.connectServer = app.listen(amorphicOptions.port);
}

module.exports = {
    startUpServer: startUpServer
};
