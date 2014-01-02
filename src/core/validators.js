/**
 * This module contains the definition of the validator and also the 
 * implementations of the basic validators, such as TypeValidator, 
 * RangeValidator, etc.
 * 
 * @module condotti.validators
 */
Condotti.add('condotti.validators', function (C) {

    /**
     * This Validator class defines the behaviours a validator is expected to
     * have, and is designed to be the abstract base of all concrete validator
     * implementations.
     * 
     * @class Validator
     * @constructor
     * @param {String} name the name of this validator, normally it is the name
     *                      of the param/variable used to generate necessary
     *                      message
     */
    function Validator (name) {
        /**
         * The name of this validator
         * 
         * @property name_
         * @type String
         */
        this.name_ = name;
    }
    
    /**
     * Abstract method used to validate whether the input can pass the 
     * validation. If not, an error of ValidationFailedError is to be thrown.
     * 
     * @method validate
     * @param {Object} target the target object to be validated
     */
    Validator.prototype.validate = function (target) {
        throw new C.errors.NotImplementedError('This validate method is not ' +
                                               'implemented here, and is ' +
                                               'expected to be overwritten in' +
                                               ' the child classes.');
    };
    
    C.namespace('validators').Validator = Validator;
    
    
    /**
     * This TypeValidator is designed to validate the type of the passed-in 
     * target is the one required.
     * 
     * @class TypeValidator
     * @constructor
     * @extends Validator
     * @param {String} name the name of the validator
     * @param {Function} type the constructor of the required type, which can
     *                        also be one of null or undefined
     */
    function TypeValidator (name, type) {
        /* inheritance */
        this.super(name);
        
        /**
         * The constructor of the required type, which can be null, or undefined
         * 
         * @property type_
         * @type Function
         */
        this.type_ = type;
    }
    
    C.lang.inherit(TypeValidator, Validator);
    
    /**
     * Validate whether the type of the input is the required one
     * 
     * @method validate
     * @param {Object} target the target object to be validated
     */
    TypeValidator.prototype.validate = function (target) {
        var type = C.lang.reflect.getObjectType(target);
        if (type !== this.type_) {
            throw new C.errors.ValidationFailedError(
                this.name_ + ' is expected to be of type ' + 
                C.lang.reflect.getFunctionName(this.type_) + ', however ' +
                C.lang.reflect.getFunctionName(type) + ' is found.'
            );
        }
    };
    
    C.namespace('validators').TypeValidator = TypeValidator;
    
    /**
     * This RangeValidator is designed to validate the value of the passed-in 
     * target falls into the required range.
     * 
     * @class RangeValidator
     * @constructor
     * @extends Validator
     * @param {String} name the name of the validator
     * @param {Array} range an two-element array indicates the start and stop
     *                      values. Note that the start value is included in
     *                      the range, but the stop one is not.
     */
    function RangeValidator (name, range) {
        /* inheritance */
        this.super(name);
        
        /**
         * The required range, which is a two-element array indicates the start
         * and stop values. Note that the start value is included in the range,
         * but the stop one is not.
         * 
         * @property range_
         * @type Array
         */
        this.range_ = range;
    }
    
    C.lang.inherit(RangeValidator, Validator);
    
    /**
     * Validate whether the type of the input falls into the required range
     * 
     * @method validate
     * @param {Object} target the target object to be validated
     */
    RangeValidator.prototype.validate = function (target) {
        if ((target < this.range_[0]) || (target >= this.range_[1])) {
            throw new C.errors.ValidationFailedError(
                this.name_ + ' is expected to be in [' + this.range_[0] + ', ' +
                this.range_[1] + '), but ' + target + ' is found.'
            );
        }
    };
    
    C.namespace('validators').RangeValidator = RangeValidator;
    
    /**
     * This EnumValidator is designed to validate the value of the passed-in 
     * target is one of the specified values.
     * 
     * @class EnumValidator
     * @constructor
     * @extends Validator
     * @param {String} name the name of the validator
     * @param {Array} candidates an array contains the valid candidate values
     */
    function EnumValidator (name, candidates) {
        /* inheritance */
        this.super(name);
        
        /**
         * The candidate values
         * 
         * @property candidates_
         * @type Array
         */
        this.candidates_ = candidates;
    }
    
    C.lang.inherit(EnumValidator, Validator);
    
    /**
     * Validate whether the type of the input is one of the specified values
     * 
     * @method validate
     * @param {Object} target the target object to be validated
     */
    EnumValidator.prototype.validate = function (target) {
        if (this.candidates_.indexOf(target) < 0) {
            throw new C.errors.ValidationFailedError(
                this.name_ + ' is expected to be one of ' + 
                this.candidates_.toString() + ', but ' + target + ' is found.'
            );
        }
    };
    
    C.namespace('validators').EnumValidator = EnumValidator;
    
    /**
     * This NotEmptyValidator is designed to validate the value of the passed-in 
     * target is not empty. The target is determinted to be empty when one of
     * followings is true:
     * 
     * 1. the target is null
     * 2. the target is undefined
     * 3. the target is an array with no element
     * 4. the target is an object that does not own any property
     * 
     * @class NotEmptyValidator
     * @constructor
     * @extends Validator
     * @param {String} name the name of the validator
     */
    function NotEmptyValidator (name) {
        /* inheritance */
        this.super(name);
    }
    
    C.lang.inherit(NotEmptyValidator, Validator);
    
    /**
     * Validate whether the type of the input is not empty
     * 
     * @method validate
     * @param {Object} target the target object to be validated
     */
    NotEmptyValidator.prototype.validate = function (target) {
        
        if ((target === null) || (target === undefined)) {
            throw new C.errors.ValidationFailedError(
                this.name_ + ' is expected to be not empty, but it\'s ' + 
                Object.prototype.toString.call(target)
            );
        }
        
        if (Array.isArray(target) && (target.length === 0)) {
            throw new C.errors.ValidationFailedError(
                this.name_ + 
                ' is expected not to be an empty array, but it\'s empty'
            );
        }
        
        if (C.lang.reflect.isPlainObject(target) && 
            (Object.keys(target).length === 0)) {
            
            throw new C.errors.ValidationFailedError(
                this.name_ + ' is expected to be an object with at least ' +
                'one property, but it\'s empty'
            );
        }
    };
    
    C.namespace('validators').NotEmptyValidator = NotEmptyValidator;
    
    /**
     * This OptionalValidator is designed to ensure that the value of the 
     * passed-in target has to pass the specified validations if and only if 
     * the target exists. (target === undefined)
     * 
     * @class OptionalValidator
     * @constructor
     * @extends Validator
     * @param {String} name the name of the validator
     * @param {Array} validations an array validators with which the target is
     *                            to be validated if it exists(!== undefined)
     */
    function OptionalValidator (name, validations) {
        
        if (C.lang.reflect.getObjectType(name) !== String) {
            validations = name;
            name = 'optional';
        }
        
        /* inheritance */
        this.super(name);
        
        /**
         * the validation collection to be used on the passed-in target
         * 
         * @property validations_
         * @type Object
         */
        this.validations_ = validations;
        
        /* initialize */
        // TODO: check validations is an instance of validator if it's not an
        //       array
        if (!Array.isArray(validations)) {
            this.validations_ = [ validations ];
        }
        
    }
    
    C.lang.inherit(OptionalValidator, Validator);
    
    /**
     * Validate whether the input can pass through all the validations required
     * when it exists (not undefined)
     * 
     * @method validate
     * @param {Object} target the target object to be validated
     */
    OptionalValidator.prototype.validate = function (target) {
        if (target === undefined) {
            return;
        }
        
        this.validations_.forEach(function (validator) {
            validator.validate(target);
        });
    };
    
    C.namespace('validators').OptionalValidator = OptionalValidator;
    
    /**
     * This ObjectValidator is designed to validate the properties of the 
     * passed-in target can pass through the specified validations.
     * 
     * @class ObjectValidator
     * @constructor
     * @extends Validator
     * @param {String} name the name of the validator
     * @param {Object} validations the validations to be used on the passed-in
     *                             target. The structure of this param is like
     *                             {
     *                                 'key1.sub_key2': [validator instances]
     *                             }
     *                             Note that this validator only validates the
     *                             properties of the passed-in target, or the
     *                             ones of its sub objects which on the paths
     *                             specified by the keys of this param. The path
     *                             of a property from the root of the passed-in 
     *                             target is separated by '.'
     */
    function ObjectValidator (name, validations) {
        
        if (C.lang.reflect.getObjectType(name) !== String) {
            validations = name;
            name = 'object';
        }
        
        /* inheritance */
        this.super(name);
        
        /**
         * the validation collection to be used on the passed-in target
         * 
         * @property validations_
         * @type Object
         */
        this.validations_ = validations;
        
        /**
         * The logger instance for this validator
         * 
         * @property logger_
         * @type Logger
         */
        this.logger_ = C.logging.getObjectLogger(this);
        
        /* initialize */
        this.initialize_();
    }
    
    C.lang.inherit(ObjectValidator, Validator);
    
    /**
     * Initialize this validator
     * 
     * @method initialize_
     */
    ObjectValidator.prototype.initialize_ = function () {
        var key = null,
            value = null;
        
        for (key in this.validations_) {
            value = this.validations_[key];
            
            if (!Array.isArray(value)) {
                this.validations_[key] = [ value ];
            }
        }
    };
    
    /**
     * Validate whether the input can pass through all the validations required
     * 
     * @method validate
     * @param {Object} target the target object to be validated
     */
    ObjectValidator.prototype.validate = function (target) {
        var path = null,
            property = null;
        
        for (path in this.validations_) {
            try {
                property = C.namespace.call(target, path, false);
            } catch (e) {
                this.logger_.warn('Looking up property ' + path + 
                                  ' in target ' + 
                                  C.lang.reflect.inspect(target) + 
                                  ' failed. Error: '+ e.message);
                                  
                property = undefined;
            }
            
            this.validations_[path].forEach(function (validator) {
                validator.validate(property);
            });
        }
    };
    
    C.namespace('validators').ObjectValidator = ObjectValidator;
    

}, '0.0.1', { requires: ['condotti.lang', 'condotti.errors', 
                         'condotti.logging'] });