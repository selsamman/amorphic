/*
 * Banking example shows PersistObjectTemplate with
 * many-to-many relationships
 *
 */

var expect = require('chai').expect;
var Q = require("q");
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('persistor')(ObjectTemplate, null, ObjectTemplate);

var Customer = PersistObjectTemplate.create("customer:Customer", {
	init: function (first, middle, last) {
		this.firstName = first;
		this.lastName = last;
		this.middleName = middle;
	},
	email:		{type: String, value: "", length: 50, rule: ["text", "email", "required"]},
	firstName:  {type: String, value: "", length: 40, rule: ["name", "required"]},
	middleName: {type: String, value: "", length: 40, rule: "name"},
	lastName:	{type: String, value: "", length: 40, rule: ["name", "required"]},
	phones:		{type: Array, of: String, value: [""], max: 3},
	local1:      {type: String, persist: false, value: "local1"},
	local2:      {type: String, isLocal: true, value: "local2"}
});
var Address = PersistObjectTemplate.create("customer:Address", {
	init:       function (customer) {
		this.customer   = customer;
	},
	lines:      {type: Array, of: String, value: [], max: 3},
	city:       {type: String, value: "", length: 20},
	state:      {type: String, value: "", length: 20},
	postalCode: {type: String, value: "", length: 20},
	country:    {type: String, value: "US", length: 3}
});
Customer.mixin({
	addAddress: function(lines, city, state, zip) {
		var address = new Address(this);
		address.lines = lines;
		address.city = city;
		address.state = state;
		address.postalCode = zip;
		this.addresses.push(address);
	},
	addresses:  {type: Array, of: Address, value: []}
});
Address.mixin({
	customer:  {type: Customer}
});
var Role = PersistObjectTemplate.create("role:Role", {
	init:       function (customer, account, relationship) {
		this.customer = customer;
		this.account = account;
		if (relationship)
			this.relationship = relationship;
	},
	relationship: {type: String, value: "primary"},
	customer:     {type: Customer}
});

var Account = PersistObjectTemplate.create("account:Account", {
	init:       function (number, title, customer) {
		this.number = number;
		this.title = title;
		if (customer)
			this.addCustomer(customer);
	},
	addCustomer: function(customer, relationship) {
		var role = new Role(customer, this, relationship);
		this.roles.push(role);
		customer.roles.push(role);
	},
	number:     {type: Number},
	title:      {type: Array, of: String, max: 4},
	roles:      {type: Array, of: Role, value: [], fetch: true}
});

var Transaction = PersistObjectTemplate.create("transaction:Transaction", {
	init:       function (account, type, fromAccount) {
		this.account = account;
		this.fromAccount = fromAccount;
		this.type = type;
		this.account.account.push(this);
		if (fromAccount)
			this.fromAccount.push(this);
	},
	amount:     {type: Number},
	type:       {type: String, values: ["dr", "cr"]},
	types:      {type: Object, isTransient: true, values: {"dr":"Debit", "cr":"Credit"}},
	account:    {type: Account},
	fromAccount: {type: Account}
});

Customer.mixin({
	roles:      {type: Array, of: Role, value: []}
});

Role.mixin({
	account: {type: Account}
});

Account.mixin({
	transactions: {type: Array, of: Transaction}
});

PersistObjectTemplate.performInjections(); // Normally done by getTemplates

var collections = {
	customer: {
		template: Customer,
		children: {
			roles: {template: Role, id:"customer_id"}
		}
	},
	account: {
		template: Account,
		children: {
			roles: {template: Role, id:"account_id"},
			transactions: {template: Transaction, id: "account_id"}
		}
	},
	role: {
		template: Role,
		parents: {
			customer: {template: Customer, id: 'customer_id'},
			account: {template: Account, id: 'account_id'}
		}
	},
	transaction: {
		template: Transaction,
		parents: {
			account: {template: Account},
			fromAccount: {template: Account}
		}
	}
};


var MongoClient = require('mongodb').MongoClient;
var Q = require('Q');
var db;


function clearCollection(collectionName) {
	return Q.ninvoke(db, "collection", collectionName).then(function (collection) {
		return Q.ninvoke(collection, "remove").then (function () {
			return Q.ninvoke(collection, "count")
		});
	});
}

describe("Banking Example", function () {

    it ("opens the database", function (done) {
        console.log("starting banking");
        Q.ninvoke(MongoClient, "connect", "mongodb://localhost:27017/testpersist").then(function (dbopen) {
            db = dbopen;
            PersistObjectTemplate.setDB(db);
            PersistObjectTemplate.setSchema(collections);
            done();
        });
    });

    it ("clears the bank", function (done) {
        clearCollection("role")
            .then(function (count) {
                expect(count).to.equal(0);
                return clearCollection('account')
            }).then(function (count) {
                expect(count).to.equal(0);
                return clearCollection('customer')
            }).then(function (count) {
                expect(count).to.equal(0);
                done();
            });
    });


    var sam = new Customer("Sam", "M", "Elsamman");
    sam.local1 = "foo";
    sam.local2 = "bar";
    sam.addAddress(["500 East 83d", "Apt 1E"], "New York", "NY", "10028");
    sam.addAddress(["38 Haggerty Hill Rd", ""], "Rhinebeck", "NY", "12572");
    var karen = new Customer("Karen", "M", "Burke");
    karen.addAddress(["500 East 83d", "Apt 1E"], "New York", "NY", "10028");
    karen.addAddress(["38 Haggerty Hill Rd", ""], "Rhinebeck", "NY", "12572");
    var account = new Account(123, ['Sam Elsamman', 'Karen Burke'], sam);
    account.addCustomer(karen, "joint");

    var customer_id;


    it("can insert", function (done) {
        sam.persistSave().then(function(id) {
            customer_id = sam._id;
            expect(customer_id.length).to.equal(24);
            done();
        }).fail(function(e){done(e)});
    });

    function verifyCustomer(customer) {
        expect(customer.firstName).to.equal("Sam");
        expect(customer.local1).to.equal("local1");
        expect(customer.local2).to.equal("local2");
        expect(customer.roles[0].relationship).to.equal("primary");
        expect(customer.roles[0].customer).to.equal(customer);
        expect(customer.roles[0].accountPersistor.isFetched).to.equal(false);
        return customer.roles[0].fetch({account: {fetch: {roles: {fetch: {customer: {fetch: {roles: true}}}}}}}).then( function () {
            expect(customer.roles[0].account.number).to.equal(123);
            var primaryRole = customer.roles[0].account.roles[0].relationship == 'primary' ?
                customer.roles[0].account.roles[0] : customer.roles[0].account.roles[1];
            expect(primaryRole).to.equal(customer.roles[0]);
            var jointRole = customer.roles[0].account.roles[0].relationship == 'joint' ?
                customer.roles[0].account.roles[0] : customer.roles[0].account.roles[1];
            expect(jointRole).to.equal(jointRole.customer.roles[0]);
            expect(customer.addresses[0].lines[0]).to.equal("500 East 83d");
            expect(customer.addresses[1].lines[0]).to.equal("38 Haggerty Hill Rd");
            expect(customer.addresses[1].customer).to.equal(customer);
            return 0;
        });
    }

    it("can retrieve", function (done) {
        Customer.getFromPersistWithId(customer_id, {roles: true}).then (function (customer) {
            return verifyCustomer(customer).then(function () {
                done();
            });
        }).fail(function(e){
                done(e)
        });
    });
/*
    it ("can serialize and deserialize", function(done) {
        Customer.getFromPersistWithId(customer_id, {roles: {account: true}}).then (function (customer) {
            var str = customer.toJSONString();
            var customer2 = Customer.fromJSON(str);
            return verifyCustomer(customer2).then(function () {;
                done();
            });
        }).fail(function(e){done(e)});
    });
*/

    it("can delete", function (done) {
        Customer.getFromPersistWithId(customer_id,
            {roles: {fetch: {account: {fetch: {roles: {fetch: {customer: {fetch: true}}}}}}}}).then (function (customer) {
            var promises = [];
            for (var ix = 0; ix < customer.roles.length; ++ix) {
                var account = customer.roles[0].account;
                for (var jx = 0; jx < account.roles.length; ++jx)
                    if (customer.roles[ix] != account.roles[jx]) {
                        promises.push(account.roles[jx].persistDelete());
                        promises.push(account.roles[jx].customer.persistDelete());
                    }
                promises.push(account.persistDelete())
                promises.push(customer.roles[0].persistDelete());
            }
            promises.push(customer.persistDelete());
            return Q.allSettled(promises).then (function () {
                return Customer.countFromPersistWithQuery()
            }).then (function (count) {
                expect(count).to.equal(0);
                return Account.countFromPersistWithQuery()
            }).then(function (count) {
                expect(count).to.equal(0);
                return Role.countFromPersistWithQuery()
            }).then(function (count) {
                expect(count).to.equal(0);
                done();
            });
        }).fail(function(e){done(e)});
    });

    it("closes the database", function (done) {
        db.close(function () {
            console.log("ending banking");
            done()
        });
    });

});
