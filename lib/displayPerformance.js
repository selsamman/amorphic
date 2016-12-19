var Semotus = require('semotus');

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 */
function displayPerformance(req) {
    var logger = Semotus.createLogger();

    logger.setContextProps(req.amorphicTracking.loggingContext);

    var diff = process.hrtime(req.amorphicTracking.startTime);
    var totalTime = (diff[0] * 1e9 + diff[1]) / 1000000;
    var taskTime = 0;

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
