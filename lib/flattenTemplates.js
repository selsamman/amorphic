'use strict';

function flattenTemplates(requiredTemplates) {
    let classes = {};

    for (let f in requiredTemplates) {
        for (let c in requiredTemplates[f]) {
            classes[c] = requiredTemplates[f][c];
        }
    }

    return classes;
}

module.exports = flattenTemplates;
