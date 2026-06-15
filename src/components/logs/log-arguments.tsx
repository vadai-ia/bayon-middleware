/**
 * Renders an MCP tool's `arguments` jsonb as a readable key/value tree — NOT a
 * stringified blob (ERRORES.md #4 spirit). The payload is real structured data;
 * nested objects/arrays are rendered recursively.
 */

function formatPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "sí" : "no";
  return String(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function ValueNode({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-black">[]</span>;
    return (
      <ul className="ml-3 flex flex-col gap-1 border-l border-bayon-navy/10 pl-3">
        {value.map((item, idx) => (
          <li key={idx}>
            <ValueNode value={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (isPlainObject(value)) {
    return <KeyValueList data={value} />;
  }

  return <span className="font-medium text-black">{formatPrimitive(value)}</span>;
}

function KeyValueList({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin argumentos.</p>;
  }

  return (
    <dl className="flex flex-col gap-1.5">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex flex-col gap-0.5 sm:flex-row sm:gap-2"
        >
          <dt className="font-mono text-xs text-bayon-blue sm:w-40 sm:shrink-0">
            {key}
          </dt>
          <dd className="text-sm">
            <ValueNode value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function LogArguments({
  data,
}: {
  data: Record<string, unknown>;
}) {
  return <KeyValueList data={data} />;
}
