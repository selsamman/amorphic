import {Supertype, supertypeClass, property, remote, Remoteable, Persistable}  from '../../../../index.js';
import {Person} from './person';
import {Project} from './project';
import {TicketItemComment} from './ticketItemComment';
import {TicketItem} from './ticketItem';
import {Created, Constructable} from './created'
console.log("Compiling Ticket");
@supertypeClass


export class Ticket  extends Created(Remoteable(Persistable(Supertype))){

    @property({rule: ['required']})
    title:			string;

    @property()
    description:	string;

    @property({toServer: false, fetch: true})
    project:            Project;

    @property({type: TicketItem, fetch: true})
    ticketItems: 	Array<TicketItem> = [];

    constructor (title? : string, description? : string, projectName? : string, projectDescription? : string) {
        super();
        this.title = title || null;
        this.description = description || null;
        if (projectName)
            this.project = new Project(projectName, projectDescription);
    };

    @remote({validate: function () {return this.validate();}})
    addComment (comment, creator?) : TicketItem {
        comment = new TicketItemComment(this, comment, creator);
        this.ticketItems.push(comment);
        return comment;
    }

    @remote()
    remove () {		//  {on: "server", body: function ()
        for (var ix = 0; ix < this.ticketItems.length; ++ix)
            this.ticketItems[ix].remove();
        if (this.project) {
            for (var ix = 0; ix < this.project.tickets.length; ++ix)
                if (this.project.tickets[ix] == this)
                    this.project.tickets.splice(ix, 1);
            this.project.save();
        }
        return this.persistDelete();
    };

    @remote({validate: function () {return this.validate()}})
    save () {
        if (!this.created)
            this.created = new Date();
/*
     if (!this.creator)
     this.creator = this.getSecurityContext().principal;
*/
        return this.persistSave();
    }
};