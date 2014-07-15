module.exports.controller = function (objectTemplate, getTemplate)
{
	var BaseController = getTemplate('./baseController.js').BaseController;

    Controller = BaseController.extend(
	{
        serverInit: function () {
            setInterval(function () {this.interval()}.bind(this), 5000);
        },
        interval: function () {
            console.log("I'm a batch task");
        }

    });

    return {Controller: Controller};
}

