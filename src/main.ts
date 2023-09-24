import * as io from "./lib/io";
import * as log from "./lib/log";
import * as scanner from "./scanner.ts"
import * as parser from "./parser.ts"
import * as interpreter from "./interpreter.ts"
import * as resolver from "./resolver.ts"
import * as err from "./err.ts"
import * as env from "./env.ts"
import fs from "node:fs";

function main() {
  const argv = Bun.argv;

  if (argv.length === 3) {
    read_and_run_script(argv[2]);
    Bun.file
  } else {
    io.eprintln("usage: pl filename.pl");
  }
}

export function read_and_run_script(path: string): env.Environment | null {
  try {
    const maybe_file = fs.readFileSync(path);
    return run_script(maybe_file.toString(), path);
  } catch (err: any) {
    log.error(`unable to read file '${path}'`);
    log.error(err.message);
    return null;
  }
}

export function run_script(src: string, path: string): env.Environment | null {
  const scn = scanner.create(src);
  const prs = parser.create(scn);
  const ast = parser.parse(prs);
  if (ast === null) return null;
  const inter = interpreter.create(path);
  const rvr = resolver.create(inter);
  resolver.resolve_stmts(rvr, ast.statements);
  if (err.had_error) return null;
  return interpreter.interpret(inter, ast);
}

main();
