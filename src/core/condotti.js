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
     * Config object for this Condotti instance
     *
     * @property config_
     * @type Object
     */
    C.config_ = config || {};
    
    /**
     * The calcualted module dependencies
     *
     * @property dependencies_
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
    C.loader_ = new C.loader.Loader(C.config_.loader);
}

/********************************************************************
 *                                                                  *
 *                    CLASS STATIC MEMBERS                          *
 *                                                                  *
 ********************************************************************/

/**
 * Loaded module colletion inside the Condotti global
 *
 * @property modules
 * @type Object
 * @static
 */
Condotti.modules = {};

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
Condotti.add = function add(name, fn, version, meta) {
    
    meta = meta || {};
    
    // TODO: 1. add multi version support
    //       2. add JAVA-like package namespace support
    //       3. generate module name when loading, instead of hard-coded in the
    //          source, which is inconvenient if the source file has to be moved
    //          to another directory
    Condotti.modules[name] = {
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
Condotti.prototype.namespace = function namespace(namespace, create) {
    var C = this,
        tokens = null,
        current = this,
        index = 0,
        length = 0,
        token = null;
    
    if (!namespace || !namespace.length) {
        return C;
    }
    
    // missing object is to be created by default
    create = (1 === arguments.length) ? true : !!create;
    
    tokens = namespace.split('.');
    length = tokens.length;
    current = this;
    for (index = 0; index < length; index += 1) {
        
        token = tokens[index];
        if (!(create || token in current)) {
            throw new TypeError('Object of namespace ' + 
                                tokens.slice(0, index + 1).join('.') + 
                                ' can not be found');
        }
        
        current[token] = current[token] || {};
        current = current[token];
    }
    
    return current;
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
Condotti.prototype.use = function use() {
    
    var params = Array.prototype.slice.call(arguments, 0), // Convert
                                                           // `arguments` to
                                                           // array
        callback = null,
        names = null,
        C = this;
    
    
    if (!params.length) return;
    
    callback = function () {}; // by default a dummy function to call
    if (C.lang.isFunction(params[params.length - 1])) {
        callback = C.lang.async(params.pop()); // remove the callback from 
                                               // module list
    }
    
    if (!params.length) {
        callback(null, C);
        return;
    }
    
    if (Array.isArray(params[0])) {
        params = params[0]; // only two scenarios are supported: 
                            // use([m1, m2], cb) or use(m1, m2, cb)
    }
    
    names = params;
    params = C.filter_(params, Condotti.modules);
    if (!params.length) {
        C.attach_(names); 
        callback(null, C);
        return;
    }
    
    C.loader_.require(params, function next(error) {
        var dependencies = [],
            index = 0,
            length = 0;
        
        if (error) {
            callback(error, C);
            return;
        }
        
        length = params.length;
        for (index = 0; index < length; ++ index) {
            dependencies = dependencies.concat(
                Condotti.modules[params[index]].meta.requires || []
            );
        }
        
        params = C.filter_(dependencies, Condotti.modules);
        if (!params.length) {
            C.attach_(names);
            callback(null, C);
            return;
        }
        
        C.lang.nextTick(function () {
            C.loader_.require(params, next);
        });
    });
    
    return C;
};

/**
 * Return the unique names of the modules that have not been loaded yet.
 * 
 * @method filter_
 * @param {Array} names the list of names to be filtered
 * @param {Object} exceptions the collection of names should be excluded during
 *                            this filtering
 * @return {Array} the filtered names
 */
Condotti.prototype.filter_ = function filter_(names, exceptions) {
    var C = this,
        unique = {},
        result = [],
        index = 0,
        length = 0,
        name = null;
    
    length = names.length;
    for (index = 0; index < length; ++ index) {
        name = names[index];
        if ((name in exceptions) || (name in unique)) continue;
        unique[name] = index;
        result.push(name);
    }
    
    return result;
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
Condotti.prototype.calculate_ = function calculate_(name) {
    var C = this,
        colors = {},
        BLACK = 0,
        GREY = 1,
        stack = [],
        result = [],
        index = 0,
        requires = null;
        require = null;
    
    if (name in C.dependencies_) return C.dependencies_[name];
    
    stack.unshift(name);
    while (stack.length) {
        current = stack[0];
        
        if (current in colors) {
            stack.shift();
            if (BLACK === colors[current]) continue; // module current has been 
                                                     // processed somewhere else
            
            colors[current] = BLACK;
            C.dependencies_[current] = JSON.parse(JSON.stringify(result));
            result.push(current);
            continue;
        }
        
        colors[current] = GREY;
        requires = Condotti.modules[current].meta.requires || [];
        for (index = requires.length - 1; index >= 0; -- index) {
            require = requires[index];
            if (colors[require] === GREY)
                throw new C.errors.CircularDependencyError(name, require);
            else if (colors[require] === BLACK)
                continue;
            
            stack.unshift(require);
        }
    }
    
    C.dependencies_[name] = result;
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
Condotti.prototype.attach_ = function attach_(names) {
    var index = 0,
        length = 0,
        name = null,
        C = this,
        fn = null,
        stack = [];
    
    for (index = names.length - 1; index >= 0; -- index) {
        name = names[index];
        if (name in C.attached_) continue;
        
        if (!(name in C.dependencies_)) C.calculate_(name);
        stack = stack.concat(C.dependencies_[name]);
    }
    
    length = stack.length;
    for (index = 0; index < length; ++ index) {
        name = stack[index];
        if (name in C.attached_) continue;
        
        fn = Condotti.modules[name].fn;
        try {
            //     (this, C, config for the module)
            fn.call(C,    C, C.config_[name]); // make `this` === C in order to
                                               // load some external modules, 
                                               // such as the async module into 
                                               // C
            C.attached_[name] = true;
        } catch (e) {
            throw new C.errors.ModuleAttachError(Condotti.modules[name], e);
        }
    }
    
    return C;
};

