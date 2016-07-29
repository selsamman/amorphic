/**
 * This is a service that allows you to connect with an amorphic application.  To use this it is recommended that
 * you include a nodejs directory in your project with the server side of your application and then use a hook
 * such as this to keep it in sync with your ionic application
 *
 *
 *
 *
 *
 * you need to include
 * these files in your index.html
 *    <script src="lib/supertype.js"></script>
 *    <script src="lib/semotus.js"></script>
 *    <script src="lib/amorphic.js"></script>
 *    <script src="apps/common/js/baseController.js"></script>
 *    <script src="apps/student/public/js/model.js"></script>
 *    <script src="apps/student/public/js/phraseController.js"></script>
 *    <script src="apps/student/public/js/controller.js"></script>
 */
servicesModule.factory('Amorphic', function ($q, $http, $timeout, $cordovaFileTransfer) {

    var service = this;

    return {

        getSession: function (statusCallback) {
            if (statusCallback)
                service.statusCallback = statusCallback;
            if (service.session)
                return service.session;
            else
                throw new Error("Session Not Initialized");
        },
        getServer: function () {
            return service.server;
        },
        init: function (server, app, statusCallback, forceInit) {
            service.server = server;
            var deferred = $q.defer()
            if (service.session) {
                return deferred.resolve(service.session);
            }
            service.statusCallback = statusCallback;

            return $q.resolve(null)
                .then(initSessionOnServer)
                .then(initSessionOnClient);

            function initSessionOnServer() {
                return $http({method: 'GET', url: server + '/amorphic/init/' + app + '.js?ver=' + (new Date()).getTime()});
            }

            function initSessionOnClient(res) {
                var url = server + "/amorphic/xhr?path=" + app;
                (function () {
                    var document = {write: function(m){console.log(m)}};
                    eval(res.data);
                })()
                /*
                 amorphic.setApplication(app);
                 amorphic.setSchema({});
                 amorphic.setConfig({});
                 amorphic.setInitialMessage({
                 "url": url, "message": {"ver": "0", "startingSequence": 0, "sessionExpiration": 3600000}
                 });
                 */
                console.log("Establishing Session on " + url)
                amorphic.initializationData.url = url;
                amorphic.establishClientSession(
                    "Controller", 0,

                    // Establish a new session whether first time or because of expiry / server restart
                    (function (newController, sessionExpiration) {
                        console.log('Amorphic established communication with server')
                        if (service.session && typeof(service.session.shutdown) == "function")
                            service.session.shutdown();
                        service.session = newController;

                        if (typeof(service.session.clientInit) == "function")
                            service.session.clientInit(sessionExpiration);

                        if (service.statusCallback)
                            service.statusCallback('ready');

                        service.session.fileUpload = function (file) {
                            console.log("Uploading " + file + " to " + server)
                            return $cordovaFileTransfer.upload(server + "/amorphic/xhr?path=" + app + '&file=yes', file,{});
                        }

                        deferred.resolve(service.session)
                    }).bind(this),

                    function () {
                        if (service.statusCallback)
                            service.statusCallback('outofdate');
                        $timeout(function () {})
                    },

                    // If communication
                    function () {
                        session.amorphicStatus = 'offline';
                        if (service.statusCallback)
                            service.statusCallback('online')
                    }
                );
                return service.session;
            };
        }
    }
})
