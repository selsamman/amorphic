module.exports.controller = function (objectTemplate, getTemplate)
{
	var BaseController = getTemplate('./baseController.js').BaseController;
	var World = getTemplate('./world.js').World;
    if (typeof(require) != 'undefined') {
        var fs = require('fs');
        var Q = require('q');
    }

    MyTemplate = objectTemplate.create("MyTemplate", {
        myNumber:   {type: Number},
        myString:   {type: String},
        myDate:     {type: Date},
        myArrayObj: {type: Array, of: Object, value:[]},
        init: function (n, s, d) {
            this.myNumber = n;
            this.myString = s;
            this.myDate = d;
            //this.myArrayObj = a;
        }
    }),

    Assertion = objectTemplate.create("Assertion", {
        name:       {type: String},
        value:      {type: Boolean},
        init:       function(a, b, s) {

            var result = verify(a, b);

            function verify(a, b)
            {
                if (a instanceof Date)
                    a = a.toString();
                if (b instanceof Date)
                    b = b.toString();

                if (a instanceof Array) {
                    if (a.length == 0 && b.length == 0)
                        return true;
                    else
                        for (var ix = 0; ix < a.length; ++ix)
                            if (!b[ix] || !verify(a[ix], b[ix]))
                                return false;
                    return true;
                }

                if (a && a.__id__)
                    a = a.__id__;
                if (b && b.__id__)
                    b = b.__id__;

                return a == b;
            }

            this.value = result;
            this.name = s;
            if (!result)
                console.log(s + " " + JSON.stringify(a) + " != " + JSON.stringify(b));

        }
    }),

    Controller = BaseController.extend("Controller",
	{
        myNumber:       {type: Number},
        myString:       {type: String},
        myDate:         {type: Date},
        myArrayObj:     {type: Array, of: Object},
        myArrayTObj:    {type: Array, of: MyTemplate, value:[]},
        myObj:          {type: Object},

        assertions:   {type: Array, of: Assertion, value: []},

        assertIs: function (a, b, s) {
            this.assertions.push(new Assertion(a, b, s));
        },

        doServer: {on: "server", body: function(prop, val, name, newVal) {
            this.assertions.push(new Assertion(this[prop], val, name));
            this[prop] = newVal;
        }},

        clientInit: function () {
            this.assertIs(this.myNumber, null, "controller.myNumber is null");
            this.assertIs(this.myString, null, "controller.myString is null");
            this.assertIs(this.myDate, null, "controller.myDate is null");
            this.assertIs(this.myArrayObj, null, "controller.myArrayObj is null");
            this.assertIs(this.myArrayTObj.length, 0, "controller.myArrayTObj is []");
            this.assertIs(this.myObj, null, "controller.myObj is null");
            this.assertions = [];

            var t1 = new MyTemplate(1, "two", new Date("January 15, 2015"));
            var t2;
            return this.createMyTemplateOnServer().then(function (t2s) {
                t2 = t2s;

            // Number

                this.myNumber = 1;
                return this.doServer('myNumber', 1, "controller.myNumber is 1", 2);
            }.bind(this)).then(function () {
                this.assertIs(this.myNumber, 2, "controller.myNumber is 2");
                this.myNumber = 0;
                return this.doServer('myNumber', 0, "controller.myNumber is 0", null);
            }.bind(this)).then(function () {
                this.assertIs(this.myNumber, null, "controller.myNumber is null");
                this.myNumber = 0;
                return this.doServer('myNumber', 0, "controller.myNumber is 0", 1);
            }.bind(this)).then(function () {
                this.assertIs(this.myNumber, 1, "controller.myNumber is 1");
                this.myNumber = null;
                return this.doServer('myNumber', null, "controller.myNumber is 0", 0);
            }.bind(this)).then(function () {
                this.assertIs(this.myNumber, 0, "controller.myNumber is 0");
                
            // String
                
                this.assertIs(this.myString, null, "controller.myString is null");
                this.myString = "foo";
                return this.doServer('myString', "foo", "controller.myString is 'foo'", 'bar');
            }.bind(this)).then(function () {
                this.assertIs(this.myString, 'bar', "controller.myString is 'bar'");
                this.myString = null;
                return this.doServer('myString', null, "controller.myString is null", "foo");
            }.bind(this)).then(function () {
                this.assertIs(this.myString, 'foo', "controller.myString is 'foo'");
                this.myString = 'bar'
                return this.doServer('myString', 'bar', "controller.myString is 'bar'", null);
            }.bind(this)).then(function () {
                this.assertIs(this.myString, null, "controller.myString is null");
                
            // Date

                this.assertIs(this.myDate, null, "controller.myDate is null");
                this.myDate = new Date("January 15, 2014");
                return this.doServer('myDate', new Date("January 15, 2014"), "controller.myDate is 'January 14, 2014'", new Date("January 15, 2015"));
            }.bind(this)).then(function () {
                this.assertIs(this.myDate, new Date("January 15, 2015"), "controller.myDate is 'January 15, 2015'");
                this.myDate = null;
                return this.doServer('myDate', null, "controller.myDate is null", new Date("January 15, 2014"));
            }.bind(this)).then(function () {
                this.assertIs(this.myDate, new Date("January 15, 2014"), "controller.myDate is 'January 15, 2014'");
                this.myDate = 'January 15, 2015'
                return this.doServer('myDate', new Date("January 15, 2015"), "controller.myDate is 'January 15, 2015'", null);
            }.bind(this)).then(function () {
                this.assertIs(this.myDate, null, "controller.myDate is null");


            // Templated array

                this.assertIs(this.myArrayTObj, [], "controller.myArrayTObj is []");
                this.myArrayTObj = [t1, t2];
                return this.doServer('myArrayTObj', [t1, t2], "controller.myArrayTObj is t1, t2", [t1]);
            }.bind(this)).then(function () {
                this.assertIs(this.myArrayTObj, [t1], "controller.myArrayTObj is t1");
                this.myArrayTObj = null;
                return this.doServer('myArrayTObj', null, "controller.myArrayTObj is null", [t2]);
            }.bind(this)).then(function () {
                this.assertIs(this.myArrayTObj, [t2], "controller.myArrayTObj is t2");
                this.myArrayTObj = [t2, t1];
                return this.doServer('myArrayTObj', [t2, t1], "controller.myArrayTObj is t2, t1", null);
            }.bind(this)).then(function () {
                this.assertIs(this.myArrayTObj, null, "controller.myArrayTObj is null");

            }.bind(this));
        },
        createMyTemplateOnServer: {on: "server", body: function () {
            return new MyTemplate(2, "three", new Date("January 15, 2015"));
        }},
        
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

