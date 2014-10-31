module.exports.controller = function (objectTemplate, getTemplate)
{
	var BaseController = getTemplate('./baseController.js').BaseController;
	var World = getTemplate('./world.js').World;
    if (typeof(require) != 'undefined')
        var fs = require('fs');

    Controller = BaseController.extend("Controller",
	{
		worlds:        {type: Array, of: World, value: []},

        newWorld: {on: "server", body: function ()
        {
            this.worlds.push(new World());
        }},

        onContentRequest: function(request, response, next, file)
        {
            var file = __dirname + '/../files/gimbal_housing.pdf';
            if (file.match(/gimbal_housing.pdf/))
            {
                try {
                    var stat = fs.statSync(file);
                } catch(e) {
                    response.writeHead(404, {"Content-Type": "text/plain"});
                    response.end("Not found");
                    return;
                }
                console.log("streaming " + file + ' length=' + stat.size);
                response.writeHead(200, {
                    'Content-Type': 'application/pdf',
                    'Content-Length': stat.size});
                var readStream = fs.createReadStream(file);
                readStream.pipe(response);
                readStream.on('end', function () {
                    console.log('done');
                });
            } else
                next();
        }

    });

    return {Controller: Controller};
}

