import * as token from "./token.ts";
import * as err from "./err.ts";

export type Scanner = {
  src: string,
  lexeme: string,
  literal: string,
  line: number,
  prev_line: number,
  pos: number,
}

export function create(src: string): Scanner {
  return {
    src: src,
    lexeme: "",
    literal: "",
    line: 1,
    prev_line: 1,
    pos: 0,
  };
}

const keywords = new Map([
  ["and", token.Token.and],
  ["else", token.Token.else],
  ["false", token.Token.false],
  ["fn", token.Token.fn],
  ["for", token.Token.for],
  ["if", token.Token.if],
  ["null", token.Token.null],
  ["or", token.Token.or],
  ["return", token.Token.return],
  ["then", token.Token.then],
  ["true", token.Token.true],
  ["while", token.Token.while],
  // ["import", token.Token.import],
])

export function next_token(s: Scanner): token.Token | null {
  s.prev_line = s.line;
  skip_whitespace(s);

  if (is_at_end(s)) {
    return null;
  }

  const c = advance(s);
  switch (c) {
    case ',': return token.Token.comma
    case '.': return token.Token.dot
    case '{': return token.Token.left_brace
    case '}': return token.Token.right_brace
    case '(': return token.Token.left_paren
    case ')': return token.Token.right_paren
    case '[': return token.Token.left_bracket
    case ']': return token.Token.right_bracket
    case ';': return token.Token.semicolon
    case '#': return token.Token.hash
    case '@': return token.Token.at
    case '+': return match(s, "=") ? token.Token.plus_equal :
      match(s, "+") ? token.Token.concat : token.Token.plus
    case '-': return match(s, "=") ? token.Token.minus_equal : token.Token.minus
    case '*': return match(s, "=") ? token.Token.star_equal : token.Token.star
    case '/': return match(s, "=") ? token.Token.slash_equal : token.Token.slash
    case ':': return match(s, ":") ? token.Token.init : token.Token.colon
    case '+': return match(s, "+") ? token.Token.concat : token.Token.plus
    case '!': return match(s, "=") ? token.Token.bang_equal : token.Token.bang
    case '=': return match(s, "=") ? token.Token.equal_equal : token.Token.equal
    case '<': return match(s, "=") ? token.Token.less_equal : token.Token.less
    case '>': return match(s, "=") ? token.Token.greater_equal : token.Token.greater
    case '"': return scan_string(s)
    default: {
      if (is_digit(c)) return scan_number(s);
      if (is_alpha(c)) return scan_identifier(s);
    }
  }

  err.report(s.line, "in scanner", "invalid character " + "'" + c + "'");

  return null;
}

function scan_identifier(s: Scanner): token.Token {
  const start = s.pos - 1;
  while (is_alphanumeric(peek(s))) {
    advance(s);
  }
  const end = s.pos;

  s.lexeme = s.src.slice(start, end);
  return match_keyword(s, s.lexeme);
}

function match_keyword(s: Scanner, lexeme: string): token.Token {
  const tok = keywords.get(lexeme);
  if (tok !== undefined) {
    return tok;
  }
  s.literal = s.lexeme;
  return token.Token.ident;
}

function is_alpha(c: string): boolean {
  return ("a" <= c && c <= "z") || ("A" <= c && c <= "Z") || c === "_";
}

function is_alphanumeric(c: string): boolean {
  return is_alpha(c) || is_digit(c);
}

function scan_number(s: Scanner): token.Token {
  let tok = token.Token.int;

  const start = s.pos - 1;
  while (is_digit(peek(s))) {
    advance(s);
  }

  if (peek(s) === "." && is_digit(peek_next(s))) {
    tok = token.Token.float;
    advance(s);
  }

  while (is_digit(peek(s))) {
    advance(s);
  }
  const end = s.pos;

  s.lexeme = s.src.slice(start, end);
  s.literal = s.lexeme;
  return tok
}

function is_digit(char: string): boolean {
  return "0" <= char && char <= "9";
}

function scan_string(s: Scanner): token.Token | null {
  const start = s.pos;
  while (!is_at_end(s) && peek(s) !== '"') {
    if (peek(s) === "\n") s.line += 1;
    advance(s);
  }
  if (is_at_end(s)) {
    err.error(s.line, "unterminated string")
    return null;
  }
  const end = s.pos;

  advance(s);
  s.lexeme = s.src.slice(start, end);
  s.literal = s.lexeme;
  return token.Token.string;
}

function skip_whitespace(s: Scanner) {
  while (!is_at_end(s)) {
    switch (peek(s)) {
      case '\n': {
        s.line += 1;
        advance(s)
        continue;
      }
      case '#': {
        while (peek(s) !== "\n") {
          advance(s);
        }
        s.line += 1;
        advance(s);
        continue;
      }
      case ' ':
      case '\t':
        advance(s)
        continue;
      default:
        return
    }
  }
}


function match(s: Scanner, char: string): boolean {
  if (is_at_end(s) || peek(s) !== char) return false;
  s.pos += 1;
  return true;
}

function peek(s: Scanner): string {
  if (is_at_end(s)) {
    return '\0';
  } else {
    return s.src[s.pos];
  }
}

function peek_next(s: Scanner): string {
  if (s.src.length < s.pos) {
    return '\0';
  } else {
    return s.src[s.pos + 1];
  }
}

function advance(s: Scanner): string {
  if (is_at_end(s)) {
    return "\0";
  } else {
    const curr = s.src[s.pos];
    s.pos += 1;
    return curr;
  }
}

export function is_at_end(s: Scanner): boolean {
  return s.src.length <= s.pos;
}

