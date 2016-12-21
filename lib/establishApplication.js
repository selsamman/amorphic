'use strict';

var log = require('./utils').log;
var persistor = require('persistor');
var semotus = require('semotus');
var getTemplates = require('./getTemplates').getTemplates;

/**
 * Purpose unknown
 *
 * @param {unknown} appPath unknown
 * @param {unknown} path unknown
 * @param {unknown} cpath unknown
 * @param {unknown} initObjectTemplate unknown
 * @param {unknown} sessionExpiration session expiration time in ms
 * @param {unknown} objectCacheExpiration object cache expiration time in ms
 * @param {unknown} sessionStore connect-redis handle
 * @param {unknown} _loggerCall unknown
 * @param {unknown} appVersion unknown
 * @param {unknown} appConfig unknown
 * @param {unknown} logLevel unknown
 * @param {unknown} amorphicOptions unknown
 * @param {Object} applicationConfig The global application configuration.
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 */
function establishApplication(appPath, path, cpath, initObjectTemplate, sessionExpiration, objectCacheExpiration,
                              sessionStore, _loggerCall, appVersion, appConfig, logLevel, amorphicOptions,
                              applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap,
                              applicationPersistorProps) {

    applicationConfig[appPath] = {
        appPath: path,
        commonPath: cpath,
        initObjectTemplate: initObjectTemplate,
        sessionExpiration: sessionExpiration,
        objectCacheExpiration: objectCacheExpiration,
        sessionStore: sessionStore,
        appVersion: appVersion,
        appConfig: appConfig,
        logLevel: logLevel || 'info'
    };

    log(1, '', 'semotus establishing application for ' + appPath, nonObjTemplatelogLevel);

    if (amorphicOptions.sourceMode != 'debug' && !appConfig.isDaemon) { //TODO: Why am I not doing this in debug mode?
        var config = applicationConfig[appPath];
        var controllerPath = config.appPath + (config.appConfig.controller || 'controller.js');

        controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/); // TODO: What is this solving?

        var prop = RegExp.$2; //TODO: THIS SHOULD NOT BE USED IN PRODUCTION
        var persistableSemotableTemplate = persistor(null, null, semotus);

        applicationSource[appPath] = '';
        applicationSourceMap[appPath] = '';
        initObjectTemplate(persistableSemotableTemplate);

        getTemplates(persistableSemotableTemplate, config.appPath, [prop + '.js'], config, appPath, true,
          null, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
    }
}

module.exports = {
    establishApplication: establishApplication
};
