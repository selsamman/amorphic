'use strict';
let assert = require('chai').assert;
let Promise = require('bluebird');
let amorphic = require('../../index.js');
let sinon = require('sinon');
let axios = require('axios');
let fs = require('fs');

describe('Setup amorphic', function() {
    let server;
    before(function() {
        return amorphic.listen(__dirname).then(function(connectHandler) {
            server = connectHandler;
        });
    });

    it('can call the listen function to setup amorphic and then it can be called on the default port', function() {
        return axios.get('http://localhost:3001').catch(function(error) {
            assert.strictEqual(error.response.status, 404);
        });
    });

    it('make sure that the downloads directory exists');


    after(function() {
        // Clean up server
        server.close();

    });
});
