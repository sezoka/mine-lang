import * as ast from "./ast.ts";
import * as err from "./err.ts";
import * as env from "./env.ts";
import * as func from "./func.ts";
import * as nf from "./native_fns.ts";
import { Token } from "./token.ts";


export type Interpreter = {
  env: env.Environment,
  globals: env.Environment,
  locals: Map<ast.Expr, number>,
};

enum Result_Kind {
  return = "Result_Kind_return",
  value = "Result_Kind_value",
  fail = "Result_Kind_fail",
};

export type Result = {
  kind: Result_Kind,
  value: ast.Value | null,
};

const FAIL = { kind: Result_Kind.fail, value: null };

function create_return(v: ast.Value | null): Result {
  if (v === null) return FAIL;
  return { kind: Result_Kind.return, value: v };
}

function create_value(v: ast.Value | null): Result {
  if (v === null) return FAIL;
  return { kind: Result_Kind.value, value: v };
}

export function is_return(v: Result): boolean {
  return v.kind === Result_Kind.return;
}

export function is_value(v: Result): boolean {
  return v.kind === Result_Kind.value;
}

export function is_fail(v: Result): boolean {
  return v.kind === Result_Kind.fail;
}

export function create(): Interpreter {
  const globals = env.create();
  env.define(globals, "clock", nf.clock)
  env.define(globals, "print", nf.print)
  return {
    globals,
    env: globals,
    locals: new Map(),
  };
}


export function interpret(i: Interpreter, a: ast.Ast) {
  for (const expr of a.statements) {
    const ok = evaluate_stmt(i, expr);
    if (is_fail(ok)) return;
  }
}

function evaluate_stmt(i: Interpreter, stmt: ast.Stmt): Result {
  switch (stmt.kind) {
    case ast.Stmt_Kind.return: {
      const v = stmt.value as ast.Return_Stmt;
      let ret_expr: ast.Value | null = ast.NULL;
      if (v.value !== null) ret_expr = eval_expr(i, v.value);
      return create_return(ret_expr);
    }
    case ast.Stmt_Kind.for: {
      const v = stmt.value as ast.For_Stmt;

      if (v.init !== null) {
        if (eval_expr(i, v.init) === null) return FAIL;
      }

      while (true) {
        if (v.cond !== null) {
          const cond = eval_expr(i, v.cond);
          if (cond === null) return FAIL;
          if (is_falsey(cond)) return create_value(ast.NULL);
        }

        if (v.body !== null) {
          if (is_fail(evaluate_stmt(i, v.body))) return FAIL;
        }

        if (v.iter !== null) {
          if (eval_expr(i, v.iter) === null) return FAIL;
        }
      }
    }
    case ast.Stmt_Kind.if: {
      const v = stmt.value as ast.If_Stmt;
      const expr = eval_expr(i, v.cond);
      if (expr === null) return FAIL;
      if (is_truthy(expr)) {
        return evaluate_stmt(i, v.then_branch);
      } else if (v.else_branch !== null) {
        return evaluate_stmt(i, v.else_branch);
      }
      return create_value(ast.NULL);
    }
    case ast.Stmt_Kind.expr_stmt: {
      const v = stmt.value as ast.Expr_Stmt;
      return create_value(eval_expr(i, v.expr));
    }
    case ast.Stmt_Kind.init: {
      const init_stmt = stmt.value as ast.Init_Stmt;
      if (eval_init(i, init_stmt.expr) === null) return FAIL;
      return create_value(ast.NULL);
    }
    case ast.Stmt_Kind.block: {
      const v = stmt.value as ast.Block_Stmt;
      const new_env = env.create();
      new_env.enclosing = i.env;
      return evaluate_block(i, v.statements, new_env);
    }
  }
}

function eval_init(i: Interpreter, init_expr: ast.Expr): ast.Value | null {
  const init = init_expr.value as ast.Init_Expr;
  const initializer = eval_expr(i, init.initializer);
  if (initializer === null) return null;
  env.define(i.env, init.name, initializer);
  return initializer;
}

export function evaluate_block(int: Interpreter, stmts: ast.Stmt[], e: env.Environment): Result {
  const prev_env = int.env;
  int.env = e;
  let ret_val: Result = create_value(ast.NULL);
  for (let i = 0; i < stmts.length; i += 1) {
    ret_val = evaluate_stmt(int, stmts[i]);
    if (is_fail(ret_val) || is_return(ret_val)) {
      int.env = prev_env;
      return ret_val;
    }
  }
  int.env = prev_env;
  return ret_val;
}

function eval_expr(i: Interpreter, expr: ast.Expr): ast.Value | null {
  switch (expr.kind) {
    case ast.Expr_Kind.func: {
      const v = expr.value as ast.Func_Expr;
      const fn: func.My_Func = {
        kind: func.My_Func_Kind.user,
        arity: v.params.length,
        fn: { declaration: v, closure: i.env }
      }
      return ast.create_value(ast.Value_Kind.func, fn);
    }
    case ast.Expr_Kind.init: {
      return eval_init(i, expr);
    }
    case ast.Expr_Kind.call: {
      const v = expr.value as ast.Call_Expr;
      const callee = eval_expr(i, v.callee);
      if (callee === null) return null;
      const args: ast.Value[] = [];
      for (const arg_expr of v.args) {
        const arg = eval_expr(i, arg_expr);
        if (arg === null) return arg;
        args.push(arg);
      }
      if (callee.kind === ast.Value_Kind.func) {
        const fn = callee.data as func.My_Func;
        if (fn.arity !== args.length && fn.arity !== -1) {
          err.runtime_error('(', expr.line, "Expected " + fn.arity + " arguments, but got " + args.length);
          return null;
        }

        return func.call(i, fn, args);
      } else {
        err.runtime_error('(', expr.line, "can only call functions");
        return null;
      }
    }
    case ast.Expr_Kind.assign: {
      const v = expr.value as ast.Assign_Expr;
      const value = eval_expr(i, v.value);
      if (value === null) return null;


      const distance = i.locals.get(expr);
      if (distance !== undefined) {
        env.assign_at(i.env, distance, v.name, value);
      } else {
        env.assign(i.globals, v.name, value, expr.line);
      }

      return value;
    }
    case ast.Expr_Kind.ident: {
      const v = expr.value as ast.Ident_Expr;
      return look_up_variable(i, v.name, expr);
    }
    case ast.Expr_Kind.unary: {
      const unary = expr.value as ast.Unary_Expr;
      const right = eval_expr(i, unary.right);
      if (right === null) return null;

      switch (unary.op) {
        case Token.minus:
          if (!check_number_operand(unary.op, right, expr.line)) return null;
          return ast.create_value(ast.Value_Kind.int, -Number(right.data));
        case Token.bang:
          return ast.create_value(ast.Value_Kind.bool, !is_truthy(right));
      }
      break;
    }
    case ast.Expr_Kind.binary: {
      const binary = expr.value as ast.Binary_Expr;
      const left = eval_expr(i, binary.left);
      const right = eval_expr(i, binary.right);
      if (left === null) return null;
      if (right === null) return null;

      switch (binary.op) {
        case Token.plus:
          if (!check_number_operands_strict(binary.op, left, right, expr.line)) return null;
          return ast.create_value(ast.Value_Kind.int, Number(left.data) + Number(right.data));
        case Token.minus:
          if (!check_number_operands_strict(binary.op, left, right, expr.line)) return null;
          return ast.create_value(ast.Value_Kind.int, left.data as number - (right.data as number));
        case Token.star:
          if (!check_number_operands_strict(binary.op, left, right, expr.line)) return null;
          return ast.create_value(ast.Value_Kind.int, left.data as number * (right.data as number));
        case Token.slash:
          if (!check_number_operands_strict(binary.op, left, right, expr.line)) return null;
          let result = left.data as number / (right.data as number);
          if (left.kind === ast.Value_Kind.int) {
            result = Math.trunc(result);
          }
          return ast.create_value(ast.Value_Kind.int, result);
        case Token.greater:
          if (!check_number_operands(binary.op, left, right, expr.line)) return null;
          return ast.create_value(ast.Value_Kind.bool, left.data as number > (right.data as number));
        case Token.greater_equal:
          if (!check_number_operands(binary.op, left, right, expr.line)) return null;
          return ast.create_value(ast.Value_Kind.bool, left.data as number >= (right.data as number));
        case Token.less:
          if (!check_number_operands(binary.op, left, right, expr.line)) return null;
          return ast.create_value(ast.Value_Kind.bool, left.data as number < (right.data as number));
        case Token.less_equal:
          if (!check_number_operands(binary.op, left, right, expr.line)) return null;
          return ast.create_value(ast.Value_Kind.bool, left.data as number <= (right.data as number));
        case Token.concat:
          if (left.kind !== ast.Value_Kind.string || right.kind !== ast.Value_Kind.string) {
            err.runtime_error("++", expr.line, "both operands should be strings");
            return null;
          }
          return ast.create_value(ast.Value_Kind.string, (left.data as string) + (right.data as string));
      }

      break;
    }
    case ast.Expr_Kind.literal: {
      const literal = expr.value as ast.Literal_Expr;
      return literal.value;
    }
    case ast.Expr_Kind.grouping: {
      const grouping = expr.value as ast.Grouping_Expr;
      return eval_expr(i, grouping.expr);
    }
    case ast.Expr_Kind.if: {
      const if_expr = expr.value as ast.If_Expr;
      const cond = eval_expr(i, if_expr.cond);
      if (cond === null) return null;

      if (is_truthy(cond)) {
        return eval_expr(i, if_expr.then);
      } else {
        return eval_expr(i, if_expr._else);
      }
    }
    case ast.Expr_Kind.logical: {
      const logical = expr.value as ast.Logical_Expr;
      const left_result = eval_expr(i, logical.left);
      if (left_result === null) return null;

      if (logical.op === Token.or) {
        if (is_truthy(left_result)) return ast.create_value(ast.Value_Kind.bool, true);
      } else if (logical.op === Token.and) {
        if (!is_truthy(left_result)) return ast.create_value(ast.Value_Kind.bool, false);
      }

      const right_result = eval_expr(i, logical.right);
      if (right_result === null) return null;

      return ast.create_value(ast.Value_Kind.bool, is_truthy(right_result));
    }
  }

  err.runtime_error(expr.kind, expr.line, "INVALID EXPR");
  return null;
}

function look_up_variable(i: Interpreter, name: string, expr: ast.Expr): ast.Value | null {
  const distance = i.locals.get(expr);

  if (distance !== undefined) {
    return env.get_at(i.env, distance, name);
  } else {
    return env.get(i.globals, name, expr.line);
  }
}

export function resolve(i: Interpreter, expr: ast.Expr, depth: number) {
  i.locals.set(expr, depth);
}

function check_number_operand(op: Token, val: ast.Value, line: number): boolean {
  if (val.kind === ast.Value_Kind.int || val.kind === ast.Value_Kind.float) {
    return true;
  }
  err.runtime_error(op, line, "operand must be a number");
  return false;
}

function check_number_operands_strict(op: Token, left: ast.Value, right: ast.Value, line: number): boolean {
  if ((left.kind === ast.Value_Kind.int && right.kind === ast.Value_Kind.int) ||
    (left.kind === ast.Value_Kind.float && right.kind === ast.Value_Kind.float)) {
    return true;
  }
  err.runtime_error(op, line, "operands should be both ints or both floats");
  return false;
}

function check_number_operands(op: Token, left: ast.Value, right: ast.Value, line: number): boolean {
  if ((left.kind === ast.Value_Kind.int || left.kind === ast.Value_Kind.float) &&
    (right.kind === ast.Value_Kind.int || right.kind === ast.Value_Kind.float)) {
    return true;
  }
  err.runtime_error(op, line, "both operands should be numeric");
  return false;
}

function is_truthy(val: ast.Value): boolean {
  return !is_falsey(val);
}

function is_falsey(val: ast.Value): boolean {
  return val.kind === ast.Value_Kind.null || (val.kind === ast.Value_Kind.bool && !(val.data as boolean));
}

export function stringify(val: ast.Value): string {
  if (val.kind === ast.Value_Kind.float) return (val.data as number).toFixed(3);
  return String(val.data);
}