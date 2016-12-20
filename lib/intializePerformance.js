
/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} _resp unknown
 * @param {unknown} next unknown
 */
function intializePerformance(req, _resp, next) {
    req.amorphicTracking = {
        startTime: process.hrtime(),
        serverTasks: [],
        browserTasks: [],
        loggingContext: {},
        addServerTask: function ardTask(props, hrStartTime) {
            var diff = process.hrtime(hrStartTime);
            var took = (diff[0] * 1e9 + diff[1]) / 1000000;
            props.time = took;
            this.serverTasks.push(props);
        }
    };

    next();
}

module.exports = {
    intializePerformance: intializePerformance
};
