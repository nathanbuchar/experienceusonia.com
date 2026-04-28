/**
 * Nunjucks template environment configuration.
 *
 * Configures the Nunjucks templating engine with custom
 * globals, filters, and utilities for the build system.
 *
 * @author Nate Meyer <hi@n8.engineer>
 * @module lib/nunjucks
 */

import fs from 'fs';
import path from 'path';
import classnames from 'classnames';
import nunjucks from 'nunjucks';

import * as constants from '#lib/constants.js';
import * as intl from '#lib/intl.js';

import markdown from '#lib/markdown.js';

// =========================================================
// ENVIRONMENT
//
// Nunjucks environment configuration.
//
// @see https://mozilla.github.io/nunjucks/api.html#configure
// =========================================================

/** @type {nunjucks.NunjucksEnvironment} */
const env = nunjucks.configure(constants.SRC_DIR, {
  noCache: true,
});

// =========================================================
// GLOBALS
//
// Nunjucks global values are available to all templates.
//
// @see https://mozilla.github.io/nunjucks/api.html#addglobal
// =========================================================

/**
 * Returns the current Nunjucks context.
 *
 * @param {Object} [extraContext={}]
 * @returns {Object}
 * @example
 * {{ ctx() | dump }}
 */
env.addGlobal('ctx', function (extraContext = {}) {
  return {
    ...this.ctx,
    ...extraContext,
  };
});

/**
 * Reads a file and returns its contents.
 *
 * @param {string} filePath
 * @returns {string}
 * @example
 * {{ readFile("src/test.md") | markdown | safe }}
 */
env.addGlobal('readFile', function (filePath) {
  const fullPath = path.resolve(filePath);

  return fs.readFileSync(fullPath, 'utf8');
});

/**
 * Renders a module from `src/modules/{moduleId}.njk`.
 *
 * @param {string} moduleId
 * @param {Object} [extraContext={}]
 * @returns {string}
 * @example
 * {{ renderModule("Widget", { foo: 'bar' }) }}
 */
env.addGlobal('renderModule', function (moduleId, extraContext = {}) {
  const template = path.normalize(`modules/${moduleId}.njk`);

  try {
    const res = env.render(template, {
      ...this.ctx,
      ...extraContext,
    });

    return env.filters.safe(res);
  } catch (err) {
    console.error(`Failed to render module "${moduleId}":`, err.message);
  }
});

/**
 * Returns the current year.
 *
 * @returns {number}
 * @example
 * Copyright &copy; {{ currentYear }}
 */
env.addGlobal('currentYear', function () {
  return new Date().getFullYear();
});

/**
 * Formats UTC date as ET with friendly formatting.
 *
 * @param {string} utcStr
 * @param {Object} [options={}] - Intl.DateTimeFormat options
 * @returns {string}
 * @example
 * {{ toFriendlyETDateLocaleString('2024-01-15T10:00:00Z') }}
 */
env.addGlobal('toFriendlyETDateLocaleString', function (utcStr, options = {}) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit',
    ...options
  });

  return formatter
    .format(new Date(utcStr))
    .replace(/\sAM/, 'am') // Replace " AM" with "am"
    .replace(/\sPM/, 'pm') // Replace " PM" with "pm"
    .replace(/:00(am|pm)/, '$1') // Remove ":00"
    .replace(/(E)[SD](T)/, '$1$2') // Replace "EST" or "EDT" with "ET"
    .replace(options.hour12 ? /(am|pm)/ : /^$/, ''); // Remove "am" or "pm"
});

/**
 * Generates class name string.
 *
 * @param {...*} args
 * @returns {string}
 * @example
 * {{ classnames('foo', { bar: true, baz: false }) }}
 */
env.addGlobal('classnames', function (...args) {
  return classnames(...args);
});

/**
 * Generates a formatted message.
 *
 * @see intl.formatMessage
 * @example
 * {{-
 *   formatMessage({
 *     message: 'Hello {name}!',
 *     values: {
 *       name: 'Nate'
 *     }
 *   })
 * -}}
 */
env.addGlobal('formatMessage', function (...args) {
  return intl.formatMessage(...args);
});

/**
 * Generates a formatted number.
 *
 * @see intl.formatNumber
 * @example
 * {{ formatNumber({ value: numPosts }) }}
 */
env.addGlobal('formatNumber', function (...args) {
  return intl.formatNumber(...args);
});

/**
 * Generates a formatted list.
 *
 * @see intl.formatList
 * @example
 * {{-
 *   formatList({
 *     list: ['foo', 'bar', 'baz'],
 *     options: {
 *       style: 'long',
 *       type: 'disjunction'
 *     }
 *   })
 * -}}
 */
env.addGlobal('formatList', function (...args) {
  return intl.formatList(...args);
});

/**
 * Generates a formatted date.
 *
 * @see intl.formatDate
 * @example
 * {{-
 *   formatDate({
 *     value: post.createdAt,
 *     options: {
 *       month: 'long',
 *       year: 'numeric'
 *     }
 *   })
 * -}}
 */
env.addGlobal('formatDate', function (...args) {
  return intl.formatDate(...args);
});

// =========================================================
// FILTERS
//
// Nunjucks filters are essentially functions that can be
// applied to variables. They are called with a pipe
// operator (|) and can take arguments.
//
// @see https://mozilla.github.io/nunjucks/templating.html#filters
// =========================================================

/**
 * Dumps object wrapped in `<pre>` tags.
 *
 * @param {Object} obj
 * @returns {string}
 * @example
 * {{ ctx() | debug }}
 */
env.addFilter('debug', function (obj) {
  const str = `<pre>${env.filters.dump(obj, 2)}</pre>`;

  return env.filters.safe(str);
});

/**
 * Renders markdown to HTML.
 *
 * @param {string} str
 * @returns {string}
 * @example
 * {{ "# Heading" | markdown | safe }}
 */
env.addFilter('markdown', function (str) {
  return markdown.render(str);
});

/**
 * Renders inline markdown without wrapping `<p>` tags.
 *
 * @param {string} str
 * @returns {string}
 * @example
 * {{ "# Heading" | markdownInline | safe }}
 */
env.addFilter('markdownInline', function (str) {
  return markdown.renderInline(str);
});

/**
 * Sorts array by field property.
 *
 * @param {Array} arr
 * @param {string} prop
 * @returns {Array}
 * @example
 * {{ links | sortByField('order') }}
 */
env.addFilter('sortByField', function (arr, prop) {
  return arr.sort((a, b) => {
    const aVal = a.fields[prop];
    const bVal = b.fields[prop];

    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
});

/**
 * Finds element in array by nested attribute path.
 *
 * @param {Array} arr
 * @param {string} attr - Supports dot notation
 * @param {*} target
 * @returns {*}
 * @example
 * {{ pages | findByKeypath('fields.slug', 'home') }}
 */
env.addFilter('findByKeypath', function (arr, attr, target) {
  return arr.find((element) => {
    if (!element) return false;

    const keys = attr.split('.');

    let value = element;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }

    return value === target;
  });
});

export default env;
