import { Hono } from "hono";
import uploadHandler from "./api/upload.js";
import flightsHandler from "./api/flights.js";
import routeHandler from "./api/route.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.post("/upload", uploadHandler);
app.get("/flights", flightsHandler);
app.get("/route", routeHandler);

app.all("*", (c) => c.text("Use POST /upload, GET /flights, or GET /route?departure=ABC&arrival=XYZ", 405));

export default {
	fetch(request, env, ctx) {
		return app.fetch(request, env, ctx);
	}
};
