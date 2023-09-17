import * as io from "./lib/io";
import * as log from "./lib/log";
import * as scanner from "./scanner.ts"
import * as parser from "./parser.ts"
import * as interpreter from "./interpreter.ts"
import * as resolver from "./resolver.ts"
import * as err from "./err.ts"

function main() {
  const argv = Bun.argv;

  if (argv.length === 3) {
    read_and_run_script(argv[2]);
    Bun.file
  } else {
    io.eprintln("usage: pl filename.pl");
  }
}

function read_and_run_script(path: string) {
  const maybe_file = Bun.file(path);
  maybe_file.text()
    .then((src) => {
      run_script(src);
    })
    .catch((err) => {
      log.error(`unable to read file '${path}'`);
      log.error(err.message);
    })
}

function run_script(src: string) {
  const scn = scanner.create(src);
  const prs = parser.create(scn);
  const ast = parser.parse(prs);
  if (ast === null) return;
  const inter = interpreter.create();
  const rvr = resolver.create(inter);
  resolver.resolve_stmts(rvr, ast.statements);
  if (err.had_error) return;
  interpreter.interpret(inter, ast);
}

main();
