import * as ast from "./ast.ts";
import * as err from "./err.ts";

export type Environment = {
  enclosing: Environment | null,
  values: Map<String, ast.Value>,
};

export function create(): Environment {
  return {
    values: new Map(),
    enclosing: null,
  }
}

export function define(e: Environment, name: string, val: ast.Value) {
  e.values.set(name, val);
}

export function get(e: Environment, name: string, line: number): ast.Value | null {
  const val = e.values.get(name);
  if (val === undefined) {
    if (e.enclosing !== null) return get(e.enclosing, name, line);
    err.runtime_error(name, line, "undefined variable");
    return null;
  }
  return val;
}

export function get_at(e: Environment, distance: number, name: string): ast.Value | null {
  return ancestor(e, distance).values.get(name) || null;
}

function ancestor(e: Environment, distance: number): Environment {
  let env: Environment = e;
  for (let i = 0; i < distance; i += 1) {
    env = env.enclosing!;
  }
  return env;
}

export function has(e: Environment, name: string): boolean {
  return e.values.has(name);
}

export function assign_at(e: Environment, distance: number, name: string, value: ast.Value) {
  ancestor(e, distance).values.set(name, value);
}

export function assign(e: Environment, name: string, val: ast.Value, line: number): ast.Value | null {
  if (e.values.has(name)) {
    e.values.set(name, val);
    return val;
  }
  if (e.enclosing !== null) return assign(e.enclosing, name, val, line);
  err.runtime_error(name, line, "undefined variable");
  return null;
}
