import * as scanner from "./scanner.ts";
import * as ast from "./ast.ts";
import * as err from "./err.ts";
import { Token } from "./token.ts";

export type Parser = {
  scanner: scanner.Scanner,
  curr_token: Token,
  prev_token: Token,
  is_at_end: boolean,
};

export function create(s: scanner.Scanner): Parser {
  const parser = { scanner: s, curr_token: Token.none, prev_token: Token.none, is_at_end: false };
  advance(parser);
  return parser;
}

export function parse(p: Parser): ast.Ast | null {
  const statements: ast.Stmt[] = [];

  while (!p.is_at_end) {
    const expr = parse_declaration(p);
    if (expr === null) return synchronize(p);
    statements.push(expr);
  }

  return ast.create_ast(statements);
}

function parse_declaration(p: Parser): ast.Stmt | null {
  if (p.curr_token === Token.ident && peek_next(p) === Token.init) {
    advance(p);
    const name = p.scanner.literal;
    advance(p);
    const initializer = parse_expression(p);
    if (initializer === null) return synchronize(p);
    if (!consume(p, Token.semicolon, "expect ';' after variable declaration")) return synchronize(p);
    return ast.create_init_stmt(p.scanner.prev_line, name, initializer);
  }

  return parse_statement(p);
}

function parse_declaration_expr(p: Parser): ast.Expr | null {
  if (p.curr_token === Token.ident && peek_next(p) === Token.init) {
    advance(p);
    const name = p.scanner.literal;
    advance(p);
    const initializer = parse_expression(p);
    if (initializer === null) return synchronize(p);
    return ast.create_init_expr(p.scanner.prev_line, name, initializer);
  }

  return parse_or(p);
}

function parse_statement(p: Parser): ast.Stmt | null {
  if (match(p, Token.left_brace)) {
    const line = p.scanner.prev_line;
    const stmts = parse_block_statement(p)
    if (stmts === null) return synchronize(p);
    return ast.create_block_stmt(line, stmts);
  };

  if (match(p, Token.if)) {
    return parse_if_stmt(p);
  }

  if (match(p, Token.for)) {
    return parse_for(p);
  }

  if (match(p, Token.return)) {
    return parse_return(p);
  }

  return parse_expr_stmt(p);

}

function parse_return(p: Parser): ast.Stmt | null {
  const line = p.scanner.prev_line;
  let value: ast.Expr | null = null;
  if (!check(p, Token.semicolon)) {
    value = parse_expression(p);
  }
  if (!consume(p, Token.semicolon, "expect ';' after return value")) return synchronize(p);
  return ast.create_return_stmt(line, value);
}

function parse_for(p: Parser): ast.Stmt | null {
  const line = p.scanner.line;
  let cond: ast.Expr | null = null;
  let init: ast.Expr | null = null;
  let post: ast.Expr | null = null;
  let body: ast.Stmt | null = null;

  if (check(p, Token.left_brace) || match(p, Token.then)) {
    body = parse_statement(p);
    if (body === null) return synchronize(p);
    return ast.create_for_stmt(line, null, null, null, body);
  }

  cond = parse_declaration_expr(p);
  if (cond === null) return synchronize(p);

  if (check(p, Token.left_brace) || match(p, Token.then)) {
    body = parse_statement(p);
    if (body === null) return synchronize(p);
    const for_stmt = ast.create_for_stmt(line, null, cond, null, body);
    return ast.create_block_stmt(line, [for_stmt]);
  }
  if (!consume(p, Token.semicolon, "expect ';' after conditional expression")) return synchronize(p);

  post = parse_expression(p);
  if (post === null) return synchronize(p);


  if (check(p, Token.left_brace) || match(p, Token.then)) {
    body = parse_statement(p);
    if (body === null) return synchronize(p);
    const for_stmt = ast.create_for_stmt(line, null, cond, post, body);
    return ast.create_block_stmt(line, [for_stmt]);
  }
  if (!consume(p, Token.semicolon, "expect ';' after iterative expression")) return synchronize(p);

  init = cond;
  cond = post;

  post = parse_expression(p);
  if (init === null) return synchronize(p);

  if (check(p, Token.left_brace) || match(p, Token.then)) {
    body = parse_statement(p);
    if (body === null) return synchronize(p);
    const for_stmt = ast.create_for_stmt(line, init, cond, post, body);
    return ast.create_block_stmt(line, [for_stmt]);
  }

  err.parse_error(p.scanner.lexeme, line, "expect '{' or 'then' after iterative expression");

  return synchronize(p);
}

function parse_if_stmt(p: Parser): ast.Stmt | null {
  const cond = parse_expression(p);
  if (cond === null) return synchronize(p);
  const line = p.scanner.prev_line;
  if (!(check(p, Token.left_brace) || match(p, Token.then))) {
    err.parse_error(p.scanner.lexeme, p.scanner.prev_line, "expect 'then' or '{' after conditional expression");
    return synchronize(p);
  }
  const then_branch = parse_statement(p);
  if (then_branch === null) return synchronize(p);
  let else_branch: ast.Stmt | null = null;
  if (match(p, Token.else)) {
    else_branch = parse_statement(p);
    if (else_branch === null) return synchronize(p);
  }
  return ast.create_if_stmt(line, cond, then_branch, else_branch);
}

function parse_block_statement(p: Parser): ast.Stmt[] | null {
  const statements: ast.Stmt[] = [];

  while (!check(p, Token.right_brace) && !p.is_at_end) {
    const stmt = parse_declaration(p)
    if (stmt === null) return synchronize(p);
    statements.push(stmt);
  }

  if (!consume(p, Token.right_brace, "expect '}' after block")) return synchronize(p);
  return statements;
}

// function parse_expr_stmt(p: Parser): ast.Stmt | null {
//   const line = p.scanner.line;
//   const expr = parse_expression(p);
//   if (expr === null) return null;
//   if (!consume(p, Token.semicolon, "Expect ';' at the end of expression.")) return null;
//   return ast.create_expr_stmt(line, expr);
// }

function parse_expr_stmt(p: Parser): ast.Stmt | null {
  const line = p.scanner.line;
  const expr = parse_expression(p);
  if (expr === null) return synchronize(p);
  if (check(p, Token.right_brace)) {
    return ast.create_expr_stmt(line, expr);
  }
  if (!consume(p, Token.semicolon, "Expect ';' at the end of expression.")) return synchronize(p);
  return ast.create_block_stmt(line, [ast.create_expr_stmt(line, expr), ast.create_expr_stmt(line, ast.create_literal_expr(line, ast.create_value(ast.Value_Kind.null, null)))]);
}

function parse_expression(p: Parser): ast.Expr | null {
  return parse_func(p);
}

function parse_func(p: Parser): ast.Expr | null {
  if (match(p, Token.fn)) {
    if (!consume(p, Token.left_paren, "expect '(' after parameters")) return synchronize(p);
    const line = p.scanner.prev_line;
    const params: ast.Ident_Expr[] = [];
    if (!check(p, Token.right_paren)) {
      do {
        const param = parse_expression(p);
        if (param === null) return synchronize(p);
        if (param.kind !== ast.Expr_Kind.ident) {
          err.parse_error(p.scanner.lexeme, p.scanner.prev_line, "all function params should be identifiers");
          return synchronize(p);
        }
        params.push(param.value as ast.Ident_Expr);
      } while (match(p, Token.comma));
    }
    consume(p, Token.right_paren, "expect ')' after parameters");
    consume(p, Token.left_brace, "expect '{' before function block");
    const body = parse_block_statement(p);
    if (body === null) return synchronize(p);
    return ast.create_func_expr(line, params, body);
  }

  return parse_assignment(p);
}

function parse_assignment(p: Parser): ast.Expr | null {
  let expr = parse_or(p);
  if (expr === null) return synchronize(p);
  const var_line = p.scanner.prev_line;

  if (match(p, Token.equal, Token.plus_equal, Token.minus_equal, Token.star_equal, Token.slash_equal)) {
    const op = p.prev_token;
    let value = parse_assignment(p);
    if (value === null) return synchronize(p);

    switch (op) {
      case Token.plus_equal: value = ast.create_bin_expr(var_line, expr, Token.plus, value); break;
      case Token.minus_equal: value = ast.create_bin_expr(var_line, expr, Token.minus, value); break;
      case Token.star_equal: value = ast.create_bin_expr(var_line, expr, Token.star, value); break;
      case Token.slash_equal: value = ast.create_bin_expr(var_line, expr, Token.slash, value); break;
    }

    return ast.create_assign_expr(var_line, expr, value);
  }

  return expr;
}

function parse_or(p: Parser): ast.Expr | null {
  let expr = parse_and(p);
  if (expr === null) return expr;

  while (match(p, Token.or)) {
    const line = p.scanner.prev_line;
    const right = parse_and(p);
    if (right === null) return expr;
    expr = ast.create_logical_expr(line, Token.or, expr, right);
  }

  return expr;
}

function parse_and(p: Parser): ast.Expr | null {
  let expr = parse_equality(p);
  if (expr === null) return expr;

  while (match(p, Token.and)) {
    const line = p.scanner.prev_line;
    const right = parse_equality(p);
    if (right === null) return expr;
    expr = ast.create_logical_expr(line, Token.and, expr, right);
  }

  return expr;
}

function parse_equality(p: Parser): ast.Expr | null {
  let left = parse_comparison(p);
  if (left === null) return synchronize(p);

  while (match(p, Token.bang_equal, Token.equal_equal)) {
    const op = p.prev_token;
    const line = p.scanner.line;
    const right = parse_comparison(p);
    if (right === null) return synchronize(p);
    left = ast.create_bin_expr(line, left, op, right);
  }

  return left;
}

function parse_comparison(p: Parser): ast.Expr | null {
  let left = parse_array(p);
  if (left === null) return synchronize(p);

  while (match(p, Token.greater, Token.greater_equal, Token.less, Token.less_equal)) {
    const op = p.prev_token;
    const line = p.scanner.line;
    const right = parse_array(p);
    if (right === null) return synchronize(p);
    left = ast.create_bin_expr(line, left, op, right);
  }

  return left;
}

function parse_array(p: Parser): ast.Expr | null {
  if (match(p, Token.left_bracket)) {
    const line = p.scanner.prev_line;
    const values: ast.Expr[] = [];
    if (!check(p, Token.right_bracket)) {
      do {
        const val = parse_expression(p);
        if (val === null) return synchronize(p);
        values.push(val);
      } while (match(p, Token.comma));
    }
    if (consume(p, Token.right_bracket, "Expect ']' after array values") === null) return synchronize(p);

    return ast.create_array_expr(line, values);
  }

  return parse_term(p);
}

function parse_term(p: Parser): ast.Expr | null {
  let left = parse_factor(p);
  if (left === null) return synchronize(p);

  while (match(p, Token.plus, Token.minus)) {
    const op = p.prev_token;
    const line = p.scanner.line;
    const right = parse_factor(p);
    if (right === null) return synchronize(p);
    left = ast.create_bin_expr(line, left, op, right);
  }

  return left;
}

function parse_factor(p: Parser): ast.Expr | null {
  let left = parse_unary(p);
  if (left === null) return synchronize(p);

  while (match(p, Token.star, Token.slash, Token.concat)) {
    const op = p.prev_token;
    const line = p.scanner.line;
    const right = parse_unary(p);
    if (right === null) return synchronize(p);
    left = ast.create_bin_expr(line, left, op, right);
  }

  return left;
}


function parse_unary(p: Parser): ast.Expr | null {
  if (match(p, Token.bang, Token.minus)) {
    const op = p.prev_token;
    const line = p.scanner.line;
    const right = parse_unary(p);
    if (right === null) return synchronize(p);
    return ast.create_unary_expr(line, op, right);
  }

  return parse_call_expr(p);
}

function parse_call_expr(p: Parser): ast.Expr | null {
  let expr = parse_if_expr(p);
  if (expr === null) return synchronize(p);

  for (; ;) {
    const line = p.scanner.line;
    if (match(p, Token.left_paren)) {
      const args: ast.Expr[] = [];
      if (!check(p, Token.right_paren)) {
        do {
          const arg = parse_expression(p);
          if (arg === null) return synchronize(p);
          args.push(arg);
        } while (match(p, Token.comma));
      }
      consume(p, Token.right_paren, "Expect ')' after arguments");
      expr = ast.create_call_expr(line, expr, args);
    } else if (match(p, Token.dot)) {
      consume(p, Token.ident, "expect property name after '.'");
      const name = p.scanner.literal;
      expr = ast.create_get_expr(line, expr, name);
      if (expr === null) return null;
    } else {
      break;
    }
  }

  return expr;
}

function parse_if_expr(p: Parser): ast.Expr | null {
  if (match(p, Token.if)) {
    const line = p.scanner.prev_line;
    const cond = parse_expression(p);
    if (cond === null) return synchronize(p);
    if (!consume(p, Token.then, "expected 'then' after conditional expression")) return synchronize(p);
    const then = parse_expression(p);
    if (then === null) return synchronize(p);
    if (!consume(p, Token.else, "expected 'else' after then expression")) return synchronize(p);
    const _else = parse_expression(p);
    if (_else === null) return synchronize(p);
    return ast.create_if_expr(line, cond, then, _else);

  } else {
    return parse_index(p);
  }
}

function parse_index(p: Parser): ast.Expr | null {
  const arr = parse_primary(p);
  if (arr === null) return synchronize(p);

  const line = p.scanner.line;
  if (match(p, Token.left_bracket)) {
    const idx = parse_expression(p);
    if (idx === null) return synchronize(p);
    consume(p, Token.right_bracket, "expect ']' after index expression");
    return ast.create_index_expr(line, arr, idx);
  }

  return arr;
}

function parse_primary(p: Parser): ast.Expr | null {
  if (match(p, Token.false)) return ast.create_literal_expr(p.scanner.line, { kind: ast.Value_Kind.bool, data: false });
  if (match(p, Token.true)) return ast.create_literal_expr(p.scanner.line, { kind: ast.Value_Kind.bool, data: true });
  if (match(p, Token.null)) return ast.create_literal_expr(p.scanner.line, { kind: ast.Value_Kind.null, data: null });

  if (match(p, Token.int, Token.float)) {
    const kind = p.prev_token === Token.int ? ast.Value_Kind.int : ast.Value_Kind.float;
    const data = Number(p.scanner.literal);
    return ast.create_literal_expr(p.scanner.line, { kind, data });
  }

  if (match(p, Token.string)) {
    return ast.create_literal_expr(p.scanner.line, { kind: ast.Value_Kind.string, data: p.scanner.literal });
  }

  if (match(p, Token.ident)) {
    return ast.create_ident_expr(p.scanner.prev_line, p.scanner.literal);
  }

  if (match(p, Token.left_paren)) {
    const expr = parse_expression(p);
    if (expr === null) return synchronize(p);
    if (!consume(p, Token.right_paren, "Expect ')' after expression.")) return synchronize(p);
    return ast.create_grouping_expr(p.scanner.line, expr);
  }

  console.log(p.prev_token, p.curr_token)

  err.parse_error(p.scanner.lexeme, p.scanner.prev_line, "Expect expression.");
  return synchronize(p);
}

function consume(p: Parser, tok: Token, msg: string): Token | null {
  if (check(p, tok)) return advance(p);
  err.parse_error(p.scanner.lexeme, p.scanner.prev_line, msg);
  return null;
}

function synchronize(p: Parser): null {
  advance(p);

  while (!p.is_at_end) {
    if (p.prev_token == Token.semicolon)
      return null;

    switch (p.curr_token) {
      case Token.init:
      case Token.for:
      case Token.if:
      case Token.while:
      case Token.return:
        return null;
    }

    advance(p);
  }

  return null;
}

function match(p: Parser, ...tokens: Token[]): boolean {
  for (const tok of tokens) {
    if (check(p, tok)) {
      advance(p);
      return true;
    }
  }
  return false;
}

function peek_next(p: Parser): Token | null {
  const prev_pos = p.scanner.pos;
  const prev_line = p.scanner.line;
  const prev_prev_line = p.scanner.prev_line;
  const prev_literal = p.scanner.literal;

  const next = scanner.next_token(p.scanner);

  p.scanner.pos = prev_pos;
  p.scanner.line = prev_line;
  p.scanner.prev_line = prev_prev_line;
  p.scanner.literal = prev_literal;

  return next;
}

function check(p: Parser, tok: Token): boolean {
  if (p.is_at_end) {
    return false;
  }
  return p.curr_token === tok;
}

function advance(p: Parser): Token {
  if (!p.is_at_end) {
    const maybe_token = scanner.next_token(p.scanner);
    p.prev_token = p.curr_token;
    if (maybe_token !== null) {
      p.curr_token = maybe_token;
    } else {
      p.curr_token = Token.eof;
      p.is_at_end = true;
    }
  }
  return p.prev_token;
}
