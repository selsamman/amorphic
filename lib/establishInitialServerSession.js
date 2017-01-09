'use strict';

var AmorphicContext = require('./AmorphicContext');
var persistor = require('persistor');
var semotus = require('semotus');
var getTemplates = require('./getTemplates').getTemplates;
var getServerConfigString = require('./getServerConfigString').getServerConfigString;
var Bluebird = require('bluebird');

/**
 * Purpose unknown
 *
 * @param {Object} req - Connect request object.
 * @param {String} controllerPath - The path to the main controller js file.
 * @param {Function} initObjectTemplate - Function that injects properties and functions onto each object template.
 * @param {String} path - The app name.
 * @param {unknown} appVersion unknown
 * @param {unknown} sessionExpiration unknown
 *
 * @returns {unknown} unknown
 */
function establishInitialServerSession(req, controllerPath, initObjectTemplate, path, appVersion, sessionExpiration) {

    var amorphicOptions = AmorphicContext.amorphicOptions;
    var applicationConfig = AmorphicContext.applicationConfig;
    var applicationPersistorProps = AmorphicContext.applicationPersistorProps;
    var config = applicationConfig[path];

    var match = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    var prop = match[2];

    // Create a new unique object template utility
    var persistableSemotableTemplate = persistor(null, null, semotus);

    // Inject into it any db or persist attributes needed for application
    initObjectTemplate(persistableSemotableTemplate);

    // Get the controller and all of it's dependent requires which will populate a
    // key value pairs where the key is the require prefix and and the value is the
    // key value pairs of each exported template

    // Get the templates to be packaged up in the message if not pre-staged
    if (amorphicOptions.sourceMode === 'debug') {
        getTemplates(persistableSemotableTemplate, config.appPath, [prop + '.js'], config, path, null, null);
    }

    req.amorphicTracking.addServerTask({name: 'Creating Session without Controller'}, process.hrtime());

    return Bluebird.try(function h() {
        return {
            appVersion: appVersion,

            getMessage: function gotMessage() {
                return {
                    ver: appVersion,
                    startingSequence: 0,
                    sessionExpiration: sessionExpiration
                };
            },

            getServerConnectString: function i() {
                return JSON.stringify({
                    url: '/amorphic/xhr?path=' + path,
                    message: this.getMessage()
                });
            },

            getServerConfigString: function j() {
                return getServerConfigString(config);
            },

            getPersistorProps: function k() {
                if (amorphicOptions.sourceMode === 'debug') {
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


module.exports = {
    establishInitialServerSession: establishInitialServerSession
};
