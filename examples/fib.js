function fib(n) {
  if (n <= 1) {
    return n;
  } else {
    return fib(n - 1) + fib(n - 2);
  }
};

const start = performance.now();
console.log(fib(30));
const end = performance.now();

console.log("Elapsed time:", (end - start) / 1000);
