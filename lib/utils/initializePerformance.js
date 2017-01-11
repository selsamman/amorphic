'use strict';

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} _resp unknown
 * @param {unknown} next unknown
 */
function initializePerformance(req, _resp, next) {
    req.amorphicTracking = {
        startTime: process.hrtime(),
        serverTasks: [],
        browserTasks: [],
        loggingContext: {},
        addServerTask: function addTask(props, hrStartTime) {
            let diff = process.hrtime(hrStartTime);
            let took = (diff[0] * 1e9 + diff[1]) / 1000000;
            props.time = took;
            this.serverTasks.push(props);
        }
    };

    next();
}

module.exports = {
    initializePerformance: initializePerformance
};
