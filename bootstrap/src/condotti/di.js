/**
 * This module contains the implementation of classes that provide dependency 
 * injection support to Condotti framework
 *
 * @module condotti.di
 */
Condotti.add('condotti.di', function (C) {
    
    /**
     * This DottiFactory class is core class of this module to provide
     * dependency injection feature to the Condotti framework. This class is
     * inspired by the BeansFactory class from the famous JAVA framework 
     * "spring".
     *
     * @class DottiFactory
     * @constructor
     * @param {Object} config the config for this dotti factory
     * @param {String} id the identifier of this factory instance in itself
     */
    function DottiFactory (config, id) {
        /**
         * The config object for this dotti factory.
         *
         * {
         *     "objectA": {
         *         "type": "typeA",
         *         "params": {
         *             1: { "reference": "objectB" },
         *             2: { "value": "this is a normal string param" },
         *             3: {
         *                 "type": "Date", 
         *                 "value": "Tue Mar 26 2013 15:29:32 GMT+0800 (CST)"
         *             }
         *         }
         *     }
         * }
         * 
         * @property config_
         * @type Object
         */
        this.config_ = config;
        
        /**
         * The identifier of this factory instance in itself
         * 
         * @property id_
         * @type String
         * @default 'dotti-factory'
         */
        this.id_ = id || 'dotti-factory';
        
        /**
         * The logger instance
         * 
         * @property logger_
         * @type Logger
         */
        this.logger_ = C.logging.getObjectLogger(this);
        
        /**
         * The cache keep track of the already created instances
         * 
         * @property cache_
         * @type Object
         * @deafult {}
         */
        this.cache_ = {};
        
        /* initialize */
        this.set(this.id_, this);
    }
    
    /**
     * Return the required object with the specified name. If the required
     * object has not been created yes, this factory is to be created first
     * and store it in the cache property for future usage. When creating, this
     * factory will calculate the dependencies of the required object, and
     * create all of them when necessary.
     *
     * @method get
     * @param {String} name the name of the object to be returned
     * @return {Object} the required object with the specified name
     */
    DottiFactory.prototype.get = function (name) {
        var dependencies = null,
            next = null,
            self = this;
            
        if (!this.cache_.hasOwnProperty(name)) {
            
            if (!this.config_[name]) {
                this.logger_.warn('Configuration for object ' + name + 
                                  ' does not exist');
                this.cache_[name] = null;
                return null;
            }
            
            next = function (current) {
                var params = null;
                
                if (self.cache_[current]) { // dependency object has already
                                            // been created
                    return [];
                }
                
                if (!self.config_[current]) {
                    self.logger_.warn('Configuration for object ' + current + 
                                      ' does not exist');
                    // self.cache_[current] = null;
                    return [];
                }
                
                params = self.config_[current].params;
                if (!params) {
                    self.logger_.warn('There is no user-specified params for ' +
                                      'this ' + name + ', default [] is used');
                    params = [];
                }
                
                return Object.keys(params).filter(function (name) {
                        return 'reference' in params[name];
                    }
                ).map(function (name) {
                    return params[name].reference;
                });
            };
            // TODO: add logging here
            dependencies = C.algorithm.sorting.topology(name, next);
            
            dependencies.forEach(function (dependency) {
                if (!self.cache_.hasOwnProperty(dependency)) {
                    self.create_(dependency);
                }
            });
        }
        
        return this.cache_[name];
    };
    
    
    /**
     * Set an object with the specified name. Normally this method is used to
     * add dependencies which can not be created by this factory for some 
     * objects to be created, or overwrite the existing one for some reason.
     *
     * @method set
     * @param {String} name the name of the object to be set
     * @param {Object} object the object to be set
     * @return {Object} the original object with the specified name if it
     *                  has already been created
     */
    DottiFactory.prototype.set = function (name, object) {
        var origin = this.cache_[name];
        this.cache_[name] = object;
        return origin;
    };
    
    /**
     * Re-configure this facotry via merging the original one with this 
     * new specified config object. However, this new config can not affect
     * those objects that have already been created before.
     *
     * @method configure
     * @param {Object} config the new specified config object
     */
    DottiFactory.prototype.configure = function (config) {
        this.logger_.debug('Merging the original config ' + 
                           C.lang.reflect.inspect(this.config_) + 
                           ' with user-specified new config ' +
                           C.lang.reflect.inspect(config) + ' ...');
                           
        C.lang.merge(this.config_, config);
        this.logger_.debug('Current config for this dotti factory after ' +
                           'merging: ' + C.lang.reflect.inspect(this.config_));
    };
    
    /**
     * Create the required object with the specified name based on the config.
     * Note that when creating object with this method, one assumption is made
     * that the preprequisites of the required object have already been created
     * and saved in the cache.
     *
     * @method create_
     * @param {String} name the name of the object to be created
     * @return {Object} the created object
     */
    DottiFactory.prototype.create_ = function (name) {
        var type = null,
            params = [],
            config = null,
            self = this,
            message = null;
        
        config = this.config_[name];
        if (!config) {
            this.logger_.warn('Configuration for object ' + name + 
                              ' does not exist');
            this.cache_[name] = null;
            return;
        }
        // TODO: 1. check if config exists
        //       2. add native type support
        /*
        if (config.native) {
            // TODO: create object of native types
        }
        */
        
        // TODO: check if config.type exists
        try {
            type = C.namespace(config.type);
        } catch (e) {
            throw new TypeError('Required type ' + config.type + 
                                ' does not exist in current Condotti instance');
        }
        
        Object.keys(config.params).sort().forEach(function (key) {
            
            var index = parseInt(key, 10),
                param = config.params[key],
                message = null;
            
            // Now only two types of param are supported: value and reference
            if (!param) {
                params[index] = undefined;
            } else if (param.reference) {
                params[index] = self.cache_[param.reference];
            } else if (param.value) {
                params[index] = param.value;
            } else {
                // params[index] = undefined;
                message = 'Unsupported param type. Now only "value"' +
                          ' and "reference" are supported.';
                self.logger_.debug(message);
                self.logger_.debug('Param: ' + C.lang.reflect.inspect(param));
                throw new TypeError(message);
            }
            
            /* } else if ('Date' === param.type) {
                params[index] = new Date(Date.parse(param.value));
            */
        });
        
        // Create the object without 'new', since the params for the constructor
        // is in the params array
        if (!C.lang.reflect.isFunction(type)) {
            message = 'Constructor of the type ' + config.type + 
                      ' of the required object ' + name + 
                      ' is expected to be a function, but ' + 
                      C.lang.reflect.getFunctionName(
                          C.lang.reflect.getObjectType(type)
                      ) + ' is found.';
                      
            // this.logger_.error(message);
            throw new TypeError(message);
        }
        
        this.cache_[name] = Object.create(type.prototype);
        type.apply(this.cache_[name], params);
    };
    
    
    C.namespace('di').DottiFactory = DottiFactory;
    
}, '0.0.1', { requires: ['condotti.lang', 'condotti.reflect',
                         'condotti.logging', 'condotti.algorithm'] });