import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const API_BASE = 'https://api.tickettailor.com/v1';
const API_KEY = process.env.TICKET_TAILOR_TOKEN;

async function fetchAPI(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function fetchAllPages(endpoint) {
  let allData = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const params = startingAfter ? `?starting_after=${startingAfter}` : '';
    const result = await fetchAPI(`${endpoint}${params}`);

    if (result.data && result.data.length > 0) {
      allData = allData.concat(result.data);

      // Check if there's more data
      if (result.data.length < 100) { // Assuming default page size
        hasMore = false;
      } else {
        // Use the last item's ID for pagination
        startingAfter = result.data[result.data.length - 1].id;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}

async function main() {
  try {
    console.log('Fetching all events...');
    const events = await fetchAllPages('/events');
    console.log(`Found ${events.length} events`);

    // Try to fetch orders (contains customer info)
    let orders = [];
    console.log('\nFetching all orders...');
    try {
      orders = await fetchAllPages('/orders');
      console.log(`Found ${orders.length} orders`);
    } catch (error) {
      console.log(`Error fetching orders: ${error.message}`);
    }

    // Try to fetch issued tickets as backup
    let issuedTickets = [];
    console.log('\nFetching all issued tickets...');
    try {
      issuedTickets = await fetchAllPages('/issued_tickets');
      console.log(`Found ${issuedTickets.length} issued tickets`);
    } catch (error) {
      console.log(`Error fetching issued tickets: ${error.message}`);
    }

    console.log('\nFetching event series for waitlist data...');
    const eventSeries = await fetchAllPages('/event_series');
    console.log(`Found ${eventSeries.length} event series`);

    // Fetch waitlist signups for each event series
    let waitlistSignups = [];
    for (const series of eventSeries) {
      console.log(`Fetching waitlist for series: ${series.id}`);
      try {
        const signups = await fetchAllPages(`/event_series/${series.id}/waitlist_signups`);
        waitlistSignups = waitlistSignups.concat(signups);
      } catch (error) {
        console.log(`  No waitlist or error for series ${series.id}: ${error.message}`);
      }
    }
    console.log(`Found ${waitlistSignups.length} waitlist signups`);

    // Extract emails from orders
    const orderEmails = new Set();
    orders.forEach(order => {
      if (order.email) {
        orderEmails.add(order.email.toLowerCase().trim());
      }
    });

    // Extract emails from issued tickets
    const ticketEmails = new Set();
    issuedTickets.forEach(ticket => {
      if (ticket.email) {
        ticketEmails.add(ticket.email.toLowerCase().trim());
      }
    });

    // Extract emails from waitlist signups
    const waitlistEmails = new Set();
    waitlistSignups.forEach(signup => {
      if (signup.email) {
        waitlistEmails.add(signup.email.toLowerCase().trim());
      }
    });

    // Combine and dedupe all emails
    const allEmails = new Set([...orderEmails, ...ticketEmails, ...waitlistEmails]);

    console.log(`\n--- Summary ---`);
    console.log(`Unique emails from orders: ${orderEmails.size}`);
    console.log(`Unique emails from tickets: ${ticketEmails.size}`);
    console.log(`Unique emails from waitlist: ${waitlistEmails.size}`);
    console.log(`Total unique emails: ${allEmails.size}`);

    // Export to CSV
    const csvContent = 'email\n' + Array.from(allEmails).sort().join('\n');
    fs.writeFileSync('emails.csv', csvContent);
    console.log(`\nEmails exported to emails.csv`);

    // Also save detailed debug info
    const debugData = {
      events,
      orders,
      issuedTickets,
      eventSeries,
      waitlistSignups
    };
    fs.writeFileSync('debug-data.json', JSON.stringify(debugData, null, 2));
    console.log('Debug data saved to debug-data.json');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
