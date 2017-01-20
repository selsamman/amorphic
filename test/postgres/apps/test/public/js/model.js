module.exports.model = function (objectTemplate) {
    var Customer = objectTemplate.create('Customer', {
        init: function (first, middle, last) {
            this.firstName = first;
            this.lastName = last;
            this.middleName = middle;
        },
        email:		{type: String, value: '', length: 50, rule: ['text', 'email', 'required']},
        firstName:  {type: String, value: '', length: 40, rule: ['name', 'required']},
        middleName: {type: String, value: '', length: 40, rule: 'name'},
        lastName:	{type: String, value: '', length: 40, rule: ['name', 'required']},
        local1:      {type: String, persist: false, value: 'local1'},
        local2:      {type: String, isLocal: true, value: 'local2'}
    });
    var Address = objectTemplate.create('Address', {
        init:       function (customer) {
            this.customer   = customer;
        },
        lines:      {type: Array, of: String, value: [], max: 3},
        city:       {type: String, value: '', length: 20},
        state:      {type: String, value: '', length: 20},
        postalCode: {type: String, value: '', length: 20},
        country:    {type: String, value: 'US', length: 3}
    });
    Customer.mixin({
        referredBy: {type: Customer, fetch: true},
        referrers:  {type: Array, of: Customer, value: [], fetch: true},
        addAddress: function(lines, city, state, zip) {
            var address = new Address(this);
            address.lines = lines;
            address.city = city;
            address.state = state;
            address.postalCode = zip;
            address.customer = this;
            this.addresses.push(address);
        },
        addresses:  {type: Array, of: Address, value: [], fetch: true}
    });
    var ReturnedMail = objectTemplate.create('ReturnedMail', {
        date: {type: Date},
        address: {type:Address},
        init: function (address, date) {
            this.address = address;
            this.date = date;
        }
    });
    Address.mixin({
        customer:  {type: Customer},
        returnedMail: {type: Array, of: ReturnedMail, value: []},
        addReturnedMail: function (date) {
            this.returnedMail.push(new ReturnedMail(this, date));
        }
    });
    var Role = objectTemplate.create('Role', {
        init:       function (customer, account, relationship) {
            this.customer = customer;
            this.account = account;
            if (relationship) {
                this.relationship = relationship;
            }
        },
        relationship: {type: String, value: 'primary'},
        customer:     {type: Customer}
    });

    var Account = objectTemplate.create('Account', {
        init:       function (number, title, customer, address) {
            if (address) {
                this.address = address;
                this.address.account = this;
            }
            this.number = number;
            this.title = title;
            if (customer) {
                this.addCustomer(customer);
            }
        },
        addCustomer: function(customer, relationship) {
            var role = new Role(customer, this, relationship);
            this.roles.push(role);
            customer.roles.push(role);
        },
        number:     {type: Number},
        title:      {type: Array, of: String, max: 4},
        roles:      {type: Array, of: Role, value: [], fetch: true},
        address:    {type: Address},
        debit: function (amount) {
            new Transaction(this, 'debit', amount);
        },
        credit: function (amount) {
            new Transaction(this, 'credit', amount);
        },
        transferFrom: function (amount, fromAccount) {
            new Transaction(this, 'xfer', amount, fromAccount);
        },
        transferTo: function (amount, toAccount) {
            new Transaction(toAccount, 'xfer', amount, this);
        },
        listTransactions: function () {
            var str = '';
            processTransactions(this.transactions);
            processTransactions(this.fromAccountTransactions);
            function processTransactions (transactions) {
                transactions.forEach(function (transaction) {
                    str += transaction.type + ' ' + transaction.amount + ' ' +
                        (transaction.type.xfer ? transaction.fromAccount.__id__ : '') + ' ';
                });
            }
            console.log(str);
        },
        getBalance: function () {
            var balance = 0;
            var thisAccount = this;
            function processTransactions  (transactions) {
                for (var ix = 0; ix < transactions.length; ++ix) {
                    switch (transactions[ix].type) {
                    case 'debit':
                        balance -= transactions[ix].amount;
                        break;
                    case 'credit':
                        balance += transactions[ix].amount;
                        break;
                    case 'xfer':
                        balance += transactions[ix].amount * (transactions[ix].fromAccount === thisAccount ? -1 : 1);
                    }
                }
            }
            processTransactions(this.transactions);
            processTransactions(this.fromAccountTransactions);
            return balance;
        }
    });
    Address.mixin({
        account:  {type: Account}
    });
    var Transaction = objectTemplate.create('Transaction', {
        init:       function (account, type, amount, fromAccount) {
            this.account = account;
            this.fromAccount = fromAccount;
            this.type = type;
            this.amount = amount;
            if (account) {
                account.transactions.push(this);
            }
            if (fromAccount) {
                fromAccount.fromAccountTransactions.push(this);
            }
        },
        amount:     {type: Number},
        type:       {type: String},
        account:    {type: Account, fetch: true},
        fromAccount: {type: Account, fetch: true}
    });

    Customer.mixin({
        roles:      {type: Array, of: Role, value: []}
    });

    Role.mixin({
        account: {type: Account}
    });

    Account.mixin({
        transactions: {type: Array, of: Transaction, value: [], fetch: true},
        fromAccountTransactions: {type: Array, of: Transaction, value: [], fetch: true}
    });

    return {
        Customer: Customer,
        Address: Address,
        ReturnedMail: ReturnedMail,
        Role: Role,
        Account: Account,
        Transaction: Transaction
    };

};
