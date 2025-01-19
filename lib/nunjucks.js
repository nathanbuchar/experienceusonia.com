import fs from 'fs';
import nunjucks from 'nunjucks';
import path from 'path';
import string from 'string';

import markdown from './markdown.js';

/**
 * The Nunjucks environment.
 */
const env = nunjucks.configure('src');

/**
 * Returns the current Nunjucks context.
 * 
 * @example
 * 
 * {{ ctx() | dump }}
 */
env.addGlobal('ctx', function () {
  return this.ctx;
});

/**
 * Returns the current year.
 * 
 * @example
 * 
 * Copyright &copy; {{ currentYear }}
 */
env.addGlobal('currentYear', function () {
  return new Date().getFullYear();
});

/**
 * Reads a file and returns the contents.
 * 
 * @example
 * 
 * {{ readFile("src/test.md") | markdown | safe }}
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
 * @example
 * 
 * {{ renderModule("Foo", { foo: 'bar' }) }}
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
 * Converts a UTC date to a localeString.
 * 
 * @example
 * 
 * {{ toDateLocaleString('...')}}
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
 * @example
 * 
 * {{ ctx() | debug }}
 */
env.addFilter('debug', function (obj) {
  const str = `<pre>${env.filters.dump(obj, 2)}</pre>`;

  return env.filters.safe(str);
});

/**
 * Renders markdown. If `renderInline` is `true`, the
 * result will not be enclosed in `<p>` tags.
 * 
 * @example
 * 
 * {{ "# Heading" | markdown | safe }}
 * 
 * @example
 * 
 * {# With renderInline = true #}
 * {{ "# Heading" | markdown(true) | safe }}
 */
env.addFilter('markdown', function (str, renderInline = false) {
  if (renderInline) {
    return markdown.renderInline(str);
  } else {
    return markdown.render(str);
  }
});

/**
 * Slugifies a string.
 * 
 * @example
 * 
 * {{ title | slugify }}
 */
env.addFilter('slugify', function (str) {
  return string(str).slugify().toString();
});

/**
 * Filters an array.
 * 
 * @example
 * 
 * {{ events | filterBy('status', 'live') }}
 */
env.addFilter('filterBy', function (arr, prop, target = true) {
 return arr.filter((item) => {
    return Boolean(item[prop] === target);
  });
});

export default env;
