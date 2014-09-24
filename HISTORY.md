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