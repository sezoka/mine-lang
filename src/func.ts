import * as ast from "./ast.ts";
import * as env from "./env.ts";
import * as interpreter from "./interpreter";


export type My_Func = {
  arity: number,
  kind: My_Func_Kind,
  fn: Native_Func | User_Func,
};

export enum My_Func_Kind {
  native = "native",
  user = "user",
};

export type Native_Func = (i: interpreter.Interpreter, args: ast.Value[]) => ast.Value | null;

export type User_Func = {
  declaration: ast.Func_Expr,
  closure: env.Environment,
};

export function call(inter: interpreter.Interpreter, func: My_Func, args: ast.Value[]): ast.Value | null {
  if (func.kind === My_Func_Kind.native) return (func.fn as Native_Func)(inter, args);
  const user_fn = (func.fn as User_Func);
  const environment = env.create();
  environment.enclosing = user_fn.closure;

  for (let i = 0; i < user_fn.declaration.params.length; i += 1) {
    env.define(environment, user_fn.declaration.params[i].name, args[i]);
  }
  const maybe_ret_expr = interpreter.evaluate_block(inter, user_fn.declaration.body, environment);
  if (interpreter.is_fail(maybe_ret_expr)) {
    return null;
  }
  return maybe_ret_expr.value;
}

