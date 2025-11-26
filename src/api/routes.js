export default async function routesHandler(c) {
  if (!c.env?.FLIGHTS_KV) {
    return c.json({ error: 'FLIGHTS_KV not bound in this environment' }, 500);
  }

  try {
    const stored = await c.env.FLIGHTS_KV.get('flights');
    if (!stored) return c.json({ count: 0, routes: [] });

    const parsed = JSON.parse(stored);
    const flights = Array.isArray(parsed.flights) ? parsed.flights : [];

    const seen = new Set();
    const routes = [];

    for (const f of flights) {
      if (!f || !f.departure || !f.arriving) continue;
      const dep = String(f.departure).trim().toUpperCase();
      const arr = String(f.arriving).trim().toUpperCase();
      const key = `${dep}|${arr}`;
      if (!seen.has(key)) {
        seen.add(key);
        routes.push({ departure: dep, arrival: arr });
      }
    }

    return c.json({ count: routes.length, routes });
  } catch (e) {
    return c.json({ error: 'Failed to read flights from KV', message: String(e) }, 500);
  }
}
