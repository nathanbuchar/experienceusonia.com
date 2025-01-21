import contentful from 'contentful';

function contentfulPlugin(sources) {

  // Initialize Contentful client.
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
    host: process.env.CONTENTFUL_HOST,
  });

  return async (config, ctx) => {
    const dataArr = await Promise.all([
      ...sources.map(async (source) => {
        const { key, contentType } = source;

        // Get entries data.
        const data = await client.getEntries({
          content_type: contentType,
          include: 10, // link depth
        });

        // Convert data to tuple.
        // Ex. ['pages', [{...}, ...]]
        return [key, data.items];
      }),
    ]);

    // Convert data tuples to object.
    const data = Object.fromEntries(dataArr);

    // Add data to ctx.
    Object.assign(ctx, data);
  };
}

export default contentfulPlugin;