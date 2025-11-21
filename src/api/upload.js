import { processExcel } from "../lib/excel.js";

export default async function uploadHandler(c) {
  // Normalize request object (Hono exposes `req` but shape may vary across envs)
  const req = c.req || c.request;
  const env = c.env;

  const method = req && req.method ? req.method : (c.method || undefined);
  if (method !== "POST") return c.text("Use POST with an Excel file", 405);

  // Safely read content-type from headers (Headers or plain object)
  let contentType = "";
  try {
    const headers = req && req.headers;
    if (headers) {
      if (typeof headers.get === 'function') contentType = headers.get('content-type') || '';
      else contentType = headers['content-type'] || headers['Content-Type'] || '';
    }
  } catch (e) {
    console.log('Could not read headers:', e && e.message);
  }

  console.log('Incoming /upload', { method, contentType });

  let arrayBuffer;

  if (contentType.includes("multipart/form-data")) {
    // formData() may not exist in some runtimes—guard against that
    if (typeof req.formData !== 'function') {
      console.error('request.formData is not a function in this environment');
      return c.text('Server cannot parse multipart/form-data in this environment', 500);
    }
    const formData = await req.formData();
    console.log('formData keys:', Array.from(formData.keys()));
    const file = formData.get("file");
    if (file && typeof file === 'object') {
      try {
        console.log('uploaded file:', { name: file.name, type: file.type, size: file.size });
      } catch (e) {
        console.log('could not read file metadata:', e && e.message);
      }
    }
    if (!file) return c.text("Missing file", 400);
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = await req.arrayBuffer();
  }

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    console.error('Uploaded file is empty (byteLength=0)');
    return c.text('Uploaded file is empty or could not be read', 400);
  }

  try {
    const output = await processExcel(arrayBuffer);

    // Save to Worker KV if available
    try {
      if (env && env.FLIGHTS_KV && typeof env.FLIGHTS_KV.put === 'function') {
        await env.FLIGHTS_KV.put('flights', JSON.stringify(output));
        console.log('Saved flights to Worker KV under key: flights');
      } else {
        console.log('FLIGHTS_KV not bound; skipping KV save');
      }
    } catch (kvErr) {
      console.error('Failed to save to FLIGHTS_KV:', kvErr && kvErr.message);
    }

    return c.json(output);
  } catch (err) {
    console.error('Processing error:', err && err.message);
    return c.text("Error: " + (err && err.message), 500);
  }
}
