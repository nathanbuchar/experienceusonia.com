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
console.log(data[3]);

  return data;
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
