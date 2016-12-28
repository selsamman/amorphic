'use strict';

var AmorphicContext = require('./AmorphicContext');
var persistor = require('persistor');
var semotus = require('semotus');
var getTemplates = require('./getTemplates').getTemplates;
var getServerConfigString = require('./getServerConfigString').getServerConfigString;
var Q = require('q');

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} controllerPath unknown
 * @param {unknown} initObjectTemplate unknown
 * @param {unknown} path unknown
 * @param {unknown} time unknown
 * @param {unknown} appVersion unknown
 * @param {unknown} sessionExpiration unknown
 *
 * @returns {unknown} unknown
 */
function establishInitialServerSession(req, controllerPath, initObjectTemplate, path, time, appVersion,
                                       sessionExpiration) {

    var amorphicOptions = AmorphicContext.amorphicOptions;
    var applicationConfig = AmorphicContext.applicationConfig;
    var applicationSource = AmorphicContext.applicationSource;
    var applicationSourceMap = AmorphicContext.applicationSourceMap;
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
    if (amorphicOptions.sourceMode == 'debug') {
        getTemplates(persistableSemotableTemplate, config.appPath, [prop + '.js'], config, path, null, null);
    }

    req.amorphicTracking.addServerTask({name: 'Creating Session without Controller'}, time);

    return Q.fcall(function h() {
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


module.exports = {
    establishInitialServerSession: establishInitialServerSession
};
