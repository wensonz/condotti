/**
 * This module contains the utilities for obtaining reflective information about
 * classes and objects.
 *
 * @module condotti.reflect
 */
Condotti.add('condotti.reflect', function (C) {

    /**
     * This Reflect class is designed to provide the utilities for obtaining
     * the reflective information about classes and objects.
     *
     * @class Reflect
     * @constructor
     */
    function Reflect () {
        //
    }
    
    /**
     * Return if the passed in object is a function
     *
     * @method isFunction
     * @param {Object} object the object to be tested
     * @return {Boolean} true if the object is a function, otherwise false
     */
    Reflect.prototype.isFunction = function (object) {
        return object && object.constructor === Function;
    };
    
    /**
     * Return if the passed in param is a plain object that is created via "{}"
     * or "new Object". Forked from jquery.
     *
     * @method isPlainObject
     * @param {Object} object the object to be tested
     * @return {Boolean} true if the object is a plain object, otherwise false
     *                   is returned.
     */
    Reflect.prototype.isPlainObject = function (object) {
        var key = null;
        
        if (!object || this.getObjectType(object) !== Object) {
            return false;
        }
        
        try {
            if (object.constructor && 
                !Object.prototype.hasOwnProperty.call(object, 'constructor') &&
                !Object.prototype.hasOwnProperty.call(
                    object.constructor.prototype, 'isPrototypeOf'
                )) {
                return false;
            }
        } catch (e) {
            return false;
        }
        
        for (key in object) {}
        
        return key === undefined || 
               Object.prototype.hasOwnProperty.call(object, key);
    };
    
    /**
     * Return if the first passed in class object is direct or indirect subclass
     * of the second one.
     *
     * @method isSubClass
     * @param {Function} descendent the descendent class constructor to be tested
     * @param {Function} ancestor the ancestor class constructor
     * @return {Boolean} true if the descendent is sub class of the ancestor,
     *                   otherwise false is returned
     */
    Reflect.prototype.isSubClass = function (descendent, ancestor) {
        var c = descendent;
        
        if (Object === ancestor) { // everything is an object
            return true;
        }
        
        while (c && c !== ancestor) {
            c = (this.isFunction(c.super_) ? c.super_ : null);
        }
        
        return !!c;
    };
    
    /**
     * Inspect the passed in object into its string form
     *
     * @method inspect
     * @param {Object} object the object to be inspected into
     * @return {String} the string form of the passed in object
     */
    Reflect.prototype.inspect = function(object) {
        // TODO: implement the basic version
        var type = this.getObjectType(object),
            name = this.getFunctionName(type),
            data = null,
            self = this,
            key = null,
            value = null,
            length = 0;
            
        if (name in { 'Number': 1, 'Boolean': 1, 'Date': 1 }) {
            return '<' + name + ': ' + object.toString() + '>';
        } else if ('String' === name) {
            return '<' + name + ': \'' + object + '\'>';
        } else if (undefined === object) {
            return '<Undefined>';
        } else if (null === object) {
            return '<Object: null>';
        } else if (object instanceof Error) {
            return '<' + object.name + ': \'' + object.message + '\'>';
        } else if (Function === type) {
            return '<Function: ' + this.getFunctionName(object) + '>';
        } else if (Array === type) {
            if (object.length > 0) {
                data = object.map(function (item) { 
                    return self.inspect(item);
                }).join(', ');
                
                return '<Array of ' + 
                       this.getFunctionName(this.getObjectType(object[0])) +
                       ': [' + data + '] >';
            }
            return '<Array: []>';
            
        } else if (Object === type) {
            data = data || [];
            
            for (key in object) {
                if (object.hasOwnProperty(key)) {
                    length += 1;
                    value = object[key];
                    data.push('\'' + key + '\': ' + this.inspect(value));
                }
            }
            
            return '<Object: {' + data.join(', ') + '} >';
        }
        
        // fall default
        return '<' + this.getFunctionName(this.getObjectType(object)) + ': ' + 
               object.toString() + '>';
    };
    
    /**
     * Return the function name. If it is an anonymous function, 'anonymous'
     * is returned.
     *
     * @method getFunctionName
     * @param {Function} func the function whose name is to be returned
     * @return {String} name of the function. If the name could not be found, 
     *                  'anonymous' is returned.
     */
    Reflect.prototype.getFunctionName = function (func) {
        if (undefined === func) {
            return 'Undefined';
        } else if (null === func) {
            return 'Null';
        }
        return func.name || 
               func.toString().match(/function\s*([^(]*)\s*\([^)]*\)/)[1] ||
               'anonymous';
    };
    
    /**
     * Return the type of the passed in object. Usually the result is the 
     * function which constructs it. 'undefined' and 'null' are both supported.
     *
     * @method getObjectType
     * @param {Object} object the object whose type will be returned
     * @return {Function} the type of the object. If the passed in object is
     *                    undefined, then undefined is returned, or if the 
     *                    object is null, then Object is returned.
     */
    Reflect.prototype.getObjectType = function (object) {
        if (undefined === object) {
            return undefined;
        } else if (null === object) {
            return Object;
        }
        
        return object.constructor;
    };
    
    C.lang.reflect = new Reflect();

}, '0.0.1', { requires: ['condotti.lang'] });
