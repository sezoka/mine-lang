import { Token } from "./token";
import * as func from "./func.ts";

export type Ast = {
  statements: Stmt[],
}

export type Stmt = {
  kind: Stmt_Kind,
  value: Expr_Stmt | Init_Stmt | Block_Stmt | If_Stmt | For_Stmt | Return_Stmt,
  line: number,
};

export type Return_Stmt = {
  value: Expr | null,
};

export type For_Stmt = {
  init: Expr | null,
  cond: Expr | null,
  iter: Expr | null,
  body: Stmt,
};

export type If_Stmt = {
  cond: Expr,
  then_branch: Stmt,
  else_branch: Stmt | null,
};

export type Block_Stmt = {
  statements: Stmt[],
};

export type Expr_Stmt = {
  expr: Expr,
}

export enum Stmt_Kind {
  expr_stmt = "expr_stmt",
  init = "init",
  block = "block",
  if = "if",
  for = "for",
  return = "return",
};

export enum Expr_Kind {
  binary = "binary",
  unary = "unary",
  literal = "literal",
  grouping = "grouping",
  if = "ternary",
  ident = "ident",
  assign = "assign",
  logical = "logical",
  call = "call",
  init = "init",
  func = "func",
  index = "index",
  array = "array",
};

export type Expr = {
  line: number,
  kind: Expr_Kind,
  value: Binary_Expr | Unary_Expr | Literal_Expr | Grouping_Expr | If_Expr | Ident_Expr | Assign_Expr | Logical_Expr | Call_Expr | Init_Expr | Func_Expr | Index_Expr | Array_Expr,
};

export type Index_Expr = {
  arr: Expr,
  idx: Expr,
}

export type Array_Expr = {
  values: Expr[],
}

export type Func_Expr = {
  params: Ident_Expr[],
  body: Stmt[],
}

export type Init_Expr = {
  name: string,
  initializer: Expr,
}

export type Call_Expr = {
  callee: Expr,
  args: Expr[],
};

export type Logical_Expr = {
  op: Token,
  left: Expr,
  right: Expr,
};

export type Assign_Expr = {
  target: Expr,
  value: Expr,
};

export type Ident_Expr = {
  name: string,
};

export type Init_Stmt = {
  expr: Expr,
}

export type Binary_Expr = {
  left: Expr,
  op: Token,
  right: Expr,
};

export type If_Expr = {
  cond: Expr,
  then: Expr,
  _else: Expr,
};

export type Unary_Expr = {
  op: Token,
  right: Expr,
};

export type Literal_Expr = {
  value: Value,
};

export type Grouping_Expr = {
  expr: Expr,
};

export enum Value_Kind {
  bool = "<bool>",
  null = "null",
  string = "<string>",
  int = "<int>",
  float = "<float>",
  func = "<function>",
  array = "<array>",
}

export type Value_Data = boolean | null | string | number | func.My_Func | Value[];

export type Value = {
  kind: Value_Kind,
  data: Value_Data,
};

export function create_bin_expr(line: number, left: Expr, op: Token, right: Expr): Expr {
  return { line, kind: Expr_Kind.binary, value: { left, op, right } }
}

export function create_index_expr(line: number, arr: Expr, idx: Expr): Expr {
  return { line, kind: Expr_Kind.index, value: { arr, idx } }
}

export function create_array_expr(line: number, values: Expr[]): Expr {
  return { line, kind: Expr_Kind.array, value: { values } }
}

export function create_unary_expr(line: number, op: Token, right: Expr): Expr {
  return { line, kind: Expr_Kind.unary, value: { op, right } }
}

export function create_literal_expr(line: number, val: Value): Expr {
  return { line, kind: Expr_Kind.literal, value: { value: val } }
}

export function create_grouping_expr(line: number, expr: Expr): Expr {
  return { line, kind: Expr_Kind.grouping, value: { expr } }
}

export function create_if_expr(line: number, cond: Expr, then: Expr, _else: Expr): Expr {
  return { line, kind: Expr_Kind.if, value: { cond, then, _else } }
}

export function create_ident_expr(line: number, name: string): Expr {
  return { line, kind: Expr_Kind.ident, value: { name } };
}

export function create_assign_expr(line: number, target: Expr, value: Expr): Expr {
  return { line, kind: Expr_Kind.assign, value: { target, value } };
}

export function create_value(kind: Value_Kind, data: Value_Data): Value {
  return { kind, data };
}

export function create_ast(statements: Stmt[]): Ast {
  return { statements };
}

export function create_expr_stmt(line: number, expr: Expr): Stmt {
  return { line, kind: Stmt_Kind.expr_stmt, value: { expr: expr } };
}

export function create_init_stmt(line: number, name: string, initializer: Expr): Stmt {
  return { line, kind: Stmt_Kind.init, value: { expr: create_init_expr(line, name, initializer) } };
}

export function create_init_expr(line: number, name: string, initializer: Expr): Expr {
  return { line, kind: Expr_Kind.init, value: { name, initializer } };
}

export function create_block_stmt(line: number, statements: Stmt[]): Stmt {
  return { line, kind: Stmt_Kind.block, value: { statements } };
}

export function create_if_stmt(line: number, cond: Expr, then_branch: Stmt, else_branch: Stmt | null): Stmt {
  return { line, kind: Stmt_Kind.if, value: { cond, then_branch, else_branch } };
}

export function create_logical_expr(line: number, op: Token, left: Expr, right: Expr): Expr {
  return { line, kind: Expr_Kind.logical, value: { op, left, right } };
}

export function create_call_expr(line: number, callee: Expr, args: Expr[]): Expr {
  return { line, kind: Expr_Kind.call, value: { callee, args } };
}

export function create_func_expr(line: number, params: Ident_Expr[], body: Stmt[]): Expr {
  return { line, kind: Expr_Kind.func, value: { params, body } };
}

export function create_for_stmt(line: number, init: Expr | null, cond: Expr | null, iter: Expr | null, body: Stmt): Stmt {
  return { line, kind: Stmt_Kind.for, value: { init, cond, iter, body } };
}

export function create_return_stmt(line: number, value: Expr | null): Stmt {
  return { line, kind: Stmt_Kind.return, value: { value } };
}

export const NULL = create_value(Value_Kind.null, null);

export function is_null(v: Value): boolean {
  return v.kind === Value_Kind.null;
}

