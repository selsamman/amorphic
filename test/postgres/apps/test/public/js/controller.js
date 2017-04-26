module.exports.controller = function (objectTemplate, getTemplate) {
    objectTemplate.debugInfo = 'io;api';

    var Customer = getTemplate('model.js').Customer;
    var Account = getTemplate('model.js').Account;
    var Address  = getTemplate('model.js').Address;
    var ReturnedMail = getTemplate('model.js').ReturnedMail;
    var Role = getTemplate('model.js').Role;
    var Transaction = getTemplate('model.js').Transaction;
    getTemplate('mail.js', {app: 'config'});
    getTemplate('anotherMail.js');


    var Controller = objectTemplate.create('Controller', {
        mainFunc: {on: 'server', body: function () {
            return serverAssert();
        }},
        conflictData: {type: String, value: 'initial'},
        someData: {type: String, value: 'A'},
        sam:     {type: Customer, fetch: true},
        karen:   {type: Customer, fetch: true},
        ashling: {type: Customer, fetch: true},
        updatedCount: {type: Number, value: 0},
        serverInit: function () {
            if (!objectTemplate.objectMap)
                throw new Error('Missing keepOriginalIdForSavedObjects in config.json')
            serverController = this;
        },
        clearDB: {on: 'server', body: function () {
            var total = 0;
            return clearCollection(Role)
                .then(function (count) {
                    total += count;
                    return clearCollection(Account);
                }).then(function (count) {
                    total += count;
                    return clearCollection(Customer);
                }).then(function (count) {
                    total += count;
                    return clearCollection(Transaction);
                }).then(function (count) {
                    total += count;
                    return clearCollection(ReturnedMail);
                }).then(function (count) {
                    total += count;
                    return clearCollection(Address);
                }).then(function (count) {
                    total += count;
                    serverAssert(total);
                });
            function clearCollection(template) {
                return objectTemplate.dropKnexTable(template)
                    .then(function () {
                        return objectTemplate.synchronizeKnexTableFromTemplate(template).then(function() {
                            return 0;
                        });
                    });
            }
        }},
        clientInit: function () {
            clientController = this;
            // Setup customers and addresses
            var sam = new Customer('Sam', 'M', 'Elsamman');
            var karen = new Customer('Karen', 'M', 'Burke');
            var ashling = new Customer('Ashling', '', 'Burke');

            // Setup referrers
            sam.referrers = [ashling, karen];
            ashling.referredBy = sam;
            karen.referredBy = sam;
            sam.local1 = 'foo';
            sam.local2 = 'bar';

            // Setup addresses
            sam.addAddress(['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
            sam.addAddress(['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');

            sam.addresses[0].addReturnedMail(new Date());
            sam.addresses[0].addReturnedMail(new Date());
            sam.addresses[1].addReturnedMail(new Date());

            karen.addAddress(['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
            karen.addAddress(['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');

            karen.addresses[0].addReturnedMail(new Date());

            ashling.addAddress(['End of the Road', ''], 'Lexington', 'KY', '34421');

            // Setup accounts
            var samsAccount = new Account(1234, ['Sam Elsamman'], sam, sam.addresses[0]);
            var jointAccount = new Account(123, ['Sam Elsamman', 'Karen Burke', 'Ashling Burke'], sam, karen.addresses[0]);
            jointAccount.addCustomer(karen, 'joint');
            jointAccount.addCustomer(ashling, 'joint');

            samsAccount.credit(100);                        // Sam has 100
            samsAccount.debit(50);                           // Sam has 50
            jointAccount.credit(200);                       // Joint has 200
            jointAccount.transferTo(100, samsAccount);      // Joint has 100, Sam has 150
            jointAccount.transferFrom(50, samsAccount);     // Joint has 150, Sam has 100
            jointAccount.debit(25);                         // Joint has 125

            this.sam = sam;
            this.karen = karen;
            this.ashling = ashling;
        },
        preServerCall: function (changeCount, objectsChanged) {
            for (var templateName in objectsChanged) {
                this.preServerCallObjects[templateName] = true;
            }
            return Q()
                .then(this.sam ? this.sam.refresh.bind(this.sam, null) : true)
                .then(this.karen ? this.karen.refresh.bind(this.karen, null) : true)
                .then(this.ashling ? this.ashling.refresh.bind(this.ashling, null) : true)
                .then(function () {
                    objectTemplate.begin();
                    console.log(this.sam ? this.sam.__version__ : '');
                    objectTemplate.currentTransaction.touchTop = true;
                }.bind(this));
        },
        postServerCall: function () {
            if (this.postServerCallThrowException) {
                throw 'postServerCallThrowException';
            }
            if (this.postServerCallThrowRetryException) {
                throw 'Retry';
            }
            //return;
            var dirtCount = 0;
            serverController.sam.cascadeSave();
            serverController.karen.cascadeSave();
            serverController.ashling.cascadeSave();
            objectTemplate.currentTransaction.postSave = function (txn) {
                this.updatedCount = _.toArray(txn.savedObjects).length;
            }.bind(this);
            return objectTemplate.end()
                .then(function () {
                    PostCallAssert();
                });
        },
        validateServerCall: function () {
            return this.canValidateServerCall;
        },
        preServerCallObjects: {isLocal: true, type: Object, value: {}},
        preServerCalls: {isLocal: true, type: Number, value: 0},
        postServerCalls: {isLocal: true, type: Number, value: 0},
        preServerCallThrowException: {isLocal: true, type: Boolean, value: false},
        postServerCallThrowException: {isLocal: true, type: Boolean, value: false},
        postServerCallThrowRetryException: {isLocal: true, type: Boolean, value: false},
        serverCallThrowException: {isLocal: true, type: Boolean, value: false},
        canValidateServerCall: {isLocal: true, type: Boolean, value: true}
    });

    return {Controller: Controller};

};
