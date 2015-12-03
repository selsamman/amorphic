
var expect = require('chai').expect;

var request = require('request');
var path = require('path');
var fs = require('fs');

// This module emulates XMLHTTPRequest for the benefit of client.js which uses it to communicate with the server
var xhrc = require("xmlhttprequest-cookie");
XMLHttpRequest = xhrc.XMLHttpRequest;
var CookieJar = xhrc.CookieJar;

// Copy index.js (amorphic) into it's rightful place in node_modules so it will be found
var amDir = __dirname + "/../../node_modules/amorphic";
if (!fs.existsSync(amDir))
    fs.mkdirSync(amDir);
fs.writeFileSync(path.join(amDir, "index.js"), "module.exports = require('../../index.js')");
fs.writeFileSync(path.join(amDir, "client.js"), fs.readFileSync(__dirname + '/../../client.js'));

// The root must be test since amorphic depends on this to find app

// Fire up amorphic as the server
require('amorphic').listen(__dirname +'/');

// Create global variables for the benefit of client.js
PostCallAssert = function () {}
ObjectTemplate = require('supertype');
RemoteObjectTemplate = require('semotus')._createObject();
RemoteObjectTemplate.role = "client";
RemoteObjectTemplate._useGettersSetters = false;
Q = require("q");
_ = require("underscore");
__ver = 0;
document = {body: null, write: function (content) {}};
alert= function (msg) {console.log("alert " + content);}
clientController = null;

var modelRequires = require('./apps/test/public/js/model.js').model(RemoteObjectTemplate, function () {});
var controllerRequires = require('./apps/test/public/js/controller.js').controller(RemoteObjectTemplate , function () {
    return modelRequires;
});
Controller = controllerRequires.Controller;
//window = {Controller: Controller, Customer: Customer, Address: Address, ReturnedMail: ReturnedMail, Role: Role, Account: Account};
window = modelRequires;
window.Controller = controllerRequires.Controller;

// Fire up amrophic as the client
require('../../node_modules/amorphic/client.js');

// Perform the activities that bindster-amorphic does

describe("Banking Example", function () {

    it ("It can load the browser", function (done) {
        var isDone = false;
        request("http://localhost:3001/amorphic/init/test.js",function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    eval(body);

                    amorphic.addEvent = function () {} ; // mock
                    amorphic.prepareFileUpload = function () {} //mock
                    amorphic._zombieCheck = function () {} //mock
                    amorphic.setCookie = function () {} // mock
                    amorphic.initializationData.url = "http://localhost:3001" + amorphic.initializationData.url;
                    amorphic.establishClientSession(
                        "Controller", __ver,
                        function (newController, sessionExpiration) {
                            if (clientController && typeof(clientController.shutdown) == "function")
                                clientController.shutdown();
                            clientController = newController;
                            if (typeof(clientController.clientInit) == "function")
                                clientController.clientInit(sessionExpiration);
                            if (!isDone) {
                                isDone = true;
                                done();
                            }
                        },
                        function (hadChanges) {
                        },

                        // When a new version is detected pop up "about to be refreshed" and
                        // then reload the document after 5 seconds.
                        function () {
                            clientController.amorphicStatus = 'reloading';
                        },

                        // If communication lost pop up dialog
                        function () {
                            controller.amorphicStatus = 'offline';
                        }
                    );
                } catch (e) {done(e)};
            }
        });
    });
    it ("clears the bank and saves everything", function (done) {
        serverAssert = function (count) {
            expect(count).to.equal(0);
            expect(serverController.sam.roles[0].account.getBalance() +
                   serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        }
        clientController.clearDB().then(function () {
            done();
        }).fail(function(e) {
            done(e)
        });
    });

    it("fetch everything back", function (done) {
        serverAssert = function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                   serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
            done();
        }).fail(function(e) {
             done(e)
        });
    });
    it("change results on server", function (done) {
        var version;
        serverAssert = function () {
            serverController.sam.roles[0].account.transactions[0].amount += 1;
            serverController.version = serverController.sam.roles[0].account.__version__;
        }
        PostCallAssert = function () {
            expect(serverController.__template__.__objectTemplate__.currentTransaction.touchObjects[serverController.sam.roles[0].account.__id__])
                .to.equal(serverController.sam.roles[0].account);
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                   serverController.sam.roles[1].account.getBalance()).to.equal(226);
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("throw an execption", function (done) {
        serverAssert = function () {
            throw "get stuffed";
        }
        PostCallAssert = function () {
        }
        return clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                expect(e.message).to.equal("get stuffed");
                done()
            }).fail(function(e) {
                done(e)
            });
    });
    it("can get a synchronization error", function (done) {
        serverAssert = function () {
            throw "get stuffed";
        }
        return clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                expect(e.message).to.equal("get stuffed");
                done()
            }).fail(function(e) {
                done(e)
            });
    });
    it("can get it's data freshened", function (done) {
        serverAssert = function () {
            expect(serverController.sam.roles[0].account.__version__ * 1).to.equal(serverController.version * 1 + 1);
            expect(serverController.sam.firstName).to.equal("Sammy");
        }
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Q().then(function () {
            return knex('customer').where({'_id': serverController.sam._id}).update({'firstName': 'Sammy', '__version__': 100})
        }).then(function () {
            return clientController.mainFunc()
        }).then( function () {
            expect(clientController.sam.firstName).to.equal("Sammy");
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("can retry and update conflict", function (done) {
        var retryCount = 0;
        serverAssert = function () {
            serverController.sam.firstName = 'Sam';
            ++retryCount;
            return knex('customer').where({'_id': serverController.sam._id}).update({'__version__': 200, lastName: 'The Man'})
        }
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Q().then(function () {
            return clientController.mainFunc()
        }).then( function () {
            expect(clientController.sam.firstName).to.equal("Sam");
            expect(clientController.sam.lastName).to.equal("The Man");
            expect(retryCount).to.equal(2);
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("can read the results", function (done) {
        done();
    });

    after(function () {
        //process.chdir('../');
    });

});
