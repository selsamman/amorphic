var expect = require('chai').expect;
var Q = require("q");
var fs = require('fs');
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('persistor')(ObjectTemplate, null, ObjectTemplate);
var MongoClient = require('mongodb').MongoClient;
var nconf = require('nconf');
var amorphic = require('../index.js');

var collections = JSON.parse(fs.readFileSync(__dirname + "/../test/model/schema.json"));
PersistObjectTemplate.setSchema(collections);

var requires = amorphic.getTemplates(PersistObjectTemplate, 'test/model/',
	['ticket.js','person.js','person.js','project.js']);

var Ticket = requires.ticket.Ticket;
var TicketItem = requires.ticket.TicketItem;
var TicketItemAttachment =  requires.ticket.TicketItemAttachment;
var TicketItemComment =  requires.ticket.TicketItemComment;
var TicketItemApproval =  requires.ticket.TicketItemApproval;

var projectSemotus;
var Person = requires.person.Person;
var Project = requires.project.Project;
var ProjectRelease = requires.project.ProjectRelease;
var ProjectRole = requires.project.ProjectRole;

var db;

// Injections

Person.inject(function () {
	Person.sendEmail = function (email, subject, body) {
		console.log(email + " " + subject);
	}
});

var securityPrincipal;

PersistObjectTemplate.globalInject(function (obj) {
    obj.getSecurityContext = function () {
        return {principal: securityPrincipal};
    }
});

// Utility function to clear a collection via mongo native
function clearCollection(collectionName) {
	return Q.ninvoke(db, "collection", collectionName).then(function (collection) {
		return Q.ninvoke(collection, "remove").then (function () {
			return Q.ninvoke(collection, "count")
		});
	});
}

describe("Ticket System Test Suite", function () {

    it ("opens the database", function (done) {
        console.log("starting ticket test");
        Q.ninvoke(MongoClient, "connect", "mongodb://localhost:27017/testamorphic").then(function (dbopen) {
            db = dbopen;
            PersistObjectTemplate.setDB(db);
            done();
        });
    });
    // Variables global to test
    var semotus_id;
    var semotusProject;

	it ("clears the ticket system", function (done) {
		clearCollection("ticket").then(function (count) {
			expect(count).to.equal(0);
			return clearCollection('ticketItem')
        }).then(function (count) {
            expect(count).to.equal(0);
            return clearCollection('attachment')
		}).then(function (count) {
			expect(count).to.equal(0);
			return clearCollection('person')
		}).then(function (count) {
			expect(count).to.equal(0);
			return clearCollection('project')
		}).then(function (count) {
			expect(count).to.equal(0);
			done();
		});
	});

    // Persist them (everything hangs off people so the whole graph gets added

    it("can create stuff", function (done)
    {
        // People
        var sam = new Person("sam@elsamman.com", "Sam", "M", "Elsamman");
        var karen = new Person("karen@elsamman.com", "Karen", "M", "Burke");

        // Projects
        projectSemotus = new Project("Semotus");
        var projectTravel = new Project("Travel Bears");
        projectSemotus.addRelease("0.1", (new Date('1/1/14')));
        projectSemotus.addRelease("0.2", (new Date('3/1/14')));
        projectSemotus.addRole("manager", karen);
        projectSemotus.addRole("developer", sam);
        projectTravel.addRole("manager", sam);
        projectTravel.addRole("developer", sam);
        projectTravel.addRelease("0.1", (new Date('1/1/14')));

        // Tickets
        securityPrincipal = sam;
        var ticket1 = projectSemotus.addTicket("semotus ticket1", "Ticket 1");
        var ticket2 = projectSemotus.addTicket(sam, "semotus ticket2", "Ticket 2");
        projectTravel.addTicket("travel ticket1", "Ticket 1");

        securityPrincipal = karen
        var item = ticket1.addComment("ticket1 item1");
        item.addAttachment("attachment1", "data1");
        item.addAttachment("attachment2", "data2");
        ticket1.addApproval();

        // Some negative tests
        var exception = null;
        securityPrincipal = sam;
        try { ticket2.addApproval(); } catch (e) {exception = e.toString()}
        expect (exception).to.equal("only the project manager role can approve a ticket");

        // Save stuff and make sure keys are good

        sam.save().then( function () {
            expect(sam._id.length).to.equal(24);
            return karen.persistSave();
        }.bind(this)).then( function () {
            expect(karen._id.length).to.equal(24);
            return projectSemotus.save();
        }.bind(this)).then(function() {
            expect(projectSemotus._id.length).to.equal(24);
            semotus_id = projectSemotus._id;
            return projectTravel.save();
        }.bind(this)).then( function (id) {
            expect(projectTravel._id.length).to.equal(24);
            done();
        }.bind(this)).fail(function(e){done(e)});
    });

    it("can read stuff back", function (done) {
        Project.getFromPersistWithId(semotus_id,
            {creator: {fetch: true},
             tickets: {fetch: {ticketItems: {fetch: {attachments: true}}}, roles: {fetch: {person: true}}}}).then (function (project)
        {
            expect(project.name).to.equal("Semotus");
            expect(project.roles.length).to.equal(2);
            project.roles.sort(function(a,b){a.created - b.created});
            expect(project.roles[0].person.firstName).to.equal("Karen");
            expect(project.roles[1].person.firstName).to.equal("Sam");
            expect(project.creator.firstName).to.equal("Sam");
            project.tickets.sort(function(a,b){a.created - b.created});
            expect(project.tickets[0].title).to.equal("semotus ticket1");
            project.tickets[0].ticketItems.sort(function(a,b){a.created - b.created});
            expect(project.tickets[0].ticketItems[0] instanceof TicketItemComment).to.equal(true);
            expect(project.tickets[0].ticketItems[1] instanceof TicketItemApproval).to.equal(true);
            project.tickets[0].ticketItems[0].attachments.sort(function(a,b){a.created - b.created});
            expect(project.tickets[0].ticketItems[0].attachments[0].name).to.equal("attachment1");
            expect(project.tickets[0].ticketItems[0].attachments[1].name).to.equal("attachment2");
            done();

        }).fail(function(e) {
            done(e)
        });
    });

    var count = 10;
    var batchSize = 5;
    var start = 0;

    it("can add " + count + " tickets", function (done) {
        for (var ix = 0; ix < projectSemotus.tickets.length; ++ix)
            projectSemotus.tickets[ix].remove();
        for (var ix = 0; ix < count; ++ix)
            projectSemotus.addTicket("Ticket", ix + 1);
        projectSemotus.save().then(function(){done()});
    });

    it ("can read back " + batchSize + " tickets at a time", function (done)
    {
        this.timeout(50000);
        Project.getFromPersistWithId(semotus_id, {tickets: {limit: batchSize}}).then(function(project)
        {
            var processTickets = function (project) {

                for (var ix = 0; ix < project.tickets.length; ++ix) {
                    //console.log(project.tickets[ix].description + " " + (ix + start + 1));
                    expect(ix + start + 1).to.equal(project.tickets[ix].description);
                }

                start += batchSize;
                if (start < count) {
                    return project.fetch({tickets: {skip: start, limit: batchSize, fetch: {creator: true}}}).then(function (project) {
                         return processTickets(project);
                    });
                } else
                    done();
            }
            return processTickets(project);
        }).fail(function(e){done(e)});
    })

    it ("closes the database", function (done) {
        db.close(function () {
            console.log("ending ticket test");
            done()
        });
    });
});



