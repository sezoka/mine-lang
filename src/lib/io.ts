export function print(str: string) {
  Bun.write(Bun.stdout, str);
}

export function println(str: string) {
  print(str);
  print("\n");
}

export function eprint(str: string) {
  Bun.write(Bun.stderr, str);
}

export function eprintln(str: string) {
  eprint(str);
  eprint("\n");
}
