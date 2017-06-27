'use strict';

// Internal modules
let AmorphicContext = require('./AmorphicContext');
let ConfigBuilder = require('./utils/configBuilder').ConfigBuilder;
let ConfigApi = require('./utils/configBuilder').ConfigAPI;
let logMessage = require('./utils/logger').logMessage;
let startApplication = require('./startApplication');
let readFile = require('./utils/readFile').readFile;

/**
 * Connect to the database
 *
 * @param {unknown} configPath unknown
 * @param {unknown} schemaPath unknown
 *
 * @returns {unknown} unknown.
 */
function startup(configPath, schemaPath) {
    if (!configPath) {
        throw new Error('startup(configPath, schemaPath?) called without a config path');
    }

    schemaPath = schemaPath || configPath;

    let builder = new ConfigBuilder(new ConfigApi());
    let configStore = builder.build(configPath);
    let config = configStore['root'].get();

    config.nconf = configStore['root']; // Global config
    config.configStore = configStore;

    let schema = JSON.parse((readFile(schemaPath + '/schema.json')).toString());

    logMessage(JSON.stringify(configStore.root.get()));

    return startApplication.setUpInjectObjectTemplate('__noapp__', config, schema)
        .then (function a(injectObjectTemplate) {
            return injectObjectTemplate(this);
        }.bind(this))
        .then (function b() {
            this.performInjections();
        }.bind(this));
}

module.exports = {
    startup: startup
};
