'use strict';
let assert = require('chai').assert;
let Promise = require('bluebird');
let serverAmorphic = require('../../index.js');
let sinon = require('sinon');
let axios = require('axios');
let fs = require('fs');
let path = require('path');
let amorphicContext = require('../../lib/AmorphicContext');

describe('Setup amorphic', function() {
    let server;
    before(function(done) {
        serverAmorphic.listen(__dirname);
        done();
    });

    it('can call the listen function to setup amorphic and then it can be called on the default port', function() {
        return axios.get('http://localhost:3001').catch(function(error) {
            assert.strictEqual(error.response.status, 404);
        });
    });

    it('make sure that the downloads directory exists', function() {
        let downloadPath = path.join(path.dirname(require.main.filename), 'download');
        assert.isTrue(fs.existsSync(downloadPath), 'The download path exists');
    });


    after(function() {
        // Clean up server
        if(amorphicContext.appContext.connectServer){
            amorphicContext.appContext.connectServer.close();
        }
    });
});
