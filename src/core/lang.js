/**
 * Condotti lang module provides the extra utilities to extend the javascript
 * language's ability.
 *
 * @module condotti.lang
 */
Condotti.add('condotti.lang', function (C) {
    
    var L = C.namespace('lang');
    
    /**
     * Inherit the prototype methods from one constructor into another.
     * The `prototype` of the constructor will be set to a new object created
     * from parent constructor.
     * As an additional convenience, parent constructor will be accessible 
     * through the constructor.super_
     *
     * @method inherit
     * @param {Function} child the child constructor to inherit to
     * @param {Function} parent the parent constructor to inherit from
     */
    L.inherit = function (child, parent) {
        /**
         * This helper function is used to invoke the constructor of the parent
         * class when initializing an instance of the child class. This method
         * is added to the prototype of the child class.
         *
         * @method super_
         */
        var super_ = function () {
            var c = this.constructor;
            /**
             * Iterate the super chain until the current caller is found as a
             * constructor in the chain.
             * TODO: handle the case that "caller" is not implemented.
             */
            while (c && (c !== arguments.callee.caller)) {
                c = c.super_;
            }
            /* apply the constructor to current instance */
            if (c && c.super_) {
                c.super_.apply(this, arguments);
            }
        };
        
        child.super_ = parent;
        child.prototype = Object.create(parent.prototype, {
            constructor: {
                value: child,
                enumerable: false,
                writable: true,
                configurable: true
            },
            super: {
                value: super_,
                enumerable: false,
                writable: false,
                configurable: true
            }
        });
    };
    
    /**
     * Merge the list of objects starting from 2nd to the 1st one.
     *
     * @method merge
     * @param {Object} target the target object to merge to
     * @param {Object} source the source object to merge
     */
    L.merge = function (target, source) {
        var key = null,
            value = null,
            stack = [];
        
        if (overwritten === undefined) {
            overwritten = true; // overwritten by default
        }
        
        stack.push(target, source);
        
        while (stack.length) {
            target = stack.shift();
            source = stack.shift();
            
            for (key in source) {
                if (!source.hasOwnProperty(key)) continue;
                
                value = source[key];
                if (!(target.hasOwnProperty(key) && 
                      C.lang.isPlainObject(value) &&
                      C.lang.isPlainObject(target[key]))) {
                    
                    target[key] = value;
                    continue;
                }
                
                
                stack.push(target[key], value);
            }
        }
    };
    
    /**
     * Execute the callback function on the next tick
     *
     * @method nextTick
     * @param {Function} callback the callback function to be invoked on next tick
     */
    L.nextTick = function(callback) {
        setTimeout(callback, 0); // default version
    };
    
    /**
     * Return a wrapper function of the passed-in function. When the wrapper is 
     * called, the wrapped function is called in next tick.
     *
     * @method async
     * @param {Function} callback the function to be made async
     * @return {Function} the created wrapper function
     */
    L.async = function(callback) {
        return function () {
            var params = Array.prototype.slice.call(arguments, 0);
            L.nextTick(function () {
                callback.apply(null, params);
            });
        };
    };

    /**
     * Clone the required object (deeply)
     *
     * @method clone
     * @param {Object} source the source object to be cloned
     * @param {Boolean} deep deep copy or not, which is false by default
     * @return the cloned object
     */
    L.clone = function(source, deep) {
        // TODO: implement a more effective one
        return JSON.parse(JSON.stringify(source));
    };
    
    
    
    /**
     * Return if the passed in object is a function
     *
     * @method isFunction
     * @param {Object} object the object to be tested
     * @return {Boolean} true if the object is a function, otherwise false
     */
    L.isFunction = function isFunction(object) {
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
    L.isPlainObject = function isPlainObject(object) {
        
        if (!object || L.getObjectType(object) !== Object) {
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
        
        for (var key in object) {}
        
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
    L.isSubClass = function isSubClass(descendent, ancestor) {
        var c = descendent;
        
        if (Object === ancestor) { // everything is an object
            return true;
        }
        
        while (c && c !== ancestor) {
            c = (L.isFunction(c.super_) ? c.super_ : null);
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
    L.inspect = function inspect(object) {
        var type = L.getObjectType(object),
            name = L.getFunctionName(type),
            data = null,
            key = null,
            value = null,
            length = 0;
            
        if (name in { 'Number': 1, 'Boolean': 1, 'Date': 1 }) {
            return object.toString();
        } else if ('String' === name) {
            return '"' + object + '"';
        } else if (undefined === object) {
            return 'undefined';
            // return '<Undefined>';
        } else if (null === object) {
            return 'null';
            // return '<Object: null>';
        } else if (object instanceof Error) {
            return object.name + ': ' + object.message;
        } else if (Function === type) {
            return L.getFunctionName(object) + '()';
        } else if (Array === type) {
            if (object.length > 0) {
                data = object.map(function (item) { 
                    return L.inspect(item);
                }).join(', ');
                return '[' + data + ']';
            }
            return '[]';
        } else if (Object === type) {
            data = data || [];
            
            for (key in object) {
                if (object.hasOwnProperty(key)) {
                    length += 1;
                    value = object[key];
                    data.push('"' + key + '": ' + this.inspect(value));
                }
            }
            return '{' + data.join(', ') + '}';
        }
        
        // fall default
        return name + ': ' + object.toString();
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
    L.getFunctionName = function getFunctionName(func) {
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
    L.getObjectType = function getObjectType(object) {
        if (undefined === object) {
            return undefined;
        } else if (null === object) {
            return Object;
        }
        
        return object.constructor;
    };
    
    
}, '0.0.1', {});
