import nunjucks from './nunjucks.js';

/**
 * Renders a template with context.
 *
 * @param {string} template
 * @param {Context} ctx
 * @returns {Promise<string>}
 */
function render(template, ctx) {
  return new Promise((resolve, reject) => {
    nunjucks.render(template, ctx, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

export default render;
