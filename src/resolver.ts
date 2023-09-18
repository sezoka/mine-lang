import * as interpreter from "./interpreter";
import * as ast from "./ast";
import * as err from "./err";

export type Resolver = {
  interpreter: interpreter.Interpreter,
  scopes: Map<string, boolean>[],
  in_func: boolean,
};

export function create(i: interpreter.Interpreter): Resolver {
  return {
    interpreter: i,
    scopes: [],
    in_func: false,
  };
}

function resolve_stmt(r: Resolver, stmt: ast.Stmt) {
  switch (stmt.kind) {
    case ast.Stmt_Kind.expr_stmt: {
      const expr_stmt = stmt.value as ast.Expr_Stmt;
      resolve_expr(r, expr_stmt.expr);
      return;
    };
    case ast.Stmt_Kind.init: {
      const init = stmt.value as ast.Init_Stmt;
      const init_expr = init.expr.value as ast.Init_Expr;
      const initializer = init_expr.initializer;
      declare_(r, init_expr.name, stmt.line);
      resolve_expr(r, initializer);
      define_(r, init_expr.name);
      return;
    }
    case ast.Stmt_Kind.block: {
      const block = stmt.value as ast.Block_Stmt;
      begin_scope(r);
      resolve_stmts(r, block.statements);
      end_scope(r);
      return;
    }
    case ast.Stmt_Kind.if: {
      const if_stmt = stmt.value as ast.If_Stmt;
      resolve_expr(r, if_stmt.cond);
      resolve_stmt(r, if_stmt.then_branch);
      if (if_stmt.else_branch !== null) resolve_stmt(r, if_stmt.else_branch);
      return;
    }
    case ast.Stmt_Kind.for: {
      const for_stmt = stmt.value as ast.For_Stmt;
      if (for_stmt.init) resolve_expr(r, for_stmt.init);
      if (for_stmt.cond) resolve_expr(r, for_stmt.cond);
      if (for_stmt.iter) resolve_expr(r, for_stmt.iter);
      if (for_stmt.body) resolve_stmt(r, for_stmt.body);
      return;
    }
    case ast.Stmt_Kind.return: {
      const return_stmt = stmt.value as ast.Return_Stmt;
      if (!r.in_func) return err.error_token("return", stmt.line, "can't return from global scope");
      if (return_stmt.value !== null) resolve_expr(r, return_stmt.value);
      return;
    };
  }
}

function resolve_expr(r: Resolver, expr: ast.Expr) {
  switch (expr.kind) {
    case ast.Expr_Kind.array: {
      const array = expr.value as ast.Array_Expr;
      for (let i = 0; i < array.values.length; i += 1) {
        resolve_expr(r, array.values[i]);
      }
      return;
    }
    case ast.Expr_Kind.index: {
      const index = expr.value as ast.Index_Expr;
      resolve_expr(r, index.arr);
      resolve_expr(r, index.idx);
      return;
    }
    case ast.Expr_Kind.binary: {
      const binary = expr.value as ast.Binary_Expr;
      resolve_expr(r, binary.left);
      resolve_expr(r, binary.right);
      return;
    };
    case ast.Expr_Kind.unary: {
      const unary = expr.value as ast.Unary_Expr;
      resolve_expr(r, unary.right);
      return;
    };
    case ast.Expr_Kind.literal: {
      return;
    };
    case ast.Expr_Kind.grouping: {
      const grouping = expr.value as ast.Grouping_Expr;
      resolve_expr(r, grouping.expr);
      return;
    };
    case ast.Expr_Kind.if: {
      const if_expr = expr.value as ast.If_Expr;
      resolve_expr(r, if_expr.cond);
      resolve_expr(r, if_expr.then);
      resolve_expr(r, if_expr._else);
      return;
    };
    case ast.Expr_Kind.ident: {
      const ident = expr.value as ast.Ident_Expr;
      if (r.scopes.length !== 0 && r.scopes[r.scopes.length - 1].get(ident.name) === false) {
        err.error_token(ident.name, expr.line, "can't read local variable in it's own initializer");
      }

      resolve_local(r, expr, ident.name);
      return;
    };
    case ast.Expr_Kind.assign: {
      const assign = expr.value as ast.Assign_Expr;
      resolve_expr(r, assign.value);
      if (assign.target.kind === ast.Expr_Kind.ident) {
        const ident = assign.target.value as ast.Ident_Expr;
        resolve_local(r, expr, ident.name);
        return;
      }
      resolve_expr(r, assign.target);
      return;
    }
    case ast.Expr_Kind.logical: {
      const logical = expr.value as ast.Logical_Expr;
      resolve_expr(r, logical.left);
      resolve_expr(r, logical.right);
      return;
    };
    case ast.Expr_Kind.call: {
      const call = expr.value as ast.Call_Expr;
      resolve_expr(r, call.callee);
      for (let i = 0; i < call.args.length; i += 1) {
        resolve_expr(r, call.args[i]);
      }
      return;
    };
    case ast.Expr_Kind.init: {
      const init = expr.value as ast.Init_Expr;
      const initializer = init.initializer;
      declare_(r, init.name, expr.line);
      resolve_expr(r, initializer);
      define_(r, init.name);
      return;
    };
    case ast.Expr_Kind.func: {
      const func = expr.value as ast.Func_Expr;
      resolve_func(r, func, expr.line);
      return;
    }
  }
}

function resolve_func(r: Resolver, func: ast.Func_Expr, line: number) {
  const in_func = r.in_func;
  r.in_func = true;
  begin_scope(r);
  for (let i = 0; i < func.params.length; i += 1) {
    declare_(r, func.params[i].name, line);
    define_(r, func.params[i].name);
  }
  resolve_stmts(r, func.body);
  end_scope(r);
  r.in_func = in_func;
}

function resolve_local(r: Resolver, expr: ast.Expr, name: string) {
  for (let i = r.scopes.length - 1; 0 <= i; i -= 1) {
    if (r.scopes[i].has(name)) {
      interpreter.resolve(r.interpreter, expr, r.scopes.length - 1 - i);
      return;
    }
  }
}

function declare_(r: Resolver, name: string, line: number) {
  if (r.scopes.length === 0) return;
  const current_scope = r.scopes[r.scopes.length - 1];
  if (current_scope.has(name)) {
    err.error_token(name, line, "variable with this name already in this scope");
    return;
  }
  current_scope.set(name, false);
}

function define_(r: Resolver, name: string) {
  if (r.scopes.length === 0) return;
  const current_scope = r.scopes[r.scopes.length - 1];
  current_scope.set(name, true);
}

export function resolve_stmts(r: Resolver, stmts: ast.Stmt[]) {
  for (let i = 0; i < stmts.length; i += 1) {
    resolve_stmt(r, stmts[i]);
  }
}

function begin_scope(r: Resolver) {
  r.scopes.push(new Map());
}

function end_scope(r: Resolver) {
  r.scopes.pop();
}
