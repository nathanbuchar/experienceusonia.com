import md from 'markdown-it';
import mdAnchor from 'markdown-it-anchor';
import mdSup from 'markdown-it-sup';
import slugify from 'slugify';

const markdown = md({
  linkify: true,
  breaks: true,
  html: true,
  typographer: true,
});

// ^Sup^
markdown.use(mdSup);

// Anchor
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
