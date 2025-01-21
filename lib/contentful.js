import client from './client.js';

export default (sources) => {
  return async function plugin(config, ctx) {
    const dataArr = await Promise.all([
      ...sources.map(async ({ key, contentType }) => {
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
};