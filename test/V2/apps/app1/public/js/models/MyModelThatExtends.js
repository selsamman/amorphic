module.exports.MyModelThatExtends = function(objectTemplate, uses) {
    var Model = uses('Model.js', 'Model');

    Model.extend({
        name: 'MyModelThatExtends',
        toClient: false,
        toServer: true
    }, {
        extendedTemplateData: {
            type: String,
            value: 'initial'
        }
    });
};
