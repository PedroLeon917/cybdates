export default async function routeHandler(c) {
  const { departure, arrival } = c.req.query();

  // Validate parameters
  if (!departure || !arrival) {
    return c.json(
      { error: "Missing required parameters: departure and arrival" },
      400
    );
  }

  const departureUpper = departure.toUpperCase();
  const arrivalUpper = arrival.toUpperCase();

  // Get flights from KV if available
  let flights = [];
  if (c.env?.FLIGHTS_KV) {
    try {
      const storedData = await c.env.FLIGHTS_KV.get("flights");
      if (storedData) {
        const parsed = JSON.parse(storedData);
        flights = parsed.flights || [];
      }
    } catch {
      return c.json({ error: "Failed to retrieve flights data" }, 500);
    }
  }

  // Find matching route
  const matchingRoute = flights.find(
    (f) => f.departure.toUpperCase() === departureUpper && f.arriving.toUpperCase() === arrivalUpper
  );

  if (!matchingRoute) {
    return c.json(
      {
        error: `No flights found for route ${departure} → ${arrival}`,
        departure: departureUpper,
        arrival: arrivalUpper,
      },
      404
    );
  }

  return c.json({
    departure: matchingRoute.departure,
    arrival: matchingRoute.arriving,
    dates: matchingRoute.dates
  });
}
