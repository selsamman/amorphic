'use strict';
let assert = require('chai').assert;
let Bluebird = require('bluebird');
let amorphic = require('../../index.js');
let axios = require('axios');
let fs = require('fs');
let path = require('path');
let amorphicContext = require('../../lib/AmorphicContext');

describe('Run amorphic as a deamon with template mode "auto"', function() {
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
        assert.isOk(daemonAutoController.getMapFromStatic(), 'Can get the static map');
        assert.strictEqual('value', daemonAutoController.getMapFromStatic().key, 'Static map values correct');
    });

    it('can download a file', function() {
        return new Bluebird(function(resolve, reject) {
            try {
                resolve(fs.readFileSync(__dirname + '/./apps/daemon_auto/js/DownloadTest.txt'));
            }
            catch (e) {
                reject(e);
            }
        })
            .then(function(fileData) {
                return axios.get('http://localhost:3001/amorphic/xhr?path=daemon_auto&file=DownloadTest.txt')
                    .then(function(response) {
                        assert.isOk(response, 'The response is ok');
                        assert.strictEqual(response.status, 200, 'The response code was 200');
                        assert.strictEqual(response.data, fileData.toString(), 'The file data matches');
                    });
            });
    });

    it('should 404 when the file is not there', function() {
        return axios.get('http://localhost:3001/amorphic/xhr?path=daemon_auto&file=NotFound.txt')
            .then(function() {
                assert.isNotOk('To be here');
            })
            .catch(function(response) {
                assert.isOk(response, 'The error response is ok');
                assert.strictEqual(response.message, 'Request failed with status code 404', 'The response message was correct');
                assert.strictEqual(response.response.status, 404, 'The response code was 404');
                assert.strictEqual(response.response.data, 'Not found', 'The error data matches');
            });
    });

    after(function(done) {
        // Clean up server
        if(amorphicContext.appContext.connectServer){
            amorphicContext.appContext.connectServer.close();
        }
        done();
    });
});
