/**
 * Debug utilities.
 *
 * Provides configured debug loggers for different parts of
 * the application. Use DEBUG=site:* environment variable
 * to enable logging.
 *
 * @author Nate Meyer <hi@n8.engineer>
 * @module lib/utils/debug
 */

import debug from 'debug';

/**
 * Debug logger for site-wide logging.
 *
 * @type {Debugger}
 * @example
 * import { siteDebug } from '#lib/utils/debug.js';
 * const debug = siteDebug.extend('component');
 * debug('Message here');
 */
export const siteDebug = debug('site');
