function eventbritePlugin() {
  return async (config, ctx) => {
    const url = `https://www.eventbriteapi.com/v3/organizations/${process.env.EVENTBRITE_USER_ID}/events/?status=live&expand=ticket_classes`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const { events } = await response.json();

    Object.assign(ctx, {
      events,
    });
  };
}

export default eventbritePlugin;