function flattenTemplates(requiredTemplates) {
    var classes = {};

    for (var f in requiredTemplates) {
        for (var c in requiredTemplates[f]) {
            classes[c] = requiredTemplates[f][c];
        }
    }

    return classes;
}

module.exports = flattenTemplates
