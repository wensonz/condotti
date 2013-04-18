/**
 * The core module for node.js version of Condotti framework.
 *
 * @module condotti.server.core
 */
Condotti.add('condotti.server.core', function (C) {
    
    var inspect = null;
    /**
     * Other node.js natvie modules with the help of module 'natives'
     *
     * @property natives
     * @type Object
     */
    C.natives = require('natives');
 
    /**
     * The process object
     *
     * @property process
     * @type Object
     * @default process
     */
    C.process = process;
    
    /**
     * The node.js version of C.lang.nextTick method
     *
     * @method nextTick
     * @param {Function} callback the callback function to be invoked on next tick
     */
    C.lang.nextTick = C.process.nextTick;
    
    /**
     * The node.js require
     *
     * @method require
     * @param {String} module the module name to be required
     */
    C.require = require;
    
    inspect = C.lang.reflect.inspect;
    /**
     * The node.js version of C.lang.inspect method
     *
     * @method inspect
     * @param {Object} object the object to be inspected into
     * @return {String} the string value of the passed in object
     */
    C.lang.reflect.inspect = function (object) {

        if (C.lang.reflect.getObjectType(object) === Buffer) {
            return '<Buffer: ' + object.toString('hex') + '>';
        }
        return inspect.call(C.lang.reflect, object);
    };
    
}, '0.0.1', { requires: ['condotti.lang', 'condotti.reflect'] });


// export as node.js module
module.exports.Condotti = Condotti;
