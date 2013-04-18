/**
 * This logging module creates the namespace `logging`, and contains the basic
 * logging related functionalities, such as getObjectRepr, traceObjectMethods, etc
 *
 * @module condotti.logging
 */
Condotti.add('condotti.logging', function (C, config) {
    
    /**
     * The logging namespace is expected to contain all the logging related
     * functionalities.
     *
     * @namespace logging
     */
    var L = C.namespace('logging'),
        Levels = null;
    
    /**
     * The helper class to define the log level
     *
     * @class Level
     * @constructor
     * @param {String} name the name of the log level
     * @param {Number} value the numeric value of the level used in comparation
     */
    function Level(name, value) {
        /**
         * The name of this level
         * 
         * @property name
         * @type String
         * @deafult name
         */
        this.name = name;
        
        /**
         * The numeric value of this level
         * 
         * @property value
         * @type Number
         * @deafult value
         */
        this.value = value;
    }
    
    Levels = {
        'ALL': new Level('ALL', Number.MIN_VALUE),
        'TRACE': new Level('TRACE', 100),
        'DEBUG': new Level('DEBUG', 200),
        'INFO': new Level('INFO', 300),
        'WARN': new Level('WARN', 400),
        'ERROR': new Level('ERROR', 500),
        'FATAL': new Level('FATAL', 600),
        'OFF': new Level('OFF', Number.MAX_VALUE)
    };
    
    L.Levels = Levels;
    
    
    
    /**
     * A simple Logger implementation which is used by the logging module by 
     * default. This Logger class use the console object provided in the lang
     * module as the output.
     *
     * @class Logger
     * @constructor
     */
    function Logger(category, level) {
        /**
         * The category this logger is created fo
         *
         * @property category_
         * @type String
         */
        this.category_ = category;
        
        /**
         * The log level for this instance
         * 
         * @property level_
         * @type Number
         * @deafult Level.TRACE
         */
        this.level_ = level || Logger.level;
    }
    
    /**
     * Set the log level for this logger
     *
     * @method setLevel
     * @param {String} level the level name in string format
     */
    Logger.prototype.setLevel = function (level) {
        this.level_ = Levels[level];
    };
    
    
    /**
     * The internal log facility method
     *
     * @method log_
     * @param {String} level the log level string
     * @param {String} message the message to be logged
     */
    Logger.prototype.log_ = function(level, message) {
        if (this.level_.value < level.value) {
            return;
        }
        
        C.lang.console.log('[' + this.category_ + ']' + '[' + level.name + 
                           '] ' + message);
    };
    
    /**
     * The exposed fatal method
     *
     * @method fatal
     * @param {String} message the message to be logged
     */
    Logger.prototype.fatal = function(message) {
        this.log_(Levels.FATAL, message);
    };
    
    /**
     * The exposed error method
     *
     * @method error
     * @param {String} message the message to be logged
     */
    Logger.prototype.error = function(message) {
        this.log_(Levels.ERROR, message);
    };
    
    /**
     * The exposed warn method
     *
     * @method warn
     * @param {String} message the message to be logged
     */
    Logger.prototype.warn = function(message) {
        this.log_(Levels.WARN, message);
    };
    
    /**
     * The exposed info method
     *
     * @method info
     * @param {String} message the message to be logged
     */
    Logger.prototype.info = function(message) {
        this.log_(Levels.INFO, message);
    };
    
    /**
     * The exposed debug method
     *
     * @method debug
     * @param {String} message the message to be logged
     */
    Logger.prototype.debug = function(message) {
        this.log_(Levels.DEBUG, message);
    };
    
    /**
     * The exposed trace method
     *
     * @method trace
     * @param {String} message the message to be logged
     */
    Logger.prototype.trace = function(message) {
        this.log_(Levels.TRACE, message);
    };
    
    /* set default global level */
    Logger.level = Levels.TRACE;
    
    L.setGlobalLogLevel = function (level) {
        Logger.level = Levels[level];
    };
    
    if (config && config.level) {
        L.setGlobalLogLevel(config.level);
    }
    
    /**
     * The internal logger cache, which caches the created loggers by their
     * category. When getLogger is called, if the logger for the required
     * category already exist, then the cached one is returned, otherwise
     * a new one for that category is created and added to the cache.
     *
     * @property loggers_
     * @type Object
     */
    var loggers_ = {};
    
    /**
     * A dummy function as a placeholder should be replaced by other logging
     * provider, such as logging-nodejs module, to provide the logging
     * functionalities. 
     *
     * @method getLogger
     * @param {String} category the category this logger is for
     * @return {Logger} the logger required
     */
    L.getLogger = function (category) {
        return loggers_[category] || 
               (loggers_[category] = new Logger(category));
    };
    
    /**
     * Return the logger for the passed in function. Usually the logger for a
     * function is created with the function name as the category, and saved
     * as a private property of the function. After it's saved, it (the logger)
     * is returned each time this method is called.
     *
     * @method getFunctionLogger
     * @param {Function} func the function whose logger is to be returned
     * @return {Logger} the logger for this function. If it does not exist, the
     *                  method will try to create it by new C.logging.Logger.
     *                  But obviously if the Logger class has not been defined,
     *                  the creation will fail, then null is returned.
     */
    L.getFunctionLogger = function (func) {
        return func.logger_ || 
               (func.logger_ = C.logging.getLogger(
                   C.lang.reflect.getFunctionName(func)
               ));
    };
    /**
     * Return a logger for the type of the passed in object.
     *
     * @method getObjectLogger
     * @param {Object} object the object whose logger is to be returned
     * @return {Logger} the logger object for the type of this object
     */
    L.getObjectLogger = function (object) {
        return C.logging.getFunctionLogger(C.lang.reflect.getObjectType(object));
    };
    
    
    /**
     * A utility function to wrap all the method in a constructor's prototype
     * in order to trace the entrance/exit of the method, log the params
     * passed in, and also the result returned by the method. Exception thrown
     * from the method can also be logged.
     *
     * @method tracePrototypeMethods
     * @param {Function} func the type constructor methods of whose prototype
     *                   will be traced
     */
    L.tracePrototypeMethods = function (func) {
        var logger = C.logging.getFunctionLogger(func),
            prototype = func.prototype;
        
        Object.keys(prototype).forEach(function (name, index) {
            var value = prototype[name],
                wrapped = null;
            
            if (!C.lang.reflect.isFunction(value)) {
                return true;
            }
            
            wrapped = value;
            if (wrapped.traced_) {
                return true;
            }
            
            func.prototype[name] = function () {
                var portraits = [],
                    result = null;
                
                arguments.forEach(function (argument) {
                    portraits.push(C.logging.getObjectPortrait(argument));
                });
                
                logger.trace('[ENTER] [' + name + '] [' + portraits.join(', ') + 
                             ']');
                try {
                    result = wrapped.apply(this, arguments);
                    logger.trace('[EXIT] [' + name + '] [' + 
                                 C.logging.getObjectPortrait(result) + ']');
                } catch (e) {
                    logger.trace('[EXIT] [' + name + '] [EXCEPTION] [' + 
                                 C.logging.getObjectPortrait(e) + ']');
                    throw e;
                }
            };
            
            func.prototype[name].traced_ = true;
        });
    };
    
    /**
     * Add couples of logging utility functions to the Condotti instance.
     * If the logger has not been created successfully, the message will 
     * be discarded silently.
     *
     * @method fatal/error/warn/info/debug/trace
     * @param {String} message the message to be logged
     * @return {Condotti} the calling Condotti instance
     */
    ['fatal', 'error', 'warn', 'info', 'debug', 'trace'].forEach( 
                   function (name, index) {
                       C[name] = function (message) {
                           if (C.logger_ && C.logger_[name]) {
                               C.logger_[name](message);
                           }
                       };
                       return true;
                   });
    
}, '0.0.1', { requires: ['condotti.lang', 'condotti.errors'] });
