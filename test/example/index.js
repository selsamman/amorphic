'use strict';
let assert = require('chai').assert;
let Promise = require('bluebird');
let amorphic = require('../../index.js');
let sinon = require('sinon');
let axios = require('axios');
let fs = require('fs');

describe('Setup amorphic', function() {
    before(function() {
        process.env.applications = {
            'example': 'test/example'
        };
        process.env.application = 'example';
        process.env.port = 3004;
        process.env.sessionSecret = 'test';
        amorphic.listen(__dirname);
    });

    it('can call the listen function to setup amorphic and then it can be called on the default port', function() {
        return axios.get('http://localhost:3004').catch(function(error) {
            assert.strictEqual(error.response.status, 404);
        });
    });

    it('make sure that the downloads directory exists');

});
