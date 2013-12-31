/**
 * This module contains the complementation of the basic logging module in the
 * Condotti core under the node.js environment to provide more logging 
 * facilities.
 *
 * @module condotti.server.logging
 */
Condotti.add('condotti.server.logging', function (C, config) {
    
    var log4js = C.require('log4js');

    C.logging.getLogger = log4js.getLogger;
    C.logging.setGlobalLogLevel = log4js.setGlobalLogLevel;
    
    if (!config) {
        return;
    }
    
    if (config.log4js) {
        log4js.configure(config.log4js);
    }
    
    if (config.level) {
        log4js.setGlobalLogLevel(config.level);
    }

}, '0.0.1', { requires: ['condotti.logging', 'condotti.server.core'] });
