var expect = require('chai').expect;
var request = require('request');
var axios = require('axios');
var path = require('path');
// var fs = require('fs');
// var sinon = require('sinon');

// This module emulates XMLHTTPRequest for the benefit of client.js which uses it to communicate with the server
// var xhrc = require('xmlhttprequest-cookie');
// XMLHttpRequest = xhrc.XMLHttpRequest;
// var CookieJar = xhrc.CookieJar;

// Copy index.js (amorphic) into it's rightful place in node_modules so it will be found

// The root must be test since amorphic depends on this to find app

// Fire up amorphic as the server

// Create global variables for the benefit of client.js
// PostCallAssert = function () {};
// ObjectTemplate = require('supertype');
// RemoteObjectTemplate = require('semotus')._createObject();
// RemoteObjectTemplate.role = 'client';
// RemoteObjectTemplate._useGettersSetters = false;
// Q = require('q');
// _ = require('underscore');
// __ver = 0;
// document = {
//     body: {
//         addEventListener: function () {}
//     },
//     write: function (content) {}
// };
// alert = function (msg) {
//     console.log('alert ' + content);
// };
// clientController = null;

// var modelRequires;
// var controllerRequires;
// var Controller;
var serverAmorphic = require('../../index.js');

// Fire up amrophic as the client
// require('../../client.js');

function afterEachDescribe(done) {
    serverAmorphic.reset().then(function () {
        done();
    });
}
function beforeEachDescribe(done, appName, createControllerFor, sourceMode) {
    process.env.createControllerFor = createControllerFor;
    process.env.sourceMode = sourceMode || 'debug';
    serverAmorphic.listen(__dirname + '/');
    // var modelRequiresPath = './apps/' + appName + '/public/js/model.js';
    // var controllerRequiresPath = './apps/' + appName + '/public/js/controller.js';
    // modelRequires = require(modelRequiresPath).model(RemoteObjectTemplate, function () {});
    // controllerRequires = require(controllerRequiresPath).controller(RemoteObjectTemplate, function () {
    //     return modelRequires;
    // });
    // Controller = controllerRequires.Controller;
    // window = modelRequires;
    // window.addEventListener = function () {};
    // window.Controller = controllerRequires.Controller;
    // var isDone = false;

    // var serverUrl = 'http://localhost:3001/amorphic/init/' + appName + '.js';

    // request(serverUrl, function (error, response, body) {
    //     if (!error && response.statusCode == 200) {
    //         try {
    //             eval(body);
    //
    //             amorphic.initializationData.url = 'http://localhost:3001' + amorphic.initializationData.url;
    //             amorphic.establishClientSession(
    //                 'Controller', __ver,
    //                 function (newController, sessionExpiration) {
    //                     if (clientController && typeof(clientController.shutdown) === 'function') {
    //                         clientController.shutdown();
    //                     }
    //                     clientController = newController;
    //                     if (typeof(clientController.clientInit) === 'function') {
    //                         clientController.clientInit(sessionExpiration);
    //                     }
    //                     if (!isDone) {
    //                         isDone = true;
    //                         done();
    //                     }
    //                 },
    //                 function (hadChanges) {
    //                 },
    //
    //                 // When a new version is detected pop up "about to be refreshed" and
    //                 // then reload the document after 5 seconds.
    //                 function () {
    //                     clientController.amorphicStatus = 'reloading';
    //                 },
    //
    //                 // If communication lost pop up dialog
    //                 function () {
    //                     controller.amorphicStatus = 'offline';
    //                 }
    //             );
    //         }
    //         catch (e) {
    //             done(e);
    //         }
    //     }
    //
    // });
    done();
}


describe('toClient and toServer testing', function() {
    before(function(done) {
        return beforeEachDescribe(done, 'app2', 'yes', 'debug');
    });
    after(afterEachDescribe);

    it('should recieve a bunch of document.writes', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/init/app2.js'
        }).then(function (res) {
            console.log('res.data');
            console.log(res.data)
            expect(res.data).to.equal('document.write("<script src=\'/common/js/Model.js?ver=0\'></script>");\n\ndocument.write("<script src=\'/app1/js/models/MyModelThatExtends.js?ver=0\'></script>");\n\ndocument.write("<script src=\'/app2/js/Controller.js?ver=0\'></script>");\n\namorphic.setApplication(\'app2\');amorphic.setSchema({});amorphic.setConfig({"modules":{},"templateMode":"auto"});amorphic.setInitialMessage({"url":"/amorphic/xhr?path=app2","message":{"type":"sync","sync":true,"value":null,"name":null,"remoteCallId":null,"changes":"{\\"server-Controller-1\\":{\\"someData2\\":[null,\\"initial\\"]}}","newSession":true,"rootId":"server-Controller-1","startingSequence":100001,"sessionExpiration":3600000,"ver":"0"}});');
            expect(res.status).to.equal(200);
        });
    });
});
