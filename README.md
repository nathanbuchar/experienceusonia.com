# Experience Usonia Website

A static website for Goetsch–Winckler House built with a custom static site generator. Content is managed through [Contentful CMS](https://contentful.com) and [Ticket Tailor](https://tickettailor.com), compiled to static HTML, and deployed on [Render.com](https://render.com).

## Requirements

- **Node.js**: v23.0.0 or higher
- **Contentful Account**: For content management
- **Ticket Tailor Account**: For event ticketing data

## Getting Started

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DEBUG=lib:*
CONTENTFUL_SPACE_ID=your_space_id
CONTENTFUL_ACCESS_TOKEN=your_access_token
CONTENTFUL_HOST=your_contentful_host
TICKET_TAILOR_API_KEY=your_api_key
NODE_ENV=development
```

### Build Commands

```bash
# Production build
npm run build

# Development build with file watching (rebuilds on file changes)
npm run build -- --watch

# Build without cache (forces fresh data fetch from Contentful/Ticket Tailor)
npm run build -- --no-cache

# Combine flags
npm run build -- --watch --no-cache

# Run local development server
npm run server
```

## Architecture

### How It Works

This is a **static site generator** that:

1. **Fetches content** from Contentful and Ticket Tailor via plugins
2. **Caches data** during development to speed up development builds and minimize unnecessary API requests to prevent rate limiting for free tiers
3. **Renders pages** using Nunjucks templates
  4. **Outputs static HTML** to the `dist/` directory (or whichever directory you specify in `config.js`)

The build process is controlled by `config.js` which defines:
- Which plugins to run (data fetching, cleaning, copying assets)
- Which pages to build (targets)
- What data each page should receive

### Build System

The custom builder (`lib/builder.js`) follows this flow:

```
Run Plugins → Render Targets → Run After-Build Plugins
```

**Plugins** are functions that either:
- Fetch/transform data and add it to the build context
- Perform side effects (cleaning directories, copying files, watching for changes)

**Shared context** (`ctx`) is received by each plugin that they progressively contribute to. The context starts as an empty object `{}` and each plugin can add data to it:

```javascript
// Plugin 1 adds pages data
async run(ctx) {
  ctx.pages = await fetchPages();
}

// Plugin 2 adds navigation data (has access to pages from Plugin 1)
async run(ctx) {
  ctx.navLinks = await fetchNavLinks();
  // ctx.pages is available here!
}

// Plugin 3 can use data from both previous plugins
async run(ctx) {
  ctx.siteMap = buildSiteMap(ctx.pages, ctx.navLinks);
}
```

This shared context is then passed to all templates during the render phase. Plugins run in the order they're defined in `config.js`, so later plugins can access data added by earlier ones.

**Targets** define HTML pages to generate. Each target specifies:
- Which template to use
- Where to output the file
- What data to include from the build context

## Content Management

### Contentful Integration

Content is stored in Contentful and fetched during builds. The site uses a **modular content** approach where pages are composed of reusable content modules.

Each Contentful content type must have a corresponding Nunjucks template file in `src/modules/`. The **filename must match the Contentful content type API identifier ID exactly**.

**Example:**

- Contentful Content Type ID: `imageOneUp`
- Required Module File: `src/modules/imageOneUp.njk`

The `renderModule()` global function:
1. Takes the content type ID (e.g., `imageOneUp`)
2. Finds the matching template file in `src/modules/`
3. Renders it with the module's field data

### Adding New Content Modules

1. **Create the content type in Contentful** with a unique ID (e.g., `videoPlayer`)
2. **Create the template file** at `src/modules/videoPlayer.njk`
3. **Design the module** using Nunjucks syntax (see below)
4. **Add to pages** in Contentful by adding the module to a page's modules field

## Templating with Nunjucks

This project uses [Nunjucks](https://mozilla.github.io/nunjucks/) for templating.

### Key Resources

- **Official Docs**: https://mozilla.github.io/nunjucks/templating.html
- **Template Inheritance**: https://mozilla.github.io/nunjucks/templating.html#template-inheritance
- **Custom Filters**: Defined in `lib/nunjucks.js`

### Important Nunjucks Features

**Variables & Filters:**
```nunjucks
{{ title }}
{{ content | markdown | safe }}
```

**Conditionals:**
```nunjucks
{% if showImage %}
  <img src="{{ image.url }}" />
{% endif %}
```

**Loops:**
```nunjucks
{% for item in items %}
  <li>{{ item.title }}</li>
{% endfor %}
```

**Template Inheritance:**
```nunjucks
{% extends "layout.njk" %}

{% block content %}
  {# Your content here #}
{% endblock %}
```

### Custom Globals & Filters

The project includes custom Nunjucks helpers (see `lib/nunjucks.js`):

## Configuration

### Editing `config.js`

The main configuration file (`config.js`) exports an object with:

```javascript
{
  render,        // The Nunjucks render function
  plugins: [],   // Array of plugin objects
  targets: [],   // Array of build targets
}
```

### Plugins

Plugins are functions which accept configuration options and return objects with optional lifecycle methods:

```javascript
const myPlugin = (config) => {
  return {
    async run(ctx) {
      // Runs during build, can add data to ctx
      ctx.myData = await fetchSomething();
    },
    
    async afterBuild(ctx) {
      // Runs after all pages are built
      // Used for watching files, cleanup, etc.
    }
  };
};
```

**Cache Plugin Example:**

The cache plugin caches data returned from the `hydrate()` function:

```javascript
cache({
  key: 'contentful',
  enabled: !cacheDisabled,
  hydrate() {
    return Builder.runPlugins([
      contentful({
        client,
        sources: [
          { key: 'pages', contentType: 'page' },
          { key: 'navLinks', contentType: 'navLink' },
        ],
      }),
    ]);
  },
})
```

The `hydrate()` function is called when cache is expired or doesn't exist. It should return an object that will be merged into the build context and saved to the cache file.

### Targets

Targets define pages to generate:

```javascript
// Static target
{
  template: '404.njk',
  dest: 'dist/404.html',
  include: ['navLinks', 'banners'],
  enabled: true,
}
```

Targets can also be function, which have access to the shared context:

```javascript
// Dynamic target
(ctx) => ctx.pages.map((page) => ({
  template: 'page.njk',
  dest: `dist/${page.fields.url}/index.html`,
  include: '*',
  extraContext: {
    ...page.fields,
  },
}))
```

Targets may also be a nested tree of any combination of static or dynamic targets:

**Target options:**
- `template` - Template file in `src/` to render
- `dest` - Output path relative to project root
- `include` - Array of context keys to pass, or `'*'` for all
- `extraContext` - Additional data to merge into template context
- `enabled` - Boolean, set false to skip (useful for dev-only pages)

## Writing Custom Plugins

Create a plugin by returning an object with lifecycle methods:

```javascript
function myPlugin() {  
  return {
    async run(ctx) {
      // Fetch or transform data
      const data = await fetchMyData();
      
      // Add to build context
      ctx.myData = data;
    },
    
    async afterBuild(ctx) {
      // Optional: run after all pages are built
      console.log('Build complete!');
    }
  };
}

export default myPlugin;
```

**Important Notes:**

- **Context mutation**: Plugins mutate the shared `ctx` object. Data you add in one plugin is available to all subsequent plugins and templates.
- **Plugin order matters**: Plugins run sequentially in the order defined in `config.js`. If your plugin depends on data from another plugin, place it after that plugin in the array.
- **Return value**: The `run()` method doesn't need to return anything — just mutate `ctx` directly.

**Add to config.js:**
```javascript
import myPlugin from '#lib/plugins/myPlugin.js';

plugins: [
  myPlugin({ option: 'value' }),
]
```

## Project Structure

```
experienceusonia.com/
├── .cache/              # Build cache (gitignored)
├── dist/                # Built static site (gitignored)
├── lib/
│   ├── builder.js       # Core build system
│   ├── cacher.js        # Caching utility class
│   ├── nunjucks.js      # Nunjucks config & custom filters
│   ├── render.js        # Template rendering function
│   └── plugins/         # Build plugins
├── scripts/
│   ├── build.js         # Build script entry point
│   └── server.js        # Dev server
├── src/
│   ├── modules/         # Contentful content modules
│   ├── partials/        # Reusable template partials
│   ├── static/          # Static assets (CSS, JS, images)
│   ├── layout.njk       # Base layout template
│   └── page.njk         # Page template
├── config.js            # Build configuration
├── package.json
└── README.md
```

## Development Workflow

### Typical Development Session

```bash
# Start development with watch mode
npm run build -- --watch

# In another terminal, start the dev server
npm run server

# Visit http://localhost:3000
```

### Making Content Changes

1. Edit content in Contentful
2. Build with `--no-cache` to fetch fresh data
3. Preview locally
4. Deploy (Render auto-builds on push)

### Adding New Page Templates

1. Create template in `src/` (e.g., `src/team.njk`)
2. Add target to `config.js`:
   ```javascript
   {
     template: 'team.njk',
     dest: 'dist/team/index.html',
     include: ['teamMembers', 'navLinks'],
   }
   ```
3. Build and test

### Adding New Content Modules

1. Create content type in Contentful (e.g., `accordion`)
2. Create `src/modules/accordion.njk`
3. Style in `src/static/css/`
4. Test by adding to a page in Contentful
5. Build with `--no-cache` to see changes

## Support

For questions about:
- **Contentful**: Check the content model documentation in Contentful
- **Nunjucks**: https://mozilla.github.io/nunjucks/
- **Build system**: Review `lib/builder.js` and plugin examples

## License

Copyright © 2023–2026 Experience Usonia, LLC
All rights reserved.
