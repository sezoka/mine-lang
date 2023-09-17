export let had_scan_error = false;
export let had_runtime_error = false;
export let had_parse_error = false;
export let had_error = false;

export function report(line: number, where: string, message: string) {
  had_scan_error = true;
  console.error(`[${line}] Error${where ? " " + where : ""}: ${message}`)
}

export function error(line: number, message: string) {
  report(line, "", message);
}

export function error_token(lexeme: string, line: number, message: string) {
  // ADD EOF HANDLING
  had_error = true;
  report(line, "at '" + lexeme + "'", message);
}

export function runtime_error(lexeme: string, line: number, message: string) {
  had_runtime_error = true;
  console.error(`[${line}] Runtime Error at '${lexeme}': ${message}`)
}

export function parse_error(lexeme: string, line: number, message: string) {
  had_parse_error = true;
  console.error(`[${line}] Parse Error at '${lexeme}': ${message}`)
}
