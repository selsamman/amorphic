'use strict';

var fs = require('fs');
var path = require('path');

function getTemplate(file, options, uses) {
    return function getTemplateCurry(ignoringClient, requiredTemplates, filesNeeded, ref, appPath, appName, persistObjectTemplate, config, mixins, fileInitializers, filePaths, amorphicOptions, applicationSourceCandidate, currentContext, UsesV2ReturnPass1) {
        return _getTemplate(
            file,
            options,
            uses,
            ignoringClient,
            requiredTemplates,
            filesNeeded,
            ref,
            appPath,
            appName,
            persistObjectTemplate,
            config,
            mixins,
            fileInitializers,
            filePaths,
            amorphicOptions,
            applicationSourceCandidate,
            currentContext,
            UsesV2ReturnPass1
        );
    };
}

function _getTemplate(file, options, uses, ignoringClient, requiredTemplates, filesNeeded, ref, appPath, appName, persistObjectTemplate, config, mixins, fileInitializers, filePaths, amorphicOptions, applicationSourceCandidate, currentContext, UsesV2ReturnPass1) {
    var previousIgnoringClient = ignoringClient;
    var fileNoExt; //ex: controller (./controller.js)
    var clientPath;
    var fileExports; //result of: require('./controller.js')
    var filePath;
    var nonPublicFilePath;
    var publicFilePath;
    var objectTemplateInitialize;
    var objectTemplateInitializePath = '';
    var fileInitializer;
    var fileInitializerPath = '';
    var fileMixinsInitializer;
    var fileMixinsInitializerPath = '';
    var previousToClient;
    var templates;
    var fileSource;
    var fileClientPath;

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

    if (ref[fileNoExt]) {
        if (uses) {
            return;
        }
        else {
            throw new Error('circular reference on ' + file);
        }
    }

    ref[fileNoExt] = true;

    // 1. If the file is to be 'required' from a specific app, use
    // that app, otherwise
    // 2. look for the file under the current app,
    // 3. otherwise look under common
    if (options.app) {
        clientPath = options.app;
        nonPublicFilePath = config.commonPath + '/../../' + clientPath + '/js/' + file;
        publicFilePath = config.commonPath + '/../../' + clientPath + '/public/js/' + file;

        if (fs.existsSync(nonPublicFilePath)) {
            filePath = nonPublicFilePath;
        }
        else {
            filePath = publicFilePath;
        }
    }
    else if (fs.existsSync(appPath + file)) {
        clientPath = appName;
        filePath = appPath + file;
    }
    else {
        clientPath = 'common';
        filePath = config.commonPath + file;
    }

    fileExports = require(filePath);

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
        var oldCreate = persistObjectTemplate.create;

        persistObjectTemplate.create = function p(name) {
            var template = oldCreate.call(persistObjectTemplate, name, {});
            var originalExtend = template.extend;

            template.extend = function q(name, props)  {
                var template = persistObjectTemplate.__dictionary__[name];

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

            var originalMixin = template.mixin;

            template.mixin = function r() {
                if (currentContext.pass === 2) {
                    originalMixin.apply(template, arguments);
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
        var initializerReturnValues = fileInitializer(persistObjectTemplate, usesV2Pass1);

        persistObjectTemplate.create = oldCreate;
        fileInitializers[fileNoExt] = fileInitializer;
        persistObjectTemplate.__toClient__ = previousToClient;

        recordStatics(initializerReturnValues);
    }
    else {
        // Call the initialize function in the template
        previousToClient = persistObjectTemplate.__toClient__;

        persistObjectTemplate.__toClient__ = !ignoringClient;

        var includeMixins = !requiredTemplates[fileNoExt];
        templates = requiredTemplates[fileNoExt] || fileInitializer(persistObjectTemplate, getTemplateInject, usesV1);

        persistObjectTemplate.__toClient__ = previousToClient;
        requiredTemplates[fileNoExt] = templates;

        if (Object.getOwnPropertyNames(templates).length === 0) {
            persistObjectTemplate.__statics__[fileNoExt] = templates;
        }
        else {
            for (var returnVariable in templates) {
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

    filePaths[fileNoExt] = filePath;

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
            true,
            ignoringClient,
            requiredTemplates,
            filesNeeded,
            ref,
            appPath,
            appName,
            persistObjectTemplate,
            config,
            mixins,
            fileInitializers,
            filePaths,
            amorphicOptions,
            applicationSourceCandidate,
            currentContext,
            UsesV2ReturnPass1
        );
    }

    function getTemplateInject(injectFile, injectOptions, injectUses) {
        return _getTemplate(
            injectFile,
            injectOptions,
            injectUses,
            ignoringClient,
            requiredTemplates,
            filesNeeded,
            ref,
            appPath,
            appName,
            persistObjectTemplate,
            config,
            mixins,
            fileInitializers,
            filePaths,
            amorphicOptions,
            applicationSourceCandidate,
            currentContext,
            UsesV2ReturnPass1
        );
    }

    function recordStatics(initializerReturnValues) {
        for (var returnVariable in initializerReturnValues) {
            if (!persistObjectTemplate.__dictionary__[returnVariable]) {
                if (!requiredTemplates['closureProp']) {
                    requiredTemplates['closureProp'] = {};
                }

                requiredTemplates['closureProp'][returnVariable] = initializerReturnValues[returnVariable];
                persistObjectTemplate.__statics__[returnVariable] = initializerReturnValues[returnVariable];
            }
        }

        return persistObjectTemplate;
    }

    function usesV2Pass1(file, templateName, options) {
        templateName = templateName || path.basename(file, '.js');
        var moduleName = currentContext.moduleName;

        _getTemplate(
            file,
            options,
            true,
            ignoringClient,
            requiredTemplates,
            filesNeeded,
            ref,
            appPath,
            appName,
            persistObjectTemplate,
            config,
            mixins,
            fileInitializers,
            filePaths,
            amorphicOptions,
            applicationSourceCandidate,
            currentContext,
            UsesV2ReturnPass1
        );

        currentContext.moduleName = moduleName;

        var staticTemplate = persistObjectTemplate.__statics__[templateName];

        return staticTemplate || new UsesV2ReturnPass1(templateName, fileNoExt);
    }
}

module.exports = getTemplate;
