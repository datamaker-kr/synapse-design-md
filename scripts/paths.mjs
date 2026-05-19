import { fileURLToPath } from "node:url";
import path from "node:path";

export const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export function fromRoot(...parts) {
  return path.join(packageRoot, ...parts);
}
