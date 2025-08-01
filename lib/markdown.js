import md from 'markdown-it';
import mdAnchor from 'markdown-it-anchor';
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

export default markdown;
