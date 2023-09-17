
export function error(...anything: any) {
  console.error("ERROR:", ...anything);
}

export function info(...anything: any) {
  console.info("INFO:", ...anything);
}

export function warn(...anything: any) {
  console.warn("WARN:", ...anything);
}

export function debug(...anything: any) {
  console.debug(...anything);
}
