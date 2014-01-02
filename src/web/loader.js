/**
 * This module contains the implementation of the module loader for web/browser,
 * which internally use 'jQuery' to fetch and execute modules on remote HTTP
 * servers via AJAX.
 *
 * @module condotti.loader
 */
Condotti.add('condotti.web.loader', function (C) {
    
    /**
     * This Loader class is designed to load modules for Condotti framework
     * in the web/browser environment. Its internal leverage 'jQuery' to
     * fetch and execute modules resist on remote HTTP servers.
     *
     * @class Loader
     * @constructor
     * @param {Object} config the config object for this web loader
     */
    function Loader (config) {
        
        /**
         * The config object for this loader instance. TODO: add default options
         * into the default config object, such as baseUrl: '/', etc.
         *
         * @property config_
         * @type Object
         * @default {}
         */
        this.config_ = config || {};
        
        /**
         * The root path to use for all module lookups. This url can be 
         * the following 3 modes:
         *
         * 1. relative path: 'assets/js'
         *    When specified in relative mode, this url is supposed to be
         *    relative to the path of the HTML page which loads the Condotti
         *    framework, and is prepended before the module names to generate
         *    the actual urls used by jQuery to fetch those modules.
         *
         * 2. absolute path: '/assets/js'
         *    The absolute path based on the document root of the HTTP server
         *
         * 3. HTTP Url from another domain: 'http://another/domain/'
         *
         *
         * @property baseUrl_
         * @type String
         * @default './'
         */
        this.baseUrl_ = this.config_.baseUrl || './'; // This module is expected
                                                      // to be loaded as one of
                                                      // core modules of 
                                                      // Condotti framework into
                                                      // a HTML page, it
                                                      // means './' point to the
                                                      // directory where the
                                                      // page locates
        
        /**
         * The path mappings for module names that are not located directly
         * under the baseUrl. This paths are assumed to be relative to the
         * baseUrl, unless the settings start with a '/' or an URL protocol
         * , such as 'http://'. Since the mapping could be for a directory, for
         * example, 'jquery': 'jquery/1.8.0/', the path used for a module name
         * should NOT include the '.js' extension. The loader will take care of
         * this case and automatically add the extension when necessary. Note
         * that the difference between this implementation and RequireJS is that
         * the path mappings are supposed to be used when the modules required
         * can not be found directly under the baseUrl in RequireJS, while in
         * this implementation the path mappings are used as long as the module
         * name required can be found in the mappings, no matter if there is
         * also a module located under the baseUrl with the same name. Warn: the
         * '.' and '..' are not supported now.
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
        
        /* buid the fxxk tree for searching */
        for (name in this.paths_) {
            
            path = this.paths_[name];
            if (path.charAt(0) !== '/') { // relative
                path = this.baseUrl_ + path; // TODO: normalize '.', '..' and 
                                             //       '//' in path and baseUrl_
            }
            
            C.namespace.call(this.tree_, name).__path__ = path;
        }
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
     * Load and execute the required modules with the help of 'jQuery'
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
            scripts = {};
        
        // TODO: param validations
        C.async.forEach(names, function (name, next) {
            var url = self.normalize_(name);
            C.$.get(url, function (script) {
                scripts[name] = script;
                next();
            }, 'html')
            .error(function (jqXHR, status, error) {
                self.logger_.debug('Fetching module ' + name + ' from ' + url +
                                   ' failed. Error: ' + error + ', status: ' +
                                   jqXHR.status);
                
                next(new C.errors.ModuleRequireFailedError(
                    name, new Error(error)
                ));
            });
        
        }, function (error) {
            if (error) {
                callback(error);
                return;
            }
            
            names.forEach(function (name) {
                eval(scripts[name]);
            });
            
            callback();
        });
    };
    
    /**
     * Normalize the module name to url to fetch
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
            url = candidate.path + '/' + tokens.slice(candidate.index).join('/');
        } else {
            url += tokens.join('/');
        }
        
        url += '.js';
        
        return url;
    };
    
    C.namespace('loader').Loader = Loader;
    
}, '0.0.1', { requires: ['condotti.lang','condotti.errors', 'condotti.async', 
                         'condotti.web.core']});
