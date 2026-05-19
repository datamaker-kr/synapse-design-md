#!/usr/bin/env node
import { main } from "../scripts/cli.mjs";

main(process.argv.slice(2)).catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
