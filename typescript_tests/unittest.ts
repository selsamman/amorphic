import { expect } from 'chai';
import {Amorphic} from '../index.js';
import {Ticket} from "./apps/common/js/ticket";

var amorphic = Amorphic.create();
amorphic.connect(__dirname, __dirname);

describe('Banking from pgsql Example', () => {

    it ('sets it all up', async () => {
        await amorphic.connect(__dirname, __dirname);
        await amorphic.dropAllTables();
        await amorphic.syncAllTables();
    });

    it ('can create a ticket', async () => {
        var ticket = new Ticket("My First Ticket", "This is the beginning of  something good", "Project One");
        amorphic.beginDefaultTransaction();
        ticket.persistorSave();
        await amorphic.commit();
    });

    it('can read back the ticket', async () => {
        var tickets : Array<Ticket> = await Ticket.persistorFetchByQuery({}, {fetch: {project: true}})
        expect(tickets.length).to.equal(1);
        expect(tickets[0].project.name).to.equal("Project One");
    });
});