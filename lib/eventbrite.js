export default () => {
  return async function plugin(config, ctx) {
    const url = `https://www.eventbriteapi.com/v3/organizations/${process.env.EVENTBRITE_USER_ID}/events/?status=live`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // Add data to ctx.
    Object.assign(ctx, {
      events: data.events
    });
  };
};