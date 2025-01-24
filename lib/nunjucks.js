import fs from 'fs';
import nunjucks from 'nunjucks';
import path from 'path';

import markdown from './markdown.js';

/** @type {NunjucksEnvironment} */
const env = nunjucks.configure('src');

/**
 * Returns the current Nunjucks context.
 * 
 * @returns {Object}
 * 
 * @example
 * 
 *     {{ ctx() | dump }}
 * 
 */
env.addGlobal('ctx', function () {
  return this.ctx;
});

/**
 * Reads a file and returns the contents.
 * 
 * @param {string} filePath
 * @returns {string}
 * 
 * @example
 * 
 *     {{ readFile("src/test.md") | markdown | safe }}
 * 
 */
env.addGlobal('readFile', function (filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);

  const str = fs.readFileSync(fullPath, 'utf8');

  return str;
});

/**
 * Renders a module with the given context. The `moduleId`
 * must correspond to the module's respective file name in
 * `src/modules`.
 * 
 * @param {string} moduleId
 * @param {Object} [extraContext]
 * @returns {string}
 * 
 * @example
 * 
 *     {{ renderModule("Foo", { foo: 'bar' }) }}
 * 
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
})

;/**
 * Returns the current year.
 * 
 * @returns {string}
 * 
 * @example
 * 
 *     Copyright &copy; {{ currentYear }}
 * 
 */
env.addGlobal('currentYear', function () {
  return new Date().getFullYear();
});

/**
 * Converts a UTC date to a localeString.
 * 
 * @param {string} utcStr
 * @param {Object} [options] - Date time options
 * 
 * @example
 * 
 *     {{ toDateLocaleString('...')}}
 * 
 */
env.addGlobal('toFriendlyDateLocaleString', function (utcStr, options = {}) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit',
    ...options
  });

  let str = formatter.format(new Date(utcStr));

  str = str.replace(/\sAM/, 'am'); // Replace " AM" with "am"
  str = str.replace(/\sPM/, 'pm'); // Replace " PM" with "pm"
  str = str.replace(/:00(am|pm)/, '$1'); // Remove ":00"
  str = str.replace(/(E)[SD](T)/, '$1$2'); // Replace "EST" OR "EDT" with "ET"

  if (options.hour12) {
    str = str.replace(/(am|pm)/, ''); // Remove "am" or "pm"
  }

  return str;
});

/**
 * Like dump, but the output is wrapped in `<pre>` tags.
 * 
 * @param {Object} obj
 * @returns {string}
 * 
 * @example
 * 
 *     {{ ctx() | debug }}
 * 
 */
env.addFilter('debug', function (obj) {
  const str = `<pre>${env.filters.dump(obj, 2)}</pre>`;

  return env.filters.safe(str);
});

/**
 * Renders markdown.
 * 
 * @param {string} str
 * @returns {string}
 * 
 * @example
 * 
 *     {{ "# Heading" | markdown | safe }}
 * 
 */
env.addFilter('markdown', function (str) {
  return markdown.render(str);
});

/**
 * Renders inline markdown (result will not be wrapped in
 * `<p>` tags).
 * 
 * @params {string} str
 * @returns {string}
 * 
 * @example
 * 
 *     {{ "# Heading" | markdownInline | safe }}
 * 
 */
env.addFilter('markdownInline', function (str) {
  return markdown.renderInline(str);
});

/**
 * Filters an array.
 * 
 * @param {Array} arr
 * @param {string} prop
 * @param {any} [target=true]
 * @returns {Array}
 * 
 * @example
 * 
 *     {{ events | filterBy('status', 'live') }}
 * 
 */
env.addFilter('filterBy', function (arr, prop, target = true) {
 return arr.filter((item) => {
    return Boolean(item[prop] === target);
  });
});

export default env;