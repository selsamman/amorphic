'use strict';

/**
 * Purpose unknown
 *
 * @param {unknown} config unknown
 *
 * @returns {unknown} unknown
 */
function getServerConfigString(config) {
    let browserConfig = {};
    let whitelist = (config.appConfig.toBrowser || {});

    whitelist.modules = true;
    whitelist.templateMode = true;
    whitelist.lazyTemplateLoad = true;

    for (let key in whitelist) {
        browserConfig[key] = config.appConfig[key];
    }

    return JSON.stringify(browserConfig);
}

module.exports = {
    getServerConfigString: getServerConfigString
};
