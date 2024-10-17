# Module Registry

File names should match the API identifier from the respective module's content type as defined in Contentful.

Modules are automatically rendered on every page. Do not attempt to `{% include %}` these files manually, use the `renderModule()` global instead.

```nunjucks
{{ renderModule('blogList', data) }}
```
