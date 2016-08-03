## 1.3.0
* New bindster
* Fixed browser logging on server to include session
## 1.2.13
* Addeed call to controller.displayError for amorphic errors
## 1.2.11
* Fixed bug where session expiration could cause controller id mismatch if pending calls
## 1.2.1
* Logging
## 1.1.0
* Use new pattern for change tracking
## 1.0.2
* Added module.exports.objectTemplateInitialize function call in controllers to deal with client ordering of templates
## 1.0.1
* Took care of non-database case
* Added timeout default
* Prevent multiple schema updates on sourceMode==prod
* Added full request in call to controller's post method
## 1.0.0-rc.1
* No change
## 1.0.0-beta.8
* Latest versions of persistor and semotus
## 1.0.0-beta.7
* Include updated dependencies
## 1.0.0-beta.1
* Moving to semver convention
* Call to semotus for serialization and garbage collection
* Option to not have source maps prodns
* Default to compressed uglified source
## 0.2.33
* Pre-uglify things for better performance
## 0.2.30
* Use Uglify to compress source when set to production
## 0.2.29
* improved on --sourceMode prod by having two files, one dynaamic and one cached
* Fixed source map mismatch
## 0.2.28
* Added --sourceMode prod option cosolidate model source into a single file
* Added --compressXHR true option to compress XHR responses.
## 0.2.26
* Including alpha client for ionic
## 0.2.25
* Added option to compress session data with zlib (--compressSession)
* All configs included in global config even if application not invoked
## 0.2.24
* Put post session inject before amorphic processing to allow requestion injection
## 0.2.23
* Allow post processing to be asynchronous
## 0.2.22
* Added config.set in sumulated nconf
## 0.2.21
* Added post handling
## 0.2.20
* New config file scheme allows config file settings to be overriddent at the app directory level
## 0.2.16
* set maximum time to block call for semotus
## 0.2.15
* configurable connections with default set to 20
## 0.2.14
* don't mark restored data from session as __changed__
## 0.2.13
* Dependent on Persistor 0.2.68 or higher
* Serializes objectMap on behalf of Persistor
## 0.2.10
* Changed adding persistor properties to use a list passed from Peristor
## 0.2.07
* Changes in support of Postgres in Persistor
## 0.2.06
* Changes in support of Postgres in Persistor
## 0.2.05
* Attempt to destory knex connection on exit
## 0.2.04
* support for dbpassword
## 0.2.03
* Added dbUser, dbType, dbDriver config parameters to both base and application level config.json
## 0.2.01
* Support for transactions
* Support for new semotus/persistor with Postgres databases
## 0.1.89
* Included link to video
* Pull standard amorphic-bindster
## 0.1.88
* Beta version including beta version 0.1.51 of amorphic-bindster for new router functionality 
## 0.1.87
* serverInit on controller was not tracking changes
* zombie handling allowed messages to go through
## 0.1.86
* Fixed problem introduced in 1.85
## 0.1.85
* Allow get fetch to be forced by specifying query options
## 0.1.83
* Updated doctor patient sample
* Set zombie status before expiring controller
## 0.1.83
* Updated doctor patient sample
## 0.1.82
* Clear session when we expireController()
## 0.1.81
* Record incoming IP address in objectTemplate.incomingIP
## 0.1.80
* Make config_secure.json override config.json
## 0.1.76
* setConfig was causing leakage of data from secure.json
## 0.1.75
* Don't let undefined values in template returns throw an exception
## 0.1.74
* Don't require referer header to support AWS Cloudfront
## 0.1.73
* Don't expect persistors for non-schema objects
## 0.1.72
* Added objectTemplate.expireSession
## 0.1.71
* Got rid of obsolete code
* Allow {client: false} as the 2nd parameter of getTemplate to prevent transmission to browser
## 0.1.70
* Don't cause refresh if server call didn't make changes
## 0.1.69
* Force version on model files to prevent browser caching issue
## 0.1.68
* Problem in amorphic url for test framework
## 0.1.65
* Corrected problems starting specific applications from command line
* Support for new subdoc handling in persistor
## 0.1.62
* Allow file uploads in iFrames
## 0.1.61
* Zombie detection code now takes into account application name  
## 0.1.60
* file upload mechansim now compatible with REDIS  
## 0.1.59
* support for file download  
## 0.1.54
* queue up messages while being processed by server so stuff goes single file  
## 0.1.51
* application parameter in config.json or environment / start parameter must specifiy list of apps to star separated by ; 
## 0.1.50
* Use env variables or command parameters dbname and dbpath if app level names and paths are not specified 
## 0.1.49
* Don't require subclasses in same collection to be defined in schema
## 0.1.48
* File upload handling was broken
## 0.1.47
* Changes to be compatible with new persistor sub-document handling
## 0.1.46
* Changes to be compatible with new convention for schemas and collections
## 0.1.44
* Allow other requests to be injected
## 0.1.43
* Allow supertype and semotus to be installed in root of project without messing up client paths
## 0.1.42
* Changed path for xhr calls to /amorphic/xhr?path= to make it easier to map
## 0.1.40
* Added support for daemons (batch tasks)
## 0.1.38
* fixed problem referencing static assets for other than the default application
## 0.1.37
* schema.js and config.js can now be in /app/common
* fixed another issues with multiple applications
## 0.1.35
* Multiple applications had some path issues
## 0.1.35
* You can now place common template files in /app/common/js
## 0.1.33
* Include new dependencies
## 0.1.31
* Include model files as document.writes of the script files since source mapping would otherwise not be available
## 0.1.30
* Tests were not running because securityContext injected in supertype rather than peristor
## 0.1.28
* Corrected a problem when controllers are created on the server model was not being passed to client
## 0.1.27
* Include proper path for modules
* Fixed incorrect file upload handling
* Include controller and it's dependency automatically for the browser
Note:  You must remove any script statements to include the model as they are included automatically no
       when you include /amorphic/init