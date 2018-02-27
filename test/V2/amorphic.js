var expect = require('chai').expect;
var request = require('request');
var axios = require('axios');
var path = require('path');

var amorphicContext = require('../../lib/AmorphicContext');
var serverAmorphic = require('../../index.js');

function afterEachDescribe(done) {
    if(amorphicContext.appContext.connectServer){
        amorphicContext.appContext.connectServer.close();
    }
    done();
}
function beforeEachDescribe(done, appName, createControllerFor, sourceMode) {
    process.env.createControllerFor = createControllerFor;
    process.env.sourceMode = sourceMode || 'debug';
    serverAmorphic.listen(__dirname + '/');
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
            console.log(res.data);
            expect(res.data).to.equal('document.write("<script src=\'/common/js/Model.js?ver=0\'></script>");\n\ndocument.write("<script src=\'/app2/js/Controller.js?ver=0\'></script>");\n\namorphic.setApplication(\'app2\');amorphic.setSchema({});amorphic.setConfig({"modules":{},"templateMode":"auto"});amorphic.setInitialMessage({"url":"/amorphic/xhr?path=app2","message":{"type":"sync","sync":true,"value":null,"name":null,"remoteCallId":null,"changes":"{\\"server-Controller-1\\":{\\"someData2\\":[null,\\"initial\\"]}}","newSession":true,"rootId":"server-Controller-1","startingSequence":100001,"sessionExpiration":3600000,"ver":"0"}});');
            expect(res.status).to.equal(200);
        });
    });
});
