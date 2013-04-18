/**
 * This module contains the implementation of core algorithm used by Condotti
 * framework, such as sorting algorithm, etc.
 *
 * @module condotti.algorithm
 */
Condotti.add('condotti.algorithm', function (C) {
    
    /**
     * This Sorting class is designed to provide core sorting algorithm used by
     * this Condotti framework, such as topology sorting, etc.
     *
     * @class Sorting
     * @constructor
     */
    function Sorting () {
        /**
         * The logger instance for this object
         * 
         * @property logger_
         * @type Logger
         * @deafult 
         */
        this.logger_ = C.logging.getObjectLogger(this);
    }
    
    /**
     * The implementation of the topology sorting. This sorting actually find
     * out an acyclic path in the DAG that starts with the node whose id is 
     * specified by the first param. Normally this method is used to calculate
     * dependencies, such as the dependencies of a specified module to be 
     * attached, or a specified role to be merged, etc.
     *
     * @method topology
     * @param {String} name the id of the ending node
     * @param {Function} next the function used to get the nodes which current 
     *                        node points to in the DAG
     * @return {Array} the reversed list of the nodes on the acyclic path in the
     *                 DAG which starts with the specified id after sorting
     */
    Sorting.prototype.topology = function (id, next) {
        var trace = {},
            unique = {},
            result = [],
            self = this;
        
        /**
         * some day maybe we have to convert the recursive calls to 
         * iterative calls
         */
        (function (current) {
            var dependencies = null,
                index = 0,
                length = 0;
        
            self.logger_.debug('Calculating node ' + current + ' ...');
        
            if (current in unique) {
                self.logger_.debug('Node ' + current + 
                                   ' has already been calculated.');
                return;
            }
        
            if (current in trace) {
                self.logger_.debug('Circular dependency on node ' + current + 
                                   ' has been detected.');
                throw new C.errors.CircularDependencyError(id, current);
            }
        
            trace[current] = true;
            
            dependencies = next(current);
            length = dependencies.length;
            if (0 == length) {
                self.logger_.debug('Node ' + current + 
                                   ' does not depend on other nodes');
            } else {
                self.logger_.debug('Dependencies of node ' + current + 
                                   C.lang.reflect.inspect(dependencies) + 
                                   ' are gonna be calculated.');
        
                for (index = 0; index < length; index += 1) {
                    arguments.callee(dependencies[index]);
                }
            }
        
        
            self.logger_.debug('Node ' + current + 
                               ' has been successfully calculated.');
            delete trace[current];
        
            result.push(current);
            unique[current] = true;
        
        })(id);
    
        if (result.length) {
            self.logger_.debug('The dependencies of node ' + id + ' are: ' + 
                               C.lang.reflect.inspect(result));
        } else {
            self.logger_.debug('Node ' + id + ' does not depend on other nodes');
        }

        return result;
    };
    
    C.namespace('algorithm').sorting = new Sorting();
    
    
}, '0.0.1', { requires: ['condotti.lang', 'condotti.reflect',
                         'condotti.logging'] });