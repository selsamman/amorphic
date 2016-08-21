module.exports.controller = function (objectTemplate, getTemplate)
{
    var BaseController = getTemplate('./baseController.js').BaseController;

    Controller = BaseController.extend("Controller",
        {
            serverInit: function () {
                var restify = require('restify');

                function respond(req, res, next) {
                    res.send('hello ' + req.params.name);
                    next();
                }
                var server = restify.createServer();
                server.get('/hello/:name', respond);
                server.head('/hello/:name', respond);
                server.listen(objectTemplate.config.rport, function() {
                    objectTemplate.logger.info(server.name + ' listening at ' + server.url);
                });
            },
        });

    return {Controller: Controller};
}

