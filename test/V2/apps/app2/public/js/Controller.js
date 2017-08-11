module.exports.objectTemplateInitialize = function (objectTemplate) {
    objectTemplate.toServerRuleSet = ['app2'];
    objectTemplate.toClientRuleSet = ['app2'];
};

module.exports.Controller = function (objectTemplate, uses) {
    var myModelThatExtends = uses('models/MyModelThatExtends.js', 'MyModelThatExtends', {
        app: 'app1'
    });

    var Model = uses('Model.js', 'Model');

    objectTemplate.create('Controller', {
        mainFunc: {
            on: 'server',
            body: function() {
                return serverAssert();
            }
        },
        someData2: {
            type: String,
            value: 'initial'
        }
    });
};