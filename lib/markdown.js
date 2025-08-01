import md from 'markdown-it';
import mdAnchor from 'markdown-it-anchor';
import mdFootnotes from 'markdown-it-footnote';
import slugify from 'slugify';

const markdown = md({
  linkify: true,
  breaks: true,
  html: true,
  typographer: true
});

// Anchor
markdown.use(mdAnchor, {
  level: 2,
  slugify(str) {
    return slugify(str, {
      lower: true,
      strict: true
    });
  }
});

// Footnotes
markdown.use(mdFootnotes);
markdown.renderer.rules.footnote_block_open = () => (
  '<hr/>' +
  '<h2>Footnotes</h2>\n' +
  '<section class="footnotes">\n' +
  '<ol class="footnotes-list">\n'
);
markdown.renderer.rules.footnote_block_close = () => (
  '</ol>\n' +
  '</section>\n'
);

export default markdown;
