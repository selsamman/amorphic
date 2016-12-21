var logMessage = require('./utils').logMessage;
var establishServerSession = require('./establishServerSession').establishServerSession;
var getModelSource = require('./getModelSource').getModelSource;
var getModelSourceMap = require('./getModelSourceMap').getModelSourceMap;
var displayPerformance = require('./displayPerformance').displayPerformance;
var Q = require('q');

/**
 * Purpose unknown
 *
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} sessions unknown
 * @param {unknown} applicationPersistorProps unknown
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} sendToLog unknown
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function amorphicEntry(applicationSourceMap, amorphicOptions, applicationSource, applicationConfig, sessions,
                       applicationPersistorProps, hostName, controllers, nonObjTemplatelogLevel, sendToLog,
                       req, resp, next) {

    // If we're not initalizing
    if (!req.url.match(/amorphic\/init/)) {
        next();
    }

    logMessage('Requesting ' + req.originalUrl);

    req.amorphicTracking.loggingContext.session = req.session.id;

    req.amorphicTracking.loggingContext.ipaddress = (String(req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown';

    var time = process.hrtime();
    var appName;

    if (req.originalUrl.match(/([A-Za-z0-9_]*)\.cached.js.map/)) {
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        resp.setHeader('Content-Type', 'application/javascript');
        resp.setHeader('Cache-Control', 'public, max-age=31556926');
        resp.end(getModelSourceMap(appName, applicationSourceMap));

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

        resp.end(getModelSource(appName, applicationSource));

        req.amorphicTracking.addServerTask('Request Compressed Sources', time);
        displayPerformance(req);
    }
    else if (req.originalUrl.match(/([A-Za-z0-9_-]*)\.js/)) {
        // This is where you come to when you hit the page the first time, like insurify's okta post.'
        var url = req.originalUrl;
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        logMessage('Establishing ' + appName);

        establishServerSession(req, appName, 'initial', false, null, applicationConfig, sessions, amorphicOptions,
            applicationSource, applicationSourceMap, applicationPersistorProps, hostName, controllers,
            nonObjTemplatelogLevel, sendToLog)
            .then (function a(session) {
                var time = process.hrtime();

                if (req.method == 'POST' && session.objectTemplate.controller.processPost) {
                    Q(session.objectTemplate.controller.processPost(
                        req.originalUrl, req.body, req)).then(function b(controllerResp) {
                            session.save(appName, req.session, req);
                            resp.writeHead(controllerResp.status, controllerResp.headers ||
                                {'Content-Type': 'text/plain'});
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
                            getModelSource(appName, applicationSource) +
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

module.exports = {
    amorphicEntry: amorphicEntry
};
