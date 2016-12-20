var Persistor = require('persistor');
var SuperType = require('supertype');
var getTemplates = require('./getTemplates').getTemplates;

/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 */
function establishDaemon(path,
                         applicationConfig, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps) {
    // Retrieve configuration information
    var config = applicationConfig[path];
    var appTemplates;
    var controllerPath;
    var controllerTemplate;
    var matches;
    var persistableTemplate;
    var prefix;
    var prop;

    if (!config) {
        throw new Error('Amorphic: establishDaemon called with a path of ' + path + ' which was not registered');
    }

    // Create a new unique object template utility. This is a daemon so no need for semotus.
    persistableTemplate = Persistor(null, null, SuperType);

    // Inject into it any db or persist attributes needed for application
    if (config.initObjectTemplate && typeof config.initObjectTemplate === 'function') {
        config.initObjectTemplate(persistableTemplate);
    }

    controllerPath = config.appPath + (config.appConfig.controller || 'controller.js');
    matches = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    prefix = matches[1] || '';
    prop = matches[2] || '';

    appTemplates = getTemplates(persistableTemplate, config.appPath, [prop + '.js'], config, path, null, null, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
    controllerTemplate = appTemplates[prop].Controller;

    if (!controllerTemplate) {
        throw new Error('Missing controller template in ' + prefix + prop + '.js');
    }

    controllerTemplate.objectTemplate = persistableTemplate;

    var controller = new controllerTemplate();

    // Since this is the 'objectTemplate' passed into every file, make sure it has its controller set.
    persistableTemplate.controller = controller;

    controller.serverInit();
}

module.exports = {
    establishDaemon: establishDaemon
};
