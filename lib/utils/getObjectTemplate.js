'use strict';

function getObjectTemplate(controller) {
    //In Typescript mode, template definitions are global, grab the objectTemplate from a session obj
    //In Javascript mode, template definitions are not global, grab objectTemplate from template
    //return <TS mode> || <JS mode>
    return controller.__objectTemplate__ || controller.__template__.objectTemplate;
}

module.exports = getObjectTemplate;
