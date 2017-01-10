module.exports.baseController = function (objectTemplate, getTemplate) {
    var BaseController = objectTemplate.create('BaseController', {
        baseProp: {type: Boolean, value: true}
    });

    return {
        BaseController: BaseController
    };
};
