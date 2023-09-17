import time

def fib(n):
    if n <= 1:
        return n
    else:
        return fib(n - 1) + fib(n - 2)


start = time.time()
print(fib(30))
end = time.time()

print("Elapsed time:", (end - start))
