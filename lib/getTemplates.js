var fs = require('fs');
var UglifyJS = require('uglify-js');
var logMessage = require('./utils').logMessage;
var path = require('path');
var getTemplate = require('./getTemplate');
var flattenTemplates = require('./flattenTemplates');
var UsesV2ReturnPass1 = require('./UsesV2ReturnPass1');

/**
 * Purpose unknown
 *
 * @param {unknown} persistObjectTemplate unknown
 * @param {unknown} appPath unknown
 * @param {unknown} templates unknown
 * @param {unknown} config unknown
 * @param {unknown} anotherPath unknown
 * @param {unknown} _sourceOnly unknown
 * @param {unknown} _detailedInfo unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 *
 * @returns {unknown} unknown
 */
function getTemplates(persistObjectTemplate, appPath, templates, config, anotherPath, _sourceOnly, _detailedInfo,
  amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps) {

    var requiredTemplates = {};
    var fileInitializers = {};
    var filePaths = {};
    var ref = {};
    var mixins = [];
    var ignoringClient = false;
    var filesNeeded = {};
    var currentContext = {pass: 1};
    var applicationSourceCandidate = {};
    var ast = null;
    var deferredExtends = [];

    persistObjectTemplate.__statics__ = {}
    persistObjectTemplate.__initialized__ = false;

    UsesV2ReturnPass1.prototype.extend = v2Extend;
    UsesV2ReturnPass1.prototype.doExtend = v2DoExtend;

    if (amorphicOptions.sourceMode === 'debug') {
        applicationSource[anotherPath] = '';
    }

    // Process each template passed in (except for unit tests there generally is just the controller)
    for (var ix = 0; ix < templates.length; ++ix) {
        getTemplate(templates[ix])(
            ignoringClient,
            requiredTemplates,
            filesNeeded,
            ref,
            appPath,
            anotherPath,
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

    // Extended classes can't be processed until now when we know we have all the base classes defined
    // So we do the extends for them now after recording all info in the first pass
    var futureTemplates = {};

    for (var ixc = 0; ixc < deferredExtends.length; ++ixc) {
        futureTemplates[deferredExtends[ixc].extendedName] = deferredExtends[ixc];
    }

    for (var ixb = 0; ixb < deferredExtends.length; ++ixb) {
        deferredExtends[ixb].doExtend(futureTemplates);
    }

    // Process V1 style mixins
    for (var ixa = 0; ixa < mixins.length; ++ixa) {
        if (mixins[ixa]) {
            (mixins[ixa])(persistObjectTemplate, requiredTemplates, flattenTemplates(requiredTemplates));
        }
    }

    currentContext.pass = 2;

    // Process V2 pass 2
    if (config.appConfig && config.appConfig.templateMode === 'auto') {
        for (var fileKey in fileInitializers) {
            var oldCreate = persistObjectTemplate.create;
            persistObjectTemplate.create = v2Create;
            recordStatics(fileInitializers[fileKey](persistObjectTemplate, usesV2Pass2));
            persistObjectTemplate.create = oldCreate;
        }
    }

    // Add the sources to either a structure to be uglified or to an object for including one at a time
    for (var appSource in applicationSourceCandidate) {
        var templateNeededOnClient = false;

        for (var template in requiredTemplates[appSource]) {
            if (requiredTemplates[appSource][template].__toClient__ || typeof(requiredTemplates[appSource][template].__toClient__) === 'undefined') {
                templateNeededOnClient = true;
            }
        }

        if (filesNeeded[appSource] && templateNeededOnClient) {
            if (amorphicOptions.sourceMode === 'debug') {
                applicationSource[anotherPath] += applicationSourceCandidate[appSource][0];
            }
            else {
                addUglifiedSource(applicationSourceCandidate[appSource][0], applicationSourceCandidate[appSource][1]);
            }
        }
        else {
            for (var templatea in requiredTemplates[appSource]) {
                if (requiredTemplates[appSource][templatea]) {
                    requiredTemplates[appSource][templatea].__toClient__ = false;
                }
                else {
                    logMessage(templatea + ' not found in requiredTemplates for ' + appSource);
                }
            }
        }
    }

    // Handle NPM includes (amorphic-userman module, etc.)
    if (config && config.appConfig && config.appConfig.modules) {
        for (var mixin in config.appConfig.modules) {
            if (!config.appConfig.modules[mixin].require) {
                logMessage('Module ' + mixin + ' missing a requiredTemplates property ');
            }
            else if (typeof(require(config.appConfig.modules[mixin].require)[mixin + '_mixins']) !== 'function') {
                logMessage(config.appConfig.modules[mixin].require + ' must export a ' + mixin + '_mixins property which is an initialization function');
            }
            else {
                var requireName = config.appConfig.modules[mixin].require;
                var results = require(requireName);

                results[mixin + '_mixins'](persistObjectTemplate, requiredTemplates, config.appConfig.modules[mixin], config.appConfig.nconf);

                if (typeof(anotherPath) !== 'undefined') {
                    if (amorphicOptions.sourceMode === 'debug') {
                        applicationSource[anotherPath] += "document.write(\"<script src='/modules/" + requireName + '/index.js?ver=' + config.appVersion + "'></script>\");\n\n";
                    }
                    else {
                        addUglifiedSource('module.exports.' + mixin + '_mixins = ' + results[mixin + '_mixins'] + '\n\n', '/modules/' + requireName + '/index.js?ver=' + config.appVersion);
                    }
                }
            }
        }
    }

    // Because of the two pass nature, requiredTemplates are not update for extends which are only done between passes
    // Record source and source map
    if (ast && !applicationSource[anotherPath] && !config.appConfig.isDaemon) {
        ast.figure_out_scope();

        var compressor = UglifyJS.Compressor();
        ast = ast.transform(compressor);

        var walker = new UglifyJS.TreeTransformer(before);
        ast = ast.transform(walker);

        var sourceMap = UglifyJS.SourceMap();
        var stream = UglifyJS.OutputStream({source_map: sourceMap});

        ast.print(stream);
        applicationSource[anotherPath] = stream.toString();
        applicationSourceMap[anotherPath] = sourceMap.toString();
    }

    persistObjectTemplate.performInjections();

    if (applicationSource[anotherPath]) {
        applicationPersistorProps[anotherPath] = {};

        if (persistObjectTemplate.getPersistorProps) {
            applicationPersistorProps[anotherPath] = persistObjectTemplate.getPersistorProps();
        }
    }

    return requiredTemplates;

    function before(node, descend) {
        if (node instanceof UglifyJS.AST_ObjectProperty && node.key === 'body' && findOnServer(walker.parent())) {
            var emptyFunction = node.clone();

            emptyFunction.value.variables = {};
            emptyFunction.value.body = [];
            emptyFunction.value.argNames = [];
            emptyFunction.value.start = UglifyJS.AST_Token({type: 'string', value: '{'});
            emptyFunction.value.end = UglifyJS.AST_Token({type: 'string', value: '}'});

            return emptyFunction;
        }

        node = node.clone();
        descend(node, this);

        return node;
    }

    function findOnServer(node) {
        var ret = null;

        if (node.properties) {
            node.properties.forEach(isOnServer);
        }

        return ret;

        function isOnServer(node) {
            if (node.key === 'on' && node.value && node.value.value === 'server') {
                ret = node;
            }
        }
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
    }

    function addUglifiedSource(data, file) {
        if (!applicationSource[anotherPath]) {
            ast = UglifyJS.parse(data, { filename: file, toplevel: ast });
        }
    }

    function v2Extend(name) {
        this.extendedName = name;
        deferredExtends.push(this);

        return new UsesV2ReturnPass1(name, this.prop);
    }

    function v2Create(name, props) {
        name = name.name || name;
        persistObjectTemplate.__dictionary__[name].mixin(props);

        return persistObjectTemplate.__dictionary__[name];
    };

    function v2DoExtend(futureTemplates) {
        if (!persistObjectTemplate.__dictionary__[this.baseName]) {
            if (futureTemplates[this.baseName]) {
                futureTemplates[this.baseName].doExtend(futureTemplates);
            }

            if (!persistObjectTemplate.__dictionary__[this.baseName]) {
                throw Error('Attempt to extend ' + this.baseName + ' which was never defined; extendedName=' + this.extendedName);
            }
        }

        if (!persistObjectTemplate.__dictionary__[this.extendedName]) {
            var template = persistObjectTemplate.__dictionary__[this.baseName].extend(this.extendedName, {});
            requireTemplate(this.prop, template, requiredTemplates);
        }
    }

    function usesV2Pass2(file, templateName) {
        templateName = templateName || path.basename(file, '.js');
        return persistObjectTemplate.__dictionary__[templateName] || persistObjectTemplate.__statics__[templateName];
    }

}

function requireTemplate(prop, template, requiredTemplates) {
    requiredTemplates[prop] = requiredTemplates[prop] || {};
    requiredTemplates[prop][template.__name__] = template;
}


module.exports = {
    getTemplates: getTemplates
}
