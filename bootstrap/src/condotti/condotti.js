/**
 * The main module of Condotti framework
 *
 * @module condotti
 */


/**
 * The Condotti global implementation
 *
 * @class Condotti
 * @constructor
 * @param {Object} config the config object for the Condotti instances
 */
function Condotti (config) {
    
    if (!(this instanceof Condotti)) {
        return new Condotti(config);
    }
    
    var C = this;
    /**
     * The config object
     * 
     * @property config_
     * @type Object
     * @private
     */
    C.config_ = config || {};
    
    /**
     * The loaded modules
     *
     * @property loaded_
     * @type Object
     */
    C.loaded_ = Condotti.loaded_;
    
    /**
     * The calcualted module dependencies
     *
     * @property calculatedDependencies_
     * @type Object
     */
    C.dependencies_ = {};
    
    /**
     * The attached modules
     *
     * @property attached_
     * @type Object
     */
    C.attached_ = {};
    
    /**
     * The module loader instance
     *
     * @property loader_
     * @type Loader
     */
    C.loader_ = null;
    
    /**
     * The logger object
     *
     * @property logger_
     * @type Logger
     */
    C.logger_ = null;
    
    /* initialize */
    C.attach_(Condotti['CORE-MODULES']);
    
    C.logger_ = C.logging.getObjectLogger(C);
    C.loader_ = new C.loaders.Loader(C.config_.loader);
}

/********************************************************************
 *                                                                  *
 *                    CLASS STATIC MEMBERS                          *
 *                                                                  *
 ********************************************************************/

/**
 * Loaded module colletion inside the Condotti global
 *
 * @property loaded_
 * @type Object
 * @static
 */
Condotti.loaded_ = {};

/**
 * Add a module with the Condotti global.
 *
 * @method add
 * @static
 * @param {String} name the module name
 * @param {Function} fn entry point into the module which is used to bind module
 *                      to the Condotti instance
 * @param {String} version the version string
 * @param {Object} meta the optional config data for this module
 * @return {Function} the Condotti global.
 */
Condotti.add = function (name, fn, version, meta) {
    
    if (name in Condotti.loaded_) {
        if (Condotti.DuplicatedModuleError) {
            throw new Condotti.DuplicatedModuleError(name);
        } else {
            throw new Error('Duplication of the module ' + name + 
                            ' has been detected.');
        }
    }
    
    meta = meta || {};
    
    // TODO: 1. add multi version support
    //       2. add JAVA-like package namespace support
    //       3. generate module name when loading, instead of hard-coded in the
    //          source, which is inconvenient if the source file has to be moved
    //          to another directory
    Condotti.loaded_[name] = {
        name: name,
        fn: fn,
        version: version,
        meta: meta
    };
    
    return Condotti;
};

/********************************************************************
 *                                                                  *
 *                      INSTANCE MEMBERS                            *
 *                                                                  *
 ********************************************************************/

/**
 * Add a namespace object onto the calling Condotti instance. Dots in the input
 * string cause `namespace` to create nested objects for each token. If any part
 * of the requested namespace already exists, the current object will be left in
 * place.
 *
 * @method namespace
 * @param {String} namespace the namespace to be created
 * @param {Boolean} create whether create the required obejct that does not
 *                         exist
 * @return {Object} the object found or created
 */
Condotti.prototype.namespace = function (namespace, create) {
    var C = this,
        tokens = null,
        current = this,
        index = 0,
        length = 0,
        token = null;
    
    if (!namespace || !namespace.length) {
        C.debug('Namespace is not a string or is empty.');
        return C;
    }
    
    if (undefined === create) {
        create = true;
    }
    
    tokens = namespace.split('.');
    length = tokens.length;
    
    for (index = 0; index < length; index += 1) {
        
        token = tokens[index];
        
        if (!create && !(token in current)) {
            throw new TypeError('Object is expected to be under namespace ' + 
                                tokens.slice(0, index + 1).join('.') + 
                                ', however it does not exist');
        }
        
        current[token] = current[token] || {};
        current = current[token];
    }
    
    return current;
};

/**
 * Configure the Condotti instance via merging the existing config object and
 * the passed in one.
 *
 * @method configure
 * @param {Object} config the new config to be applied
 * @return {Condotti} the Condotti instance
 */
Condotti.prototype.configure = function (config) {
    var C = this;
    C.lang.merge(C.config_, config);
    // TODO: update the Condotti instance after the configuration is changed?
    return C;
};


/**
 * Attach one or more modules to the Condotti instance. When this is executed,
 * the requirements are analyzed, and one of the several things can happen:
 *
 *   * All requirements are available --
 *   * Modules are missing, the Get utility is not available --
 *   * Modules are missing, the Loader is not available --
 *   * Modules are missing, the Loader is available --
 * 
 * @method use
 * @param {String|Array} modules* 1-n module names to be attached to the
 *                                Condotti instance
 * @param {Function} callback callback function to be executed when the instance
 *                            has the required functionality. 
 * @return {Condotti} the Condotti instance
 */
Condotti.prototype.use = function () {
    
    var params = Array.prototype.slice.call(arguments, 0), // Convert
                                                           // `arguments` to
                                                           // array
        callback = null,
        C = this,
        requires = [],
        stack = [],
        next = null,
        done = null,
        filter = null;
    
    if (!params.length) {
        C.warn('No module is specified to be used.');
        return;
    }
    
    callback = params[params.length - 1];
    if (C.lang.reflect.isFunction(callback)) {
        params.pop(); // remove the callback from module list
        callback = C.lang.async(callback);
    } else {
        C.debug('Callback function is not specified, empty one is used.');
        callback = function () {}; // in order to be called anyway
    }
    
    if (Array.isArray(params[0])) {
        params = params[0]; // only two scenarios are supported: 
                            // use([m1, m2], cb) or use(m1, m2, cb)
        C.debug('The first parameter is found to be an array of ' + 
                'module names: ' + C.lang.reflect.inspect(params));
    }
    
    if (!params.length) {
        C.warn('The module to be used is specified, but the callback function' + 
               ' is found.');
        callback(null, C);
        return;
    }
    // TODO: Wildcard can not be used in the module names to be used, because
    //       in some circumstance, such as web, modules under specified path
    //       can not be browsed/iterated      
    stack.push(params);
    
    done = function (error) {
        var dependencies = [];
        
        if (error) {
            C.debug('Modules ' + C.lang.reflect.inspect(requires) + 
                    ' are failed to be loaded by the loader. Error: ' +
                    C.lang.reflect.inspect(error));
            callback(error, C);
            return;
        }
        
        C.debug('Modules ' + C.lang.reflect.inspect(requires) + 
                ' are loaded successfully. Dependencies are gonna be ' +
                'collected.');
        
        //
        // Now that the required modules have been loaded successfully, it's
        // time to load their dependencies.
        requires.forEach(function (name, index) {
            var meta = null;
            if (!(name in C.loaded_)) {
                C.debug('Module ' + name + ' is supposed to be loaded ' +
                        'successfully in this round, but it isn\'t.');
                throw new C.errors.ModuleNotLoadedError(name);
            }
            
            meta = C.loaded_[name].meta;
            if (meta.requires && Array.isArray(meta.requires) &&
                meta.requires.length) { // TODO: throw error if meta.requires
                                        // is not an array?
                dependencies = dependencies.concat(meta.requires);
            }
        });
        
        if (!dependencies.length) {
            C.debug('No dependency is found for the current loaded modules, ' +
                    'start next round of loading');
        } else {
            C.debug('Raw dependencies of the current loaded modules ' + 
                    'are gonna be loaded next time: ' + 
                    C.lang.reflect.inspect(dependencies));
            stack.push(dependencies);
        }
        C.lang.nextTick(next);
    };
    
    filter = function (modules) {
        var unique = {},
            result = [];
            
        modules.forEach(function (module, index) {
            if ((module in C.loaded_) || (module in unique)) {
                return true;
            }
            unique[module] = true;
            result.push(module);
        });
        
        return result;
    };
    
    next = function () {
        var filtered = null;
        
        requires = stack.shift();
        if (!requires) {
            C.debug('Modules ' + C.lang.reflect.inspect(params) + 
                    ' and their dependencies have been successfully loaded.');
            
            try {
                C.attach_(params); // attach the initial required modules
                callback(null, C);
            } catch (e) {
                callback(e, C);
            }
            return;
        }
        
        if (!requires.length) {
            C.warn('No module is expected to be loaded in this round');
            C.lang.nextTick(next);
            return;
        }
        
        C.debug('Modules ' + C.lang.reflect.inspect(requires) + 
                ' are expected to be loaded during this round');
        
        filtered = filter(requires);
        if (!filtered.length) {
            C.debug('However, all of them have already been loaded before, ' +
                    'nothing need to be done in this round');
            C.lang.nextTick(next);
            return;
        }
        
        requires = filtered;
        C.debug('But only modules ' + C.lang.reflect.inspect(requires) +
                ' need to be loaded via the loader after filtering');
        C.lang.nextTick(function () {
            // load all the required modules
            C.loader_.require(requires, done);
        });
    };
    
    C.lang.nextTick(next);
    
    return C;
};

/**
 * Calculate the dependencies of a specified module, and save the dependency
 * list into the dependencies_ object. Note
 * that this dependencies calculated contains the full list of the modules
 * expected to be loaded before the required one, not only the one it
 * depends on directly, but also the modules its dependency depends.
 *
 * @method calculate_
 * @param {String} name the module name to be calculated
 */
Condotti.prototype.calculate_ = function (name) {
    var C = this,
        trace = {},
        unique = {},
        dependencies = [];
        
    /**
     * some day maybe we have to convert the recursive calls to 
     * iterative calls
     */
    (function (current) {
        var requires = null,
            index = 0,
            length = 0;
        
        C.debug('Calculating module ' + current + ' ...');
        
        if (!(current in C.loaded_)) {
            C.debug('Module to be attached [' + current + 
                    '] has not been loaded.');
            throw new C.errors.ModuleNotLoadedError(current);
        }
        
        if (current in unique) {
            C.debug('Module ' + current + ' has already been calculated.');
            return;
        }
        
        if (current in trace) {
            C.debug('Circular dependency on module ' + current + 
                    ' has been detected.');
            throw new C.errors.CircularDependencyError(name, current);
        }
        
        trace[current] = true;
            
        requires = C.loaded_[current].meta.requires || [];
        length = requires.length;
        if (0 === length) {
            C.debug('Module ' + current + ' does not depend on other modules');
        } else {
            C.debug('Dependencies of module ' + current + 
                    C.lang.reflect.inspect(requires) + 
                    ' are gonna be calculated.');
        
            for (index = 0; index < length; index += 1) {
                arguments.callee(requires[index]);
            }
        }
        
        
        C.debug('Module ' + current + ' has been successfully calculated.');
        delete trace[current];
        
        dependencies.push(current);
        unique[current] = true;
        
    })(name);
    
    if (dependencies.length) {
        C.debug('The dependencies of module ' + name + ' are: ' + 
                C.lang.reflect.inspect(dependencies));
    } else {
        C.debug('Module ' + name + ' does not depend on other modules');
    }
    
    C.dependencies_[name] = dependencies;
};

/**
 * Attach the required modules to the Condotti instance by executing the function
 * associated with each of the modules.
 *
 * @method attach_
 * @private
 * @param {Array} names the arrray of module names to be attached to the 
 *                        Condotti instances
 */
Condotti.prototype.attach_ = function (names) {
    var index = 0,
        length = names.length,
        name = null,
        C = this,
        fn = null,
        stack = [];
    
    // set a dummy debug function when attaching modules before the logging
    // module is successfully attached
    C.debug = C.debug || function () {};
    C.lang = C.lang || { reflect: { inspect: function () {
        return ''; // dummy inspect function for temparary usage 
    }} };
    
    for (index = 0; index < length; index += 1) {
        name = names[index];
        if (name in C.attached_) {
            C.debug('Module ' + name + ' has already been attached.');
            continue;
        }
        
        if (!(name in C.dependencies_)) {
            C.debug('Module ' + name + ' has not been calculated yet.');
            C.calculate_(name);
        }
        
        stack = stack.concat(C.dependencies_[name]);
    }
    
    C.debug('Modules to be attached before filter: ' + 
            C.lang.reflect.inspect(stack));
    length = stack.length;
    for (index = 0; index < length; index += 1) {
        name = stack[index];
        if (name in C.attached_) {
            C.debug('Module ' + name + ' has already been attached.');
            continue;
        }
        
        fn = C.loaded_[name].fn;
        try {
            C.debug(
                'Attaching module ' + name + 
                (C.config_[name] ? 
                 ' with configure: ' + C.lang.reflect.inspect(C.config_[name]) : 
                 ''
                )
            );
            //     (this, C, config for the module)
            fn.call(C,    C, C.config_[name]); // make `this` === C in order to
                                               // load some external modules, 
                                               // such as the async module into 
                                               // C
            C.attached_[name] = true;
            C.debug('Module ' + name + ' is attached successfully.');
        } catch (e) {
            C.debug('Module ' + name + ' is failed to be attached. Error: ' + 
                    C.lang.reflect.inspect(e));
            throw new C.errors.ModuleAttachError(C.loaded_[name], e);
        }
    }
    
    return C;
};

