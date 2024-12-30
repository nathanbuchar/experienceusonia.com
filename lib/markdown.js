import md from 'markdown-it';
import mdAnchor from 'markdown-it-anchor';

const markdown = md({
  linkify: true,
  breaks: true,
  html: true,
  typographer: true,
});

markdown.use(mdAnchor);

export default markdown;
