/**
 * The errors module provides a namespace, which contains all the existing
 * subtypes of Error, and also provides an utlity function to create
 * customized sub-types of Error dynamically.
 *
 * @module condotti.errors
 */
Condotti.add('condotti.errors', function (C) {
    /**
     * `errors` namespace is expected to contain all the customized subtype of 
     * Error.
     *
     * @namespace errors
     * @type Object
     */
    var E = C.errors || (C.errors = {});
    // TODO: using the global Error directly? or add it to the C.lang?
    
    /**
     * A nested error is a kind of error that contains another error in order
     * to illustrate the error context, such as what's going on, and the real 
     * error.
     *
     * @class NestedError
     * @extends Error
     * @constructor
     * @param {String} message the message associated with the error
     * @param {Error} error the error caught and to be nested
     */
    function NestedError (message, error) {
        if (message instanceof Error) {
            error = message;
            message = null;
        }
        
        this.super();
        /** 
         * the 'message' field MUST be set manually since the Error class is 
         * so special that a call to it as a function, not matter it's called
         * in the form of Error(), Error.call or Error.apply, the result is
         * a new created Error instance, which means it can not be initialized
         * as a parent class instance, like this.super(message)
         */
        this.message = message;
        // Keep the same behaviour with Error
        this.name = 'NestedError';
        this.nested = error;
    };
    C.lang.inherit(NestedError, Error);
    
    /**
     * Customized `toString` method. If the message is specified during 
     * initialization, nested.toString() will be returned.
     * 
     * @method toString
     * @return {String} the description of the error.
     */
    NestedError.prototype.toString = function () {
        if (!this.message) {
            return this.nested ? this.nested.toString() : 
                                 'Empty nested error is found.';
        } else {
            return this.message + ' Reason: ' + 
                   this.nested ? this.nested.toString() : 
                                 'Empty nested error is found.';
        }
    };
    E.NestedError = NestedError;
    
    /**
     * This kind of errors will be thrown when something goes wrong during
     * attaching required module onto the Condotti instance.
     *
     * @class ModuleAttachError
     * @extends NestedError
     * @constructor
     * @param {Object} module the module to be attached
     * @param {Error} error the error caught during attaching module 
     */
    function ModuleAttachError (module, error) {
        var message = 'Attaching module ' + module.name + ' failed.';
        
        this.super(message, error);
        // Keep the same behaviour with Error
        this.name = 'ModuleAttachError';
        this.module = module;
    };
    C.lang.inherit(ModuleAttachError, NestedError);
    E.ModuleAttachError = ModuleAttachError;
    
    /**
     * Errors to be thrown when circular dependency is found during attaching
     * modules to Condotti instance.
     *
     * @class CircularDependencyError
     * @extends Error
     * @constructor
     */
    function CircularDependencyError (module, dependency) {
        this.super();
        // Keep the same behaviour with Error
        this.name = 'CircularDependencyError';
        this.module = module;
        this.dependency = dependency;
    };
    C.lang.inherit(CircularDependencyError, Error);
    
    /**
     * Customized `toString` method.
     *
     * @method toString
     * @return {String} the description of the error
     */
    CircularDependencyError.prototype.toString = function () {
        return 'Circular dependency on module ' + this.dependency + 
               ' has been detected when calculating for module ' +
               this.module;
    };
    
    E.CircularDependencyError = CircularDependencyError;
    
    /**
     * Errors to be thrown when it's found that the required module has not 
     * been loaded.
     *
     * @class ModuleNotLoadedError
     * @extends Error
     * @constructor
     * @param {String} name the name of the required module
     */
    function ModuleNotLoadedError (module) {
        this.super();
        // Keep the same behaviour with Error
        this.name = 'ModuleNotLoadedError';
        this.module = module;
    };
    C.lang.inherit(ModuleNotLoadedError, Error);
    
    /**
     * Customized `toString` method.
     *
     * @method toString
     * @return {String} the description of the error
     */
    ModuleNotLoadedError.prototype.toString = function () {
        return 'Module ' + this.module + ' has not been loaded yet.';
    };
    E.ModuleNotLoadedError = ModuleNotLoadedError;
    
    /**
     * Errors to be thrown when duplicated modules are found.
     *
     * @class DuplicatedModuleError
     * @extends Error
     * @constructor
     * @param {String} module the duplicated module detected
     */
    function DuplicatedModuleError (module) {
        this.super();
        // Keep the same behaviour with Error
        this.name = 'DuplicatedModuleError';
        this.module = module;
    };
    C.lang.inherit(DuplicatedModuleError, Error);
    
    DuplicatedModuleError.prototype.toString = function () {
        return 'Duplication of the module ' + this.module.name + 
               ' has been detected.';
    };
    E.DuplicatedModuleError = DuplicatedModuleError;
    if (!C.constructor.DuplicatedModuleError) { // add DuplicatedModuleError
                                                // to Condotti global object 
        C.constructor.DuplicatedModuleError = DuplicatedModuleError;
    }
    
    /**
     * Errors thrown when module can not be found
     *
     * @class ModuleNotFoundError
     * @extends Error
     * @constructor
     * @param {String} module the name of the module that can not be found
     * @param {Array} paths the searching paths for module lookup
     */
    function ModuleNotFoundError (module, paths) {
        this.super();
        // Keep the same behaviour with Error
        this.name = 'ModuleNotFoundError';
        this.module = module;
        this.paths = paths;
    };
    C.lang.inherit(ModuleNotFoundError, Error);
    
    ModuleNotFoundError.prototype.toString = function () {
        return 'Required module ' + this.module + ' can not be found under ' +
               'the paths: ' + this.paths.toString();
    };
    E.ModuleNotFoundError = ModuleNotFoundError;
    
    /**
     * Errors thrown when requiring module failed
     *
     * @class ModuleRequireError
     * @extends NestedError
     * @constructor
     * @param {Object} module the module being required
     * @param {Error} error the error caught during requiring
     */
    function ModuleRequireError (module, error) {
        var message = 'Requiring module ' + module + ' failed. Error: ' + 
                      error.toString();
        this.super(message, error);
        // Keep the same behaviour with Error
        this.name = 'ModuleRequireError';
        this.module = module;
    };
    C.lang.inherit(ModuleRequireError, NestedError);
    E.ModuleRequireError = ModuleRequireError;
    
    /**
     * Errors thrown when the required functionality has not been implemented.
     * Normally this scenario happens when a placeholder method/class has not 
     * been replaced by providers.
     * 
     * @class NotImplementedError
     * @extends Error
     * @constructor
     * @param {String} message the message to be passed
     */
    function NotImplementedError (message) {
        this.super();
        this.message = message;
        // Keep the same behaviour with Error
        this.name = 'NotImplementedError';
    };
    C.lang.inherit(NotImplementedError, Error);
    E.NotImplementedError = NotImplementedError;
    
    /**
     * Errors thrown when the params passed-in are not valid. Normally this
     * kind of error occurs when the params are less or more than expected,
     * wrong positioned or even empty.
     *
     * @class InvalidArgumentError
     * @constructor
     * @param {String} message the error message
     */
    function InvalidArgumentError(message) {
        this.super();
        this.message = message;
        this.name = 'InvalidArgumentError';
    }
    C.lang.inherit(InvalidArgumentError, Error);
    E.InvalidArgumentError = InvalidArgumentError;
    
}, '0.0.1', { requires: ['condotti.lang'] });
