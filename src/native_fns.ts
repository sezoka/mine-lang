import * as interpreter from "./interpreter.ts";
import * as ast from "./ast.ts";
import * as func from "./func.ts";
import * as fs from "node:fs";
import path from "node:path";
import { read_and_run_script } from "./main.ts";
import * as process from "node:process";

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
  process.stdout.write(strings.join(" "));
  return ast.create_value(ast.Value_Kind.null, null);
}

export const println: ast.Value = ast.create_value(
  ast.Value_Kind.func,
  {
    arity: -1,
    fn: println_impl,
    kind: func.My_Func_Kind.native,
  });

export function println_impl(_i: interpreter.Interpreter, args: ast.Value[]): ast.Value | null {
  const strings = new Array(args.length);
  for (let i = 0; i < args.length; i += 1) {
    strings[i] = interpreter.stringify(args[i]);
  }
  process.stdout.write(strings.join(" ") + "\n");
  return ast.create_value(ast.Value_Kind.null, null);
}

export const append: ast.Value = ast.create_value(
  ast.Value_Kind.func,
  {
    arity: -1,
    fn: append_impl,
    kind: func.My_Func_Kind.native,
  });

export function append_impl(_i: interpreter.Interpreter, args: ast.Value[]): ast.Value | null {
  if (args.length < 2) {
    console.error("invalid number of arguments for 'append', expect at least 2");
    return null;
  }
  if (args[0].kind !== ast.Value_Kind.array) {
    console.error("first argument of 'append' should be an array");
    return null;
  }
  const arr = args[0].data as ast.Value[];
  for (let i = 1; i < args.length; i += 1) {
    arr.push(args[i]);
  }
  return ast.create_value(ast.Value_Kind.null, null);
}

export const len: ast.Value = ast.create_value(
  ast.Value_Kind.func,
  {
    arity: 1,
    fn: len_impl,
    kind: func.My_Func_Kind.native,
  });

export function len_impl(_i: interpreter.Interpreter, args: ast.Value[]): ast.Value | null {
  if (args[0].kind !== ast.Value_Kind.array) {
    console.error("argument of 'len' should be an array");
    return null;
  }
  const arr = args[0].data as ast.Value[];
  return ast.create_value(ast.Value_Kind.int, arr.length);
}

export const import_builtin: ast.Value = ast.create_value(
  ast.Value_Kind.func,
  {
    arity: 1,
    fn: import_builtin_impl,
    kind: func.My_Func_Kind.native,
  });

export function import_builtin_impl(inter: interpreter.Interpreter, args: ast.Value[]): ast.Value | null {
  if (args[0].kind !== ast.Value_Kind.string) {
    console.error("argument of '@import' should be a file path");
    return null;
  }
  const dirpath = path.dirname(path.resolve(inter.source_path));
  const env = read_and_run_script(path.resolve(dirpath, args[0].data as string));
  if (env === null) return null;
  return ast.create_value(ast.Value_Kind.namespace, { env });
}
