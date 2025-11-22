export default async function flightsHandler(c) {
  const env = c.env;

  if (env && env.FLIGHTS_KV && typeof env.FLIGHTS_KV.get === 'function') {
    try {
      const data = await env.FLIGHTS_KV.get('flights');
      if (!data) return c.text('No flights stored', 404);
      try {
        const parsed = JSON.parse(data);
        return c.json(parsed);
      } catch {
        // stored value isn't JSON
        return c.text(data, 200);
      }
    } catch (err) {
      console.error('KV read error:', err && err.message);
      return c.text('Failed to read flights from KV', 500);
    }
  }

  return c.text('FLIGHTS_KV not bound', 404);
}
