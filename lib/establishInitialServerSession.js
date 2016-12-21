var Persistor = require('persistor');
var Semotus = require('semotus');
var getTemplates = require('./getTemplates').getTemplates;
var getServerConfigString = require('./getServerConfigString').getServerConfigString;
var Q = require('q');

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
 * @param {unknown} applicationPersistorProps unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 *
 * @returns {unknown} unknown
 */
function establishInitialServerSession(req, config, controllerPath, initObjectTemplate, path, time, appVersion,
                                       sessionExpiration, applicationPersistorProps, amorphicOptions, applicationSource,
                                       applicationSourceMap) {

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
        getTemplates(persistableSemotableTemplate, config.appPath, [prop + '.js'], config, path, null, null,
            amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
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
