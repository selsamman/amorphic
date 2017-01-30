'use strict';

// Internal modules
let AmorphicContext = require('./AmorphicContext');
let Logger = require('./utils/logger');
let logMessage = Logger.logMessage;
let uploadRouter = require('./routers/uploadRouter').uploadRouter;
let initializePerformance = require('./utils/initializePerformance').initializePerformance;
let amorphicEntry = require('./amorphicEntry').amorphicEntry;
let postRouter = require('./routers/postRouter').postRouter;
let downloadRouter = require('./routers/downloadRouter').downloadRouter;
let router = require('./routers/router').router;
let generateDownloadsDir = require('./utils/generateDownloadsDir').generateDownloadsDir;
let nonObjTemplatelogLevel = 1;

// Npm modules
let connect = require('connect');
let fs = require('fs');

/**
 * Purpose unknown
 *
 * @param {unknown} preSessionInject unknown
 * @param {unknown} postSessionInject unknown
 * @param {unknown} appList unknown
 * @param {unknown} appStartList unknown
 * @param {unknown} appDirectory unknown
 * @param {unknown} sessionRouter unknown
 */
function startUpServer(preSessionInject, postSessionInject, appList, appStartList, appDirectory, sessionRouter) {

    let controllers = {};
    let downloads;
    let sessions = {};

    let amorphicOptions = AmorphicContext.amorphicOptions;
    let mainApp = amorphicOptions.mainApp;
    let appContext = AmorphicContext.appContext;
    let app = connect();

    downloads = generateDownloadsDir();

    if (amorphicOptions.compressXHR) {
        app.use(require('compression')());
    }

    if (preSessionInject) {
        preSessionInject.call(null, app);
    }

    for (let appName in appList) {
        if (appStartList.indexOf(appName) >= 0) {
            let appPath = appDirectory + '/' + appList[appName] + '/public';

            app.use('/' + appName + '/', connect.static(appPath, {index: 'index.html'}));

            if (appName === mainApp) {
                app.use('/', connect.static(appPath, {index: 'index.html'}));
            }

            logMessage(appName + ' connected to ' + appPath);
        }
    }

    // TODO: Do we actually need these checks?
    let rootSuperType = __dirname;

    if (fs.existsSync(appDirectory + '/node_modules/supertype')) {
        rootSuperType = appDirectory;
    }

    let rootSemotus = __dirname;

    if (fs.existsSync(appDirectory + '/node_modules/semotus')) {
        rootSemotus = appDirectory;
    }

    let rootBindster = __dirname;

    if (fs.existsSync(appDirectory + '/node_modules/amorphic-bindster')) {
        rootBindster = appDirectory;
    }

    app.use(initializePerformance)
        .use('/modules/', connect.static(appDirectory + '/node_modules'))
        .use('/bindster/', connect.static(rootBindster + '/node_modules/amorphic-bindster'))
        .use('/amorphic/', connect.static(appDirectory + '/node_modules/amorphic'))
        .use('/common/', connect.static(appDirectory + '/apps/common'))
        .use('/supertype/', connect.static(rootSuperType + '/node_modules/supertype'))
        .use('/semotus/', connect.static(rootSemotus + '/node_modules/semotus'))
        .use(connect.cookieParser())
        .use(connect.bodyParser())
        .use(sessionRouter);

    if (postSessionInject) {
        postSessionInject.call(null, app);
    }

    app.use(uploadRouter.bind(this, downloads))
        .use(downloadRouter.bind(this, sessions, controllers, nonObjTemplatelogLevel))
        .use(postRouter.bind(this, sessions, controllers, nonObjTemplatelogLevel))
        .use(amorphicEntry.bind(this, sessions, controllers, nonObjTemplatelogLevel))
        .use(router.bind(this, sessions, nonObjTemplatelogLevel, controllers));

    appContext.connectServer = app.listen(amorphicOptions.port);
}

module.exports = {
    startUpServer: startUpServer
};
