import contentful from 'contentful';

const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  host: process.env.CONTENTFUL_HOST,
});

/** @eimplments Client */
class ContentfulClient {
  
  /**
   * @typedef {Record<Source['name'], Object>} Data
   */

  /**
   * Fetches entries from the CDN and returns them as a
   * key-value map.
   *
   * @static
   * @param {Source[]} sources
   * @returns {Promise<Data>}
   */
  static getData(sources) {
    return Promise.all([
      ...sources.map(({ name, contentType }) => {
        return (
          client
            .getEntries({
              content_type: contentType,
              include: 10 // link depth
            })
            .then((data) => {
              // Data tuple.
              // Ex. ['pages', [{...}, ...]]
              return [name, data.items];
            })
        );
      })
    ]).then((arr) => Object.fromEntries(arr));
  }
}

export default ContentfulClient;