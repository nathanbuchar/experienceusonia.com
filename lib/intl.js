/**
 * Internationalization utilities.
 *
 * Provides functions for formatting messages, numbers,
 * lists, and dates using the Intl API and intl-messageformat
 * library.
 *
 * @author Nate Meyer <hi@n8.engineer>
 * @module lib/intl
 */

import IntlMessageFormat from 'intl-messageformat';

/**
 * Generates a formatted message.
 *
 * @param {message} string
 * @param {Object<string, any>} values
 * @param {string} [locale]
 * @returns {string}
 * formatMessage({
 *   message: 'Hello {name}!',
 *   values: {
 *     name: 'Nate',
 *   },
 * })
 */
export const formatMessage = ({
  message,
  values,
  locale = 'en',
}) => {
  const formatter = new IntlMessageFormat(message, locale);
  const formattedMessage = formatter.format(values);

  return formattedMessage;
};

/**
 * Generates a formatted number.
 *
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]
 * @param {string} [locale]
 * @returns {string}
 * formatNumber({ value })
 */
export const formatNumber = ({
  value,
  options = {},
  locale = 'en',
}) => {
  return Intl.NumberFormat(locale, options).format(value);
};

/**
 * Generates a formatted list.
 *
 * @param {string[]} list
 * @param {Intl.ListFormatOptions} [options]
 * @param {string} [locale]
 * @returns {string}
 * formatList({
 *   list,
 *   {
 *     style: 'long',
 *     type: 'disjunction',
 *   },
 * })
 */
export const formatList = ({
  list,
  options = {},
  locale = 'en',
}) => {
  return Intl.ListFormat(locale, options).format(list);
};

/**
 * Generates a formatted date.
 *
 * @param {Date|string|number} value
 * @param {Intl.DateTimeFormatOptions} [options]
 * @param {string} [locale]
 * @returns {string}
 * @example
 * formatDate({
 *   value,
 *   {
 *     month: 'long',
 *     year: 'numeric',
 *   },
 * })
 */
export const formatDate = ({
  value,
  options = {},
  locale = 'en',
}) => {
  return Intl.DateTimeFormat(locale, options).format(value);
};
