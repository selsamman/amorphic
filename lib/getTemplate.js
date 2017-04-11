'use strict';

let fs = require('fs');
let path = require('path');
let AmorphicContext = require('./AmorphicContext');
let amorphicOptions = AmorphicContext.amorphicOptions;

// TODO: Audit all the parameters of the function.
function getTemplate(file, options, uses,
                     ignoringClient, requiredTemplates, referencedTemplates, mixinGraph, filesNeeded, appPath, appName,
                     persistObjectTemplate, config, mixins, fileInitializers, filePaths,
                     applicationSourceCandidate, currentContext, UsesV2ReturnPass1) {

    return _getTemplate(
        file,
        options,
        uses
    );

    function _getTemplate(file, options, uses) {
        let previousIgnoringClient = ignoringClient;
        let fileNoExt; //ex: controller (./controller.js)
        let clientPath;
        let fileExports; //result of: require('./controller.js')
        let requirePath;
        let daemonPath;
        let interactivePath;
        let objectTemplateInitialize;
        let objectTemplateInitializePath = '';
        let fileInitializer;
        let fileInitializerPath = '';
        let fileMixinsInitializer;
        let fileMixinsInitializerPath = '';
        let previousToClient;
        let templates;
        let fileSource;
        let fileClientPath;

        options = options || {};

        if (options.client === false) {
            ignoringClient = true;
        }

        if (file) {
            fileNoExt = path.basename(file, '.js');
        }

        if (!ignoringClient) {
            filesNeeded[fileNoExt] = true;
        }

        if (requiredTemplates[fileNoExt]) {
            ignoringClient = previousIgnoringClient;

            return requiredTemplates[fileNoExt];
        }

        if (referencedTemplates[fileNoExt]) {
            if (uses) {
                return;
            }
            else {
                throw new Error('circular reference on ' + file);
            }
        }
        referencedTemplates[fileNoExt] = true;

        // 1. If the file is to be 'required' from a specific app, use
        // that app, otherwise
        // 2. look for the file under the current app,
        // 3. otherwise look under common
        if (options.app) {
            clientPath = options.app;
            daemonPath = config.commonPath + '/../../' + clientPath + '/js/' + file;
            interactivePath = config.commonPath + '/../../' + clientPath + '/public/js/' + file;

            if (fs.existsSync(daemonPath)) {
                fileExports = require(daemonPath);
                requirePath = daemonPath;
            }
            else {
                fileExports = require(interactivePath);
                requirePath = interactivePath;
            }
        }
        else if (fs.existsSync(appPath + file)) {
            clientPath = appName;
            fileExports = require(appPath + file);
            requirePath = appPath + file;
        }
        else {
            clientPath = 'common';
            fileExports = require(config.commonPath + file);
            requirePath = config.commonPath + file;
        }

        // There is a legacy mode where recursive templates are handled with a two-phase two-function call
        // in the templates which return an object with an xxx prop and an xxx_mixin prop named the same as the file
        // In the current mode (V2), a function is returned which is called in two passes.  On the first pass
        // an ObjectTemplate subclass is passed in that only creates templates but does not process their properties
        // and on a second pass converts all create calls to mixins and returns the actual templates when referenced
        // via the getTemplate second parameter
        objectTemplateInitialize = fileExports['objectTemplateInitialize'];
        fileInitializer = fileExports[fileNoExt];
        fileMixinsInitializer = fileExports[fileNoExt + '_mixins'];

        if (objectTemplateInitialize) {
            objectTemplateInitializePath = 'module.exports.objectTemplateInitialize = ' + objectTemplateInitialize + '\n\n';
        }

        if (fileMixinsInitializer) {
            fileMixinsInitializerPath = 'module.exports.' + fileNoExt + '_mixins = ' + fileMixinsInitializer + '\n\n';
        }

        if (typeof(fileInitializer) !== 'function') {
            throw new Error(fileNoExt + ' not exported in ' + appPath + file);
        }

        // Call application code that can poke properties into objecTemplate
        if (!persistObjectTemplate.__initialized__ && objectTemplateInitialize) {
            objectTemplateInitialize(persistObjectTemplate);
        }

        persistObjectTemplate.__initialized__ = true;

        if (config.appConfig && config.appConfig.templateMode === 'auto') {
            // Update persistObjectTemplate create proxy such that it will create the template with
            // an extend proxy that on the second pass may find that the extend was done by deferred
            // processing and so the extend really just needs to mixin the properties
            let oldCreate = persistObjectTemplate.create;

            persistObjectTemplate.create = function p(name) {
                let template = oldCreate.call(persistObjectTemplate, name, {});
                let originalExtend = template.extend;

                template.extend = function q(name, props)  {
                    let template = persistObjectTemplate.__dictionary__[name];

                    if (template) {
                        template.mixin(props);
                    }
                    else {
                        template = originalExtend.call(this, name, props);
                        requiredTemplates[currentContext.moduleName] = requiredTemplates[currentContext.moduleName] || {};
                        requiredTemplates[currentContext.moduleName][template.__name__] = template;
                    }

                    return template;
                };

                let originalMixin = template.mixin;

                template.mixin = function r() {
                    if (currentContext.pass === 2) {
                        if (arguments[0] && arguments[0].isObjectTemplate) {
                            scheduleDeferredMixinProcessing(template, arguments[0]);
                        }
                        else {
                            originalMixin.apply(template, arguments);
                        }
                    }
                };

                requiredTemplates[currentContext.moduleName] = requiredTemplates[currentContext.moduleName] || {};
                requiredTemplates[currentContext.moduleName][template.__name__] = template;

                return template;
            };

            previousToClient = persistObjectTemplate.__toClient__;
            persistObjectTemplate.__toClient__ = !ignoringClient;
            currentContext.moduleName = fileNoExt;

            // Call constructor function with a subclass of persistObjectTemplate and a special uses that wil
            // Return a stub that will simply setup deferred processing for extends
            let initializerReturnValues = fileInitializer(persistObjectTemplate, usesV2Pass1);

            persistObjectTemplate.create = oldCreate;
            fileInitializers[fileNoExt] = fileInitializer;
            persistObjectTemplate.__toClient__ = previousToClient;

            recordStatics(persistObjectTemplate, requiredTemplates, initializerReturnValues, fileNoExt);
        }
        else {
            // Call the initialize function in the template
            previousToClient = persistObjectTemplate.__toClient__;

            persistObjectTemplate.__toClient__ = !ignoringClient;

            let includeMixins = !requiredTemplates[fileNoExt];
            templates = requiredTemplates[fileNoExt] || fileInitializer(persistObjectTemplate, getTemplateInject, usesV1);

            persistObjectTemplate.__toClient__ = previousToClient;
            requiredTemplates[fileNoExt] = templates;

            if (Object.getOwnPropertyNames(templates).length === 0) {
                persistObjectTemplate.__statics__[fileNoExt] = templates;
            }
            else {
                for (let returnVariable in templates) {
                    if (!persistObjectTemplate.__dictionary__[returnVariable]) {
                        persistObjectTemplate.__statics__[returnVariable] = templates[returnVariable];
                    }
                }
            }

            if (fileMixinsInitializer && includeMixins) {
                mixins.push(fileMixinsInitializer);
            }

            fileInitializers[fileNoExt] = fileInitializer;

            if (fileMixinsInitializer) {
                fileInitializers[fileNoExt + '_mixins'] = fileMixinsInitializer;
            }
        }

        filePaths[fileNoExt] = requirePath;

        if (typeof(appName) !== 'undefined') {
            fileClientPath = '/' + clientPath + '/js/' + file + '?ver=' + config.appVersion;
            if (amorphicOptions.sourceMode === 'debug') {
                fileSource = ["document.write(\"<script src='" + fileClientPath + "'></script>\");\n\n"];
            }
            else {
                fileInitializerPath = 'module.exports.' + fileNoExt + ' = ' + fileInitializer + '\n\n';
                fileSource = [
                    fileInitializerPath + objectTemplateInitializePath + fileMixinsInitializerPath,
                    fileClientPath
                ];
            }

            applicationSourceCandidate[fileNoExt] = fileSource;
        }

        ignoringClient = previousIgnoringClient;
        return templates;

        function usesV1(file, options) {
            return _getTemplate(
                file,
                options,
                true
            );
        }

        function getTemplateInject(injectFile, injectOptions, injectUses) {
            return _getTemplate(
                injectFile,
                injectOptions,
                injectUses
            );
        }

        function usesV2Pass1(file, templateName, options) {
            templateName = templateName || path.basename(file, '.js');
            let moduleName = currentContext.moduleName;

            _getTemplate(
                file,
                options,
                true
            );

            currentContext.moduleName = moduleName;

            let staticTemplate = persistObjectTemplate.__statics__[templateName];

            return staticTemplate || new UsesV2ReturnPass1(templateName, fileNoExt);
        }

        // Record a map of the template and the templates being mixed in
        function scheduleDeferredMixinProcessing(template, mixinTemplate) {
            mixinGraph[template.__name__] =  mixinGraph[template.__name__] || {};
            mixinGraph[template.__name__][mixinTemplate.__name__] = true;
        }

    }
}
function recordStatics(persistObjectTemplate, requiredTemplates, initializerReturnValues, fileNoExt) {
    for (let returnVariable in initializerReturnValues) {
        if (!persistObjectTemplate.__dictionary__[returnVariable]) {
            if (!requiredTemplates[fileNoExt]) {
                requiredTemplates[fileNoExt] = {};
            }
            // We can't just replace statics because unlike formal templaes (such as created by createStatic)
            // legacy statics will have already set properties that may refer to templates that had proxies
            // rather than the final instantiation of them
            if (requiredTemplates[fileNoExt][returnVariable]) {
                if (typeof requiredTemplates[fileNoExt][returnVariable] === 'object') {
                    let requiresProps = Object.getOwnPropertyNames(requiredTemplates[fileNoExt][returnVariable]);
                    for (let rx = 0; rx < requiresProps.length; ++rx) {
                        requiredTemplates[fileNoExt][returnVariable][requiresProps[rx]] =
                            initializerReturnValues[returnVariable][requiresProps[rx]];
                    }
                }
            }
            else {
                requiredTemplates[fileNoExt][returnVariable] = initializerReturnValues[returnVariable];
            }
            if (persistObjectTemplate.__statics__[returnVariable]) {
                if (typeof persistObjectTemplate.__statics__[returnVariable] === 'object') {
                    let staticProps = Object.getOwnPropertyNames(persistObjectTemplate.__statics__[returnVariable]);
                    for (let sx = 0; sx < staticProps.length; ++sx) {
                        persistObjectTemplate.__statics__[returnVariable][staticProps[sx]] =
                            initializerReturnValues[returnVariable][staticProps[sx]];
                    }
                }
            }
            else {
                persistObjectTemplate.__statics__[returnVariable] = initializerReturnValues[returnVariable];
            }
        }
    }
}

module.exports = {getTemplate: getTemplate, recordStatics: recordStatics};
