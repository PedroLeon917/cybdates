**CybDates Worker**

**Description:**
- `cybdates` is a Cloudflare Worker that accepts an uploaded Excel file (XLSX), parses flight schedules, and returns a JSON object with flight origin/destination pairs and the calendar dates they operate. The worker also persists the computed result into a bound Worker KV namespace under the key `flights`.

**Routes:**
- `POST /upload` — Accepts a multipart/form-data request with a file field named `file` (an `.xlsx` file). The uploaded sheet is parsed and the computed `flights` JSON is returned and saved to Worker KV (if `FLIGHTS_KV` is bound).
- `GET /flights` — Reads and returns the saved `flights` JSON from Worker KV (key `flights`).

**Project layout (important files):**
- `src/index.js` — Hono app entry; it mounts API routes and exports the worker `fetch` handler.
- `src/api/upload.js` — `POST /upload` handler: parses multipart, validates the file, calls the Excel parser, and saves the result to KV.
- `src/api/flights.js` — `GET /flights` handler: reads the `flights` value from KV and returns JSON.
- `src/lib/excel.js` — Excel parsing helpers; exports `processExcel(arrayBuffer)` used by the upload handler.
- `wrangler.jsonc` — Wrangler project configuration. Bind the KV namespace here (see below).

Requirements
- Node.js (recommended v16+)
- `wrangler` (Cloudflare Workers CLI)

Install dependencies
```bash
npm install
```

Run locally (development)
1. Start the Worker dev server:
```bash
npm start
# or
wrangler dev
```
2. Wait for the message: `Ready on http://localhost:PORT`.
3. Upload an Excel file (replace `PORT` and the path):
```bash
curl -v --location "http://localhost:PORT/upload" \
  --form 'file=@"/full/path/to/W25.V3.30.10.2025.xlsx"'
```
4. Read the stored flights from KV (if bound):
```bash
curl "http://localhost:PORT/flights"
```

Binding Worker KV (required to persist)
1. Create a KV namespace via Wrangler or the Cloudflare Dashboard:
```bash
wrangler kv namespace create "FLIGHTS_KV"
```
This prints `id` and `preview_id` values.
2. Add the namespace to `wrangler.jsonc` (replace ids):
```jsonc
"kv_namespaces": [
  {
    "binding": "FLIGHTS_KV",
    "id": "<your-kv-id>",
    "preview_id": "<your-preview-id>"
  }
]
```
3. Restart `wrangler dev` so the preview binding is available locally.

Deploy to Cloudflare
```bash
wrangler publish
```
When publishing, Wrangler uses the `id` you specified in `wrangler.jsonc` so the KV binding is available in production.

Testing tips & common issues
- ECONNREFUSED / connection refused: make sure `wrangler dev` is running and use the exact port printed by the dev server.
- Missing file / Uploaded file is empty: the handler expects a `multipart/form-data` form field named `file`. Ensure the client (curl/Postman) uses that exact field name and the file path is correct and readable.
- Corrupted zip / ExcelJS errors: ExcelJS throws this when it receives an empty or non-XLSX buffer. The upload handler now validates `arrayBuffer.byteLength > 0` and returns a 400 for empty payloads. If you still see the error, double-check the client upload and the file path/permissions.
- `FLIGHTS_KV not bound`: add the `kv_namespaces` entry to `wrangler.jsonc` and restart `wrangler dev`.

Implementation notes
- The worker uses `hono` to organize routes and small handlers under `src/api`. This keeps handlers focused and testable.
- Excel parsing is implemented in `src/lib/excel.js` and returns an object `{ flights }` where `flights` is an array of `{ departure, arriving, dates }`.
- By default the worker stores the entire result under KV key `flights`. If you prefer per-route keys or timestamped snapshots, modify `src/api/upload.js` to write multiple keys.

Limitations and recommendations
- KV value size limit: a single KV value has size limits (25 MiB). If you plan to store larger datasets, split them across multiple keys or use R2/Durable Objects.
- ExcelJS in Workers: ExcelJS is intended for Node and may increase bundle size. If bundle size or runtime compatibility becomes a problem, consider using a browser-targeted parser (e.g., `xlsx`) or moving parsing to a dedicated Node service.

Troubleshooting checklist
1. Confirm `wrangler dev` prints `Ready on http://localhost:PORT`.
2. Ensure the client uses form field `file` and the file path is correct.
3. Check the `wrangler dev` logs for handler messages (the upload handler logs `formData keys` and `uploaded file` metadata).
4. If you see `Server cannot parse multipart/form-data in this environment`, the runtime may not support `request.formData()` — run under Wrangler's dev environment or change the upload method.

If you'd like
- I can revert the worker to the single-file `src/index.js` version that you said worked previously, or
- I can change the KV key strategy or add more routes (examples: `DELETE /flights`, `GET /flights/:dep/:arr`).

**Branching & Deployment Model**
This repository is configured with three Wrangler environments and matching GitHub Actions workflows:

- **`main` branch -> `production` environment**
  - Workflow: `.github/workflows/deploy.yml`
  - Deploys using `npx wrangler deploy --env production` and the `production` section in `wrangler.jsonc`.

- **`develop` branch -> `develop` environment**
  - Workflow: `.github/workflows/deploy-develop.yml`
  - Deploys using `npx wrangler deploy --env develop` and the `develop` section in `wrangler.jsonc`.

- **Pull request previews -> `preview` environment**
  - The `preview` section in `wrangler.jsonc` applies when using Wrangler preview or preview workflows.

Setup notes for production vs develop
- `wrangler.jsonc` already contains `env.production`, `env.develop`, and `env.preview` sections. Each env currently references the same KV namespace id. If you want isolated KV data per environment, create separate KV namespaces in Cloudflare and update the `id` for each environment in `wrangler.jsonc`.

Secrets and Permissions
- The GitHub workflows use `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from repository secrets. These tokens should be scoped to the minimum permissions needed for deployments. For stricter separation, you can create separate API tokens for `develop` and `production` and store them as `CLOUDFLARE_API_TOKEN_DEV` / `CLOUDFLARE_API_TOKEN_PROD`, then update the workflow environment variables accordingly.

Post-deploy smoke tests (recommended)
- Add a lightweight smoke-test step to the deploy workflows to validate a successful deployment. Example (append to the deploy job):

```yaml
- name: Smoke test
  run: |
    # replace with your worker URL
    curl -fS https://your-worker.example.com/health || (echo 'smoke test failed' && exit 1)
```

CI and linting
- The CI workflow (`.github/workflows/ci.yml`) runs lint (`npm run lint`), tests, and uploads an `audit.json` from `npm audit` as an artifact.
- Lint is configured via `eslint.config.cjs`. Run locally with `npm run lint`.

Further improvements (optional)
- Use separate KV namespaces per environment to avoid data mixing between preview/develop/production.
- Use GitHub OIDC to avoid storing long-lived Cloudflare API tokens in repository secrets.
- Add Husky + lint-staged to run `eslint --fix` on staged files.

License
- MIT
