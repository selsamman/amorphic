'use strict';

module.exports.project = function (objectTemplate, getTemplate) {

    var Person = getTemplate('./person.js').Person;

    var ProjectRelease = objectTemplate.create('ProjectRelease', {
        name: {type: String},
        date: {type: Date},
        status: {
            type: String,
            value: 'planned',
            fill: ['planned', 'complete'],
            using: {'planned':'Planned', 'complete':'Completed'}
        }
    });

    var ProjectRole	= objectTemplate.create('ProjectRole', {
        role:               {type: String,  values: ['manager', 'developer']},
        created:            {type: Date, rule: ['datetime']},
        removed: {type: Date, value: null},
        person:             {type: Person, fetch: true},
        init: function(role, person) {
            this.role = role;
            this.person = person;
            this.created = new Date();
        },
        saveModel: function() {
        }

    });

    var Project = objectTemplate.create('Project', {
        name:               {type: String, value: '', length: 40, rule: ['name', 'required']},
        description:        {type: String, value: ''},
        created:            {type: Date, rule: ['datetime']},
        creator:            {toServer: false, type: Person, fetch: true},
        owner:              {type: Person, fetch: true},  // Needs server pattern like ticket
        roles:              {toServer: false, type: Array, of: ProjectRole, value: [], fetch: true},
        releases:           {toServer: false, type: Array, of: ProjectRelease, value: [], fetch: true},

        init: function (name) {
            this.name = name || null;
        },

        validateServerCall: function () {
            return this.getSecurityContext().principal ? true : false;
        },

        getRole: function (role, person) {
            for (var ix = 0; ix < this.roles.length; ++ix) {
                if (role === this.roles[ix].role && person === this.roles[ix].person) {
                    return this.roles[ix];
                }
            }
            return null;
        },

        addRole: function(role, person) {
            var projectRole = this.getRole(role, person);
            if (!projectRole) {
                this.roles.push(new ProjectRole(role, person));
            }
        },

        removeRole: function (role, person) {
            var projectRole = this.getRole(role, person);
            if (projectRole) {
                projectRole.remove = new Date();
            }
        },

        getRoles: function (role, showInactive) {
            var projectRoles = [];
            for (var ix = 0; ix < this.roles.length; ++ix) {
                if ((!role || role === this.roles[ix].role) &&
				(showInactive || !this.roles[ix].remove)) {
                    projectRoles.push(this.roles[ix]);
                }
            }
            return projectRoles;
        },

        addRelease: function (name, date) {
            var release = new ProjectRelease();
            release.name = name;
            release.status = 'planned';
            release.date = date;
            this.releases.push(release);
        },

        getRelease: function (name) {
            for (var ix = 0; ix < this.releases.length; ++ix) {
                if (name === this.releases[ix].name) {
                    return this.releases[ix];
                }
            }
            return null;
        },

        saveModel: function () {
            this.creator = this.getSecurityContext().principal;
            this.created = new Date();
            return this.persistSave();
        },
        remove: function () {
            return this.persistDelete();
        }
    });

    ProjectRelease.mixin({
        project:            {type: Project}
    });

    return {
        ProjectRole: ProjectRole,
        ProjectRelease: ProjectRelease,
        Project: Project
    };
};
module.exports.project_mixins = function (_root, requires) {
    var Ticket = requires.ticket.Ticket;

    requires.project.Project.mixin({
        tickets:        {type: Array, of: Ticket, value: []},
        addTicket: function (title, text) {
            var ticket = new Ticket(title, text);
            ticket.project = this;
            this.tickets.push(ticket);
            return ticket;
        }
    });
};
