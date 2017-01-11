'use strict';

let Semotus = require('semotus');

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 */
function displayPerformance(req) {
    let logger = Semotus.createLogger();

    logger.setContextProps(req.amorphicTracking.loggingContext);

    let diff = process.hrtime(req.amorphicTracking.startTime);
    let totalTime = (diff[0] * 1e9 + diff[1]) / 1000000;
    let taskTime = 0;

    req.amorphicTracking.serverTasks.forEach(function d(task) {
        taskTime += task.time;
    });

    logger.info({
        component: 'amorphic',
        module: 'listen',
        duration: totalTime,
        browserPerformance: req.amorphicTracking.browser,
        serverTasks: req.amorphicTracking.serverTasks,
        unaccounted: totalTime - taskTime},
        'Request Performance');
}

module.exports = {
    displayPerformance: displayPerformance
};
