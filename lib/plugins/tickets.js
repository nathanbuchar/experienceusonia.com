const ticketTailorToken = process.env.TICKET_TAILOR_TOKEN;
const ticketTailorTokenBase64 = Buffer.from(ticketTailorToken).toString('base64');

async function getEventsData() {
  const url = 'https://api.tickettailor.com/v1/events';

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${ticketTailorTokenBase64}`,
      'Content-Type': 'application/json',
    },
  });

  const { data } = await response.json();

  const events = data.filter((evt) => {
    const now = Date.now();

    // Filter out past events.
    if (now <= evt.end.unix * 1000) {
      return true;
    }

    // Filter out hidden and private events.
    if (evt.hidden === 'true' || evt.private === 'true') {
      return true;
    }

    return false;
  }).map((evt) => {
    if (evt.tickets_available_at) {
      const now = new Date();
      const onSaleDate = new Date(evt.tickets_available_at.iso);

      if (now < onSaleDate) {
        evt.tickets_available = 'upcoming';
      }
    }

    return evt;
  });

  return events;
}

function ticketsPlugin() {
  return async (config, ctx) => {
    const events = await getEventsData();

    // Add events to ctx.
    Object.assign(ctx, {
      events,
    });
  };
}

export default ticketsPlugin;
