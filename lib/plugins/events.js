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

  const events = data.filter((obj) => {
    const now = Date.now();

    // Filter out past events.
    if (now <= obj.end.unix * 1000) {
      return true;
    }

    // Filter out hidden and private events.
    if (obj.hidden === 'true' || obj.private === 'true') {
      return true;
    }

    return false;
  }).map((obj) => {
    const now = new Date();
    const startDate = new Date(obj.start.iso);

    const diffInMs = startDate - now;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays > 60) {
      obj.tickets_available = 'upcoming';

      const onSaleDate = new Date(obj.start.iso);
      onSaleDate.setDate(startDate.getDate() - 60);

      obj.tickets_available_at = `${onSaleDate}`;
    }

    return obj;
  });

  return events;
}

function eventsPlugin() {
  return async (config, ctx) => {
    const events = await getEventsData();

    // Add events to ctx.
    Object.assign(ctx, {
      events,
    });
  };
}

export default eventsPlugin;
