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

module.exports = {
    establishDaemon: establishDaemon
};
