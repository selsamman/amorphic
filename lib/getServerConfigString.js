"use strict";

/**
 * Purpose unknown
 *
 * @param {unknown} config unknown
 *
 * @returns {unknown} unknown
 */
function getServerConfigString(config) {
    var browserConfig = {};
    var whitelist = (config.appConfig.toBrowser || {});

    whitelist.modules = true;
    whitelist.templateMode = true;

    for (var key in whitelist) {
        browserConfig[key] = config.appConfig[key];
    }

    return JSON.stringify(browserConfig);
}

module.exports = {
    getServerConfigString: getServerConfigString
};
