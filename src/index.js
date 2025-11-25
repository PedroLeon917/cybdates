import { Hono } from "hono";
import uploadHandler from "./api/upload.js";
import flightsHandler from "./api/flights.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.post("/upload", uploadHandler);
app.get("/flights", flightsHandler);

app.all("*", (c) => c.text("Use POST /upload or GET /flights", 405));

export default {
	fetch(request, env, ctx) {
		return app.fetch(request, env, ctx);
	}
};
