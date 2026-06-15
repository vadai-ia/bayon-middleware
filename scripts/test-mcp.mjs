// End-to-end verification of the MCP server against the Whaapy spec.
// Drives the real flow with the official SDK client over Streamable HTTP:
//   connect (initialize handshake) -> tools/list -> tools/call (match) ->
//   tools/call (no match) -> bad-key rejection.
//
// Prereq: dev server running (npm run dev) and MCP_API_KEY set in .env.local.
// Run with:  npm run test:mcp   (loads .env.local via --env-file)

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const BASE = process.env.MCP_TEST_URL || "http://localhost:3000/api/mcp";
const KEY = process.env.MCP_API_KEY;

if (!KEY) {
  console.error("✖ MCP_API_KEY is not set. Add it to .env.local.");
  process.exit(1);
}

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`✔ ${label}`);
  } else {
    failures += 1;
    console.error(`✖ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function parseEnvelope(result) {
  const block = result?.content?.[0];
  if (!block || block.type !== "text") {
    throw new Error("tool result has no text content block");
  }
  return JSON.parse(block.text);
}

function makeClient() {
  const transport = new StreamableHTTPClientTransport(new URL(BASE), {
    requestInit: { headers: { "x-api-key": KEY } },
  });
  const client = new Client(
    { name: "whaapy-spec-e2e", version: "1.0.0" },
    { capabilities: {} },
  );
  return { client, transport };
}

// 1) Handshake + discovery
const { client, transport } = makeClient();
await client.connect(transport); // performs initialize + notifications/initialized
check("initialize handshake completes", true);

const { tools } = await client.listTools();
const tool = tools.find((t) => t.name === "buscar_productos");
check("tools/list exposes buscar_productos", Boolean(tool));
check(
  "inputSchema root is an object",
  tool?.inputSchema?.type === "object",
  JSON.stringify(tool?.inputSchema?.type),
);
check(
  "query is required in schema",
  Array.isArray(tool?.inputSchema?.required) &&
    tool.inputSchema.required.includes("query"),
);
check(
  "optional facets present as real typed props (not stringified)",
  ["coleccion", "color", "tipo_de_tela", "ancho_min", "precio_max"].every(
    (k) => tool?.inputSchema?.properties?.[k]?.type,
  ),
);
check(
  "ancho_min typed as integer, precio_max as number",
  tool?.inputSchema?.properties?.ancho_min?.type === "integer" &&
    tool?.inputSchema?.properties?.precio_max?.type === "number",
);

// 2) tools/call — matching query
const matchRes = await client.callTool({
  name: "buscar_productos",
  arguments: { query: "percal", color: "Arena" },
});
const matchEnv = parseEnvelope(matchRes);
check("match: ok=true", matchEnv.ok === true);
check("match: status=success", matchEnv.status === "success", matchEnv.status);
check("match: returns products", matchEnv.data?.total > 0, `total=${matchEnv.data?.total}`);
check(
  "match: data.productos is a real array",
  Array.isArray(matchEnv.data?.productos),
);
check("match: envelope has toolName/safety/durationMs", Boolean(
  matchEnv.toolName === "buscar_productos" &&
    matchEnv.safety === "read_only" &&
    typeof matchEnv.durationMs === "number",
));
check("match: isError flag false", matchRes.isError === false);

// 3) tools/call — no match -> clean no-results status
const noneRes = await client.callTool({
  name: "buscar_productos",
  arguments: { query: "terciopelo dorado inexistente", precio_max: 1 },
});
const noneEnv = parseEnvelope(noneRes);
check("no-match: total=0", noneEnv.data?.total === 0, `total=${noneEnv.data?.total}`);
check(
  "no-match: status=needs_more_info",
  noneEnv.status === "needs_more_info",
  noneEnv.status,
);
check("no-match: nextQuestion present (generic)", Boolean(noneEnv.nextQuestion));
check("no-match: empty productos array", Array.isArray(noneEnv.data?.productos) && noneEnv.data.productos.length === 0);

await client.close();

// 4) Bad key -> rejected (raw POST initialize with wrong key)
const badResp = await fetch(BASE, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-06-18",
    "x-api-key": "definitely-not-the-key",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "x", version: "1.0.0" } },
  }),
});
check("bad key: rejected with 401", badResp.status === 401, `status=${badResp.status}`);

// 5) No key at all -> rejected
const noKeyResp = await fetch(BASE, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-06-18",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "x", version: "1.0.0" } },
  }),
});
check("no key: rejected with 401", noKeyResp.status === 401, `status=${noKeyResp.status}`);

console.log("");
if (failures > 0) {
  console.error(`✖ ${failures} check(s) failed.`);
  process.exit(1);
}
console.log("✔ All MCP spec checks passed (connect → list → call → auth).");
