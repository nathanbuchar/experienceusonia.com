const eventbriteUserId = process.env.EVENTBRITE_USER_ID;
const eventbriteToken = process.env.EVENTBRITE_TOKEN;

async function callEventbriteApi(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${eventbriteToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  return data;
}

async function getEventsData() {
  const url = `https://www.eventbriteapi.com/v3/organizations/${eventbriteUserId}/events/?status=live&expand=ticket_classes`;

  const data = await callEventbriteApi(url);

  return data.events;
}

function eventbritePlugin() {
  return async (config, ctx) => {
    const events = await getEventsData();

    // Add events to ctx.
    Object.assign(ctx, {
      events,
    });
  };
}

export default eventbritePlugin;
