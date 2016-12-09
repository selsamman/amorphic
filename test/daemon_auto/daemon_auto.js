'use strict';
let assert = require('chai').assert;
let Promise = require('bluebird');
let amorphic = require('../../index.js');
let sinon = require('sinon');
let axios = require('axios');
let fs = require('fs');
let path = require('path');

describe('Run amorphic as a deamon with template mode "auto"', function() {
    let server;
    before(function(done) {
        amorphic.listen(__dirname);
        done();
    });

    it('can call the listen function to setup amorphic, and init the app controller', function() {
        assert.isOk(daemonAutoController, 'The daemonAutoController was created');
        assert.isTrue(daemonAutoController.prop, 'The daemonAutoController was initialized');
        assert.isTrue(daemonAutoController.baseProp, 'The daemonAutoController can see base props');

        assert.equal(daemonAutoController.getObjectTemplate().controller, daemonAutoController, 'The objectTemplate\'s controller references where set up');
    });

    it('should create the download directory', function() {
        let downloadPath = path.join(path.dirname(require.main.filename), 'download');
        assert.isTrue(fs.existsSync(downloadPath), 'The download path exists');
    });

    it('should have values with descriptions', function() {
        assert.strictEqual(daemonAutoController.__values__('propWithValuesAndDescriptions').length, 1, 'The correct values for the prop');
        assert.strictEqual(daemonAutoController.__values__('propWithValuesAndDescriptions')[0], 'value', 'The correct values for the prop');
        assert.strictEqual(daemonAutoController.__descriptions__('propWithValuesAndDescriptions')['value'], 'Description', 'The correct description for the value');
    });

    it('should have virtual properties', function() {
        assert.strictEqual(daemonAutoController.virtualProp, 'I am virtual', 'Can use virutal props');
    });

    it('should have access to statics', function() {
        assert.isOk(daemonAutoController.getMapFromStatic(), 'Can get the static map')
        assert.strictEqual('value', daemonAutoController.getMapFromStatic().key, 'Static map values correct');
    });

    after(function(done) {
        // Clean up server
        amorphic.reset()
            .then(function() {
                done();
            });
    });
});
