/**
 * This module contains the server-side implementation of the Condotti module 
 * loader class based on node.js, which is inspired by the node.js module loader
 * of YUI 3. The configuration settings are most likely the same as the ones for
 * the browser-side module loader.
 *
 * @module condotti.server.loader
 */
Condotti.add('condotti.server.loader', function (C) {
    //
    /**
     * This Loader class is designed to load modules for Condotti framework
     * under the node.js environment. It follows the same strategy as the one of
     * the web/browser version of Condotti module loader when searching for the
     * location of the module files, then load them via the help of the built-in
     * "vm.runInThisContext".
     * 
     * @class Loader
     * @constructor
     * @param {Object} config the config object for this node.js module loader
     */
    function Loader (config) {

        /**
         * The config object for this loader instance. TODO: add default options
         * into the default config object, such as baseUrl: './', etc.
         *
         * @property config_
         * @type Object
         * @default {}
         */
        this.config_ = config || {};

        /**
         * The root path to use for all module lookups. This url can be the
         * following 2 modes:
         *
         * 1. relative path: 'path/module'
         *    When specified in relative mode, this url is supposed to be 
         *    relative to the current working directory, and is prepended to the
         *    module names to form full paths where the required modules located.
         *
         * 2. absolute path: '/path/module'
         *    The absolute path in the file system where modules are expected to
         *    be located
         *
         * Note that there may be another mode in the future, remote, which is 
         * a HTTP url indicating that the required modules can be fetched on the 
         * remote HTTP server.
         *
         * @property baseUrl_
         * @type String
         * @default './'
         */
        this.baseUrl_ = this.config_.baseUrl || './'; // This module is expected
                                                      // to be loaded as one of
                                                      // core modules of 
                                                      // Condotti framework by
                                                      // another node.js script,
                                                      // which means './' points 
                                                      // to the current working
                                                      // directory

        /**
         * The path mappings for module names that are not located directly
         * under the baseUrl. This paths are assumed to be relative to the
         * baseUrl, unless the settings start with a '/', or an URL protocol,
         * such as 'http://' in the future. Since the mapping could be for a
         * directory, the path used for a module name should NOT include the 
         * '.js' extension. This loader will take care of this case and
         * automatically add the extension when necessary. Note that when path
         * mappings are provided, modules are looked up under the mapped path
         * regardless of whether they could be found under the baseUrl.
         *
         * @property paths_
         * @type Object
         * @default {}
         */
        this.paths_ = this.config_.paths || {};
        
        /**
         * The searching tree based on the path mapping
         * 
         * @property tree_
         * @type Object
         * @deafult {}
         */
        this.tree_ = {};

        /**
         * The logger instance
         *
         * @property logger_
         * @type Logger
         */
        this.logger_ = C.logging.getObjectLogger(this);

        /* initialize */
        this.initialize_();
    }


    /**
     * Initialize this loader
     *
     * @method initialize_
     */
    Loader.prototype.initialize_ = function () {
        var name = null,
            path = null;
        
        if (this.baseUrl_.charAt(this.baseUrl_.length - 1) !== '/') {
            this.baseUrl_ += '/';
        }

        this.baseUrl_ = C.natives.path.resolve(C.natives.path.normalize(
            this.baseUrl_
        ));
        
        /* build the fxxk tree for searching */
        for (name in this.paths_) {
            
            path = this.paths_[name];
            if (path.charAt(0) !== '/') { // relative
                path = C.natives.path.resolve(this.baseUrl_, path);
            } else {
                path = C.natives.path.resolve(path);
            }
            
            C.namespace.call(this.tree_, name).__path__ = path;
        }
    };

    /**
     * Normalize the module name to full path to load
     *
     * @method normalize_
     * @param {String} name the name of the module to be normalized
     * @return {String} the normalized url for the module
     */
    Loader.prototype.normalize_ = function (name) {
        var tokens = null,
            token = null,
            index = 0,
            length = 0,
            node = null,
            candidate = null,
            url = this.baseUrl_;
            
        tokens = name.split('.');
        length = tokens.length;
        node = this.tree_;
        
        while (index < length) {
            token = tokens[index];
            
            if (!node[token]) {
                break;
            }
            
            node = node[token];
            index += 1;
            
            if (node.__path__) {
                candidate = {
                    index: index,
                    path: node.__path__
                };
            }
        }
        
        if (candidate) {
            url = C.natives.path.resolve(
                candidate.path, tokens.slice(candidate.index).join('/')
            );
        } else {
            url += tokens.join('/');
        }
        
        url += '.js';
        
        return C.natives.path.normalize(url);
    };
    
    /**
     * Re-configure this loader with the specified config object. Note that this
     * config object is to be merged into the original one, then the internal
     * data such as the baseUrl, the searching tree is to be re-initialized
     *
     * @method configure
     * @param {Object} config the config object for this loader
     */
    Loader.prototype.configure = function (config) {
        config = config || {};
        // TODO: check the type of config to be plain object
        C.lang.merge(this.config_, config);
        /* re-initailizing */
        this.baseUrl_ = this.config_.baseUrl || './';
        this.paths_ = this.config_.paths || {};
        this.tree_ = {};
        
        this.initialize_();
    };
    


    /**
     * Load and execute the required modules
     *
     * @method require
     * @param {Array} names the names of the modules required to be loaded
     * @param {Function} callback the callback function to be invoked after the
     *                            modules have been successfully loaded, or some
     *                            error occurs. The signature of the callback is
     *                            'function (error) {}'
     */
    Loader.prototype.require = function (names, callback) {
        var self = this,
            scripts = {},
            urls = {};
        
        // TODO: param validations
        C.async.forEach(names, function (name, next) {
            var url = self.normalize_(name);

            urls[name] = url;
            
            C.natives.fs.readFile(url, function (error, script) {
                if (error) {
                    self.logger_.debug('Reading module file ' + url + 
                                       ' failed. Error: ' + 
                                       C.lang.reflect.inspect(error));
                    next(error);
                    return;
                }

                if (!scripts[name]) {
                    scripts[name] = script;
                }

                next();
            });

        }, function (error) {
            if (error) {
                callback(error);
                return;
            }
            
            try {
                names.forEach(function (name) {
                    self.execute_(name, urls[name], scripts[name]);
                });    
            } catch (e) {
                callback(e);
                return;
            }
            callback();
        });
    };

    /**
     * Rad the module source and execute it in the current context
     *
     * @method execute_
     * @param {String} name the name of the module to be executed
     * @param {String} url the absolute path to the module file on the file 
     *                     system
     * @param {String} data the source of the module to be executed
     */
    Loader.prototype.execute_ = function (name, url, data) {
        var directory = '',
            file = '',
            source = null,
            script = null,
            backup = null,
            fn = null;

        // TODO: add url check for remote modules in the future
        directory = C.natives.path.dirname(url);
        file = url;

        source = ';(function (Condotti) {' +
                 '    var __dirname = \'' + directory + '\', ' +
                 '        __filename = \'' + file + '\', ' +
                 '        require = function (module) {' +
                 '            var path = Condotti.require(\'path\'); ' +
                 '            module = path.resolve(__dirname, module); ' +
                 '            return Condotti.require(module);' +
                 '        };' +
                 data +
                 '    ;' +
                 '    return Condotti;' +
                 '})';
        try {
            script = C.natives.vm.createScript(source, url);
            fn = script.runInThisContext();
            backup = Condotti.require;
            Condotti.require = C.require;
            Condotti = fn(Condotti);
            Condotti.require = backup;
        } catch (e) {
            this.logger_.debug('Executing source of module ' + name + 
                               ' failed. Error: ' + C.lang.reflect.inspect(e));
            throw e;
        }
    };

    C.namespace('loaders').Loader = Loader;

}, '0.0.1', { requires: ['condotti.lang', 'condotti.reflect', 
                         'condotti.errors', 'condotti.async', 
                         'condotti.server.core'] });
