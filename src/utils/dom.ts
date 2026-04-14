export function getPageName(url: URL): string {
  const path = url.pathname.replace(/\/+$/, "");
  if (!path || path === "") {
    return "homepage";
  }
  const segments = path.split("/");
  return segments[segments.length - 1];
}

function coerceValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !isNaN(Number(value))) return Number(value);
  return value;
}

function kebabToSnake(str: string): string {
  return str.replace(/-/g, "_");
}

const ABS_PREFIX = "data-abs-";
const TRACK_ATTR = "data-abs-track";

export function parseDataAttributes(el: Element): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const attrs = el.attributes;

  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (attr.name.startsWith(ABS_PREFIX) && attr.name !== TRACK_ATTR) {
      const key = kebabToSnake(attr.name.slice(ABS_PREFIX.length));
      result[key] = coerceValue(attr.value);
    }
  }

  return result;
}
