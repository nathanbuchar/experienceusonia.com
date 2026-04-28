/**
 * Markdown rendering configuration.
 *
 * Configures the markdown-it parser with plugins for
 * rendering markdown content to HTML throughout the site.
 *
 * @author Nate Meyer <hi@n8.engineer>
 * @module lib/markdown
 */

import md from 'markdown-it';
import mdAnchor from 'markdown-it-anchor';
import mdSup from 'markdown-it-sup';
import slugify from 'slugify';

/** @type {md.MarkdownIt} */
const markdown = md({
  linkify: true,
  breaks: true,
  html: true,
  typographer: true,
});

// ^Sup^
markdown.use(mdSup);

// # Anchors
markdown.use(mdAnchor, {
  level: 2,
  slugify(str) {
    return slugify(str, {
      lower: true,
      strict: true,
    });
  },
});

export default markdown;
