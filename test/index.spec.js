import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('CybDates Worker', () => {
	it('responds with ok status on /health (unit style)', async () => {
		const request = new Request('http://example.com/health');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		const json = await response.json();
		expect(json.status).toMatchInlineSnapshot(`"ok"`);
	});

	it('responds with ok status on /health (integration style)', async () => {
		const response = await SELF.fetch('http://example.com/health');
		const json = await response.json();
		expect(json.status).toMatchInlineSnapshot(`"ok"`);
	});
});
