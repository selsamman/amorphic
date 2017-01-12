'use strict';

module.exports.baseController = function (objectTemplate) {
    var BaseController = objectTemplate.create('BaseController', {
        baseProp: {type: Boolean, value: true}
    });

    return {
        BaseController: BaseController
    };
};
