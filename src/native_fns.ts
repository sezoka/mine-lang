import * as interpreter from "./interpreter.ts";
import * as ast from "./ast.ts";
import * as func from "./func.ts";

export const clock: ast.Value = ast.create_value(
  ast.Value_Kind.func,
  {
    arity: 0,
    fn: clock_impl,
    kind: func.My_Func_Kind.native,
  });

function clock_impl(_i: interpreter.Interpreter, _args: ast.Value[]): ast.Value | null {
  return ast.create_value(ast.Value_Kind.float, performance.now() / 1000.0);
}

export const print: ast.Value = ast.create_value(
  ast.Value_Kind.func,
  {
    arity: -1,
    fn: print_impl,
    kind: func.My_Func_Kind.native,
  });

export function print_impl(_i: interpreter.Interpreter, args: ast.Value[]): ast.Value | null {
  const strings = new Array(args.length);
  for (let i = 0; i < args.length; i += 1) {
    strings[i] = interpreter.stringify(args[i]);
  }
  console.log(strings.join(" "));
  return ast.create_value(ast.Value_Kind.null, null);
}
