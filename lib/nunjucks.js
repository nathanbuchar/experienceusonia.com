import fs from 'fs';
import path from 'path';
import classnames from 'classnames';
import nunjucks from 'nunjucks';

import * as intl from './intl.js';
import markdown from './markdown.js';

/** @type {NunjucksEnvironment} */
const env = nunjucks.configure('src', {
  noCache: true,
});

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

  const str = fs.readFileSync(fullPath, 'utf8');

  return str;
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
    return err.message;
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

  let str = formatter.format(new Date(utcStr));

  str = str.replace(/\sAM/, 'am'); // Replace " AM" with "am"
  str = str.replace(/\sPM/, 'pm'); // Replace " PM" with "pm"
  str = str.replace(/:00(am|pm)/, '$1'); // Remove ":00"
  str = str.replace(/(E)[SD](T)/, '$1$2'); // Replace "EST" or "EDT" with "ET"

  if (options.hour12) {
    str = str.replace(/(am|pm)/, ''); // Remove "am" or "pm"
  }

  return str;
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
 *       name: 'Nate',
 *     },
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
 *       type: 'disjunction',
 *     },
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
 *       year: 'numeric',
 *     },
 *   })
 * -}}
 */
env.addGlobal('formatDate', function (...args) {
  return intl.formatDate(...args);
});

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
    if (a.fields[prop] < b.fields[prop]) {
      return -1;
    } else if (a.fields[prop] > b.fields[prop]) {
      return 1;
    } else {
      return 0;
    }
  });
});

/**
 * Truncates string at first delimiter and adds ellipsis.
 *
 * @param {string} str
 * @param {string} [delimeter='\\s'] - Regex pattern
 * @param {string} [ellipsis='…']
 * @returns {string}
 * @example
 * {{ longText | truncate('\\n') }}
 */
env.addFilter('truncate', function (str, delimeter = '\s', ellipsis = '…', ) {
  const regexp = new RegExp(delimeter);
  const parts = str.split(regexp);

  if (parts.length > 1) {
    const firstPart = parts[0];

    if (firstPart.endsWith('</p>')) {
      return parts[0].replace('</p>', ` ${ellipsis}</p>`);
    }

    return `${parts[0]} ${ellipsis}`;
  }

  return str;
});

/**
 * Finds element in array by nested attribute path.
 *
 * @param {Array} arr
 * @param {string} attr - Supports dot notation
 * @param {*} target
 * @returns {*}
 * @example
 * {{ pages | find('fields.slug', 'home') }}
 */
env.addFilter('find', function (arr, attr, target) {
  return arr.find((element) => {
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
