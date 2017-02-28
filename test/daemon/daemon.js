'use strict';
let assert = require('chai').assert;
let Bluebird = require('bluebird');
let amorphic = require('../../index.js');
let axios = require('axios');
let fs = require('fs');
let path = require('path');

describe('Run amorphic as a deamon', function() {

    this.timeout(5000);

    before(function(done) {
        amorphic.listen(__dirname);
        done();
    });

    it('can call the listen function to setup amorphic, and init the app controller', function() {
        assert.isOk(daemonController, 'The daemonController was created');
        assert.isTrue(daemonController.prop, 'The daemonController was initialized');

        assert.equal(daemonController.getObjectTemplate().controller, daemonController, 'The objectTemplate\'s controller references where set up');
    });

    it('should create the download directory', function() {
        let downloadPath = path.join(path.dirname(require.main.filename), 'download');
        assert.isTrue(fs.existsSync(downloadPath), 'The download path exists');
    });

    it('should have values with descriptions', function() {
        assert.strictEqual(daemonController.__values__('propWithValuesAndDescriptions').length, 1, 'The correct values for the prop');
        assert.strictEqual(daemonController.__values__('propWithValuesAndDescriptions')[0], 'value', 'The correct values for the prop');
        assert.strictEqual(daemonController.__descriptions__('propWithValuesAndDescriptions')['value'], 'Description', 'The correct description for the value');
    });

    it('should have virtual properties', function() {
        assert.strictEqual(daemonController.virtualProp, 'I am virtual', 'Can use virutal props');
    });

    it('can download a file', function() {
        return new Bluebird(function(resolve, reject) {
            try {
                resolve(fs.readFileSync(__dirname + '/./apps/daemon/js/DownloadTest.txt'));
            }
            catch (e) {
                reject(e);
            }
        })
            .then(function(fileData) {
                return axios.get('http://localhost:3001/amorphic/xhr?path=daemon&file=DownloadTest.txt')
                    .then(function(response) {
                        assert.isOk(response, 'The response is ok');
                        assert.strictEqual(response.status, 200, 'The response code was 200');
                        assert.strictEqual(response.data, fileData.toString(), 'The file data matches');
                    });
            });
    });

    it('should 404 when the file is not there', function() {
        return axios.get('http://localhost:3001/amorphic/xhr?path=daemon&file=NotFound.txt')
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
        amorphic.reset()
            .then(function() {
                done();
            });
    });
});
