/** @implements Client */
class EventbriteClient {

  static async getData() {
    const url = `https://www.eventbriteapi.com/v3/organizations/${process.env.EVENTBRITE_USER_ID}/events/?status=live`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Error fetching events: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        events: data.events,
      };
    } catch (err) {
      console.error('Failed to fetch events:', err.message);
    }
  }
}

export default EventbriteClient;