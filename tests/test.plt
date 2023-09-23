COMMAND: mylang

TEST print.spl:
---
print("Hello, World!");
---
Hello, World!
---

TEST if_stmt.spl:
---
if true {
  print("TRUE");
}
if false {
  print("FALSE");
}

if true {
  print("TRUE");
} else {
  print("FALSE");
}

if false {
  print("TRUE");
} else {
  print("FALSE");
}
---
TRUE
TRUE
FALSE
---

TEST for_stmt.spl:
---
i :: 0;
for i < 5 {
  print(i);
  i = i + 1;
}
print();
i = 0;
for i < 10; i = i + 2 {
  print(i);
}
print();
for i :: 0; i < 5; i = i + 1 {
  print(i);
}
---
0
1
2
3
4

0
2
4
6
8

0
1
2
3
4
---

TEST block.spl:
---
x :: 0;
{
  x :: 1;
  {
    x :: 2;
    print(x);
  }
  print(x);
}
print(x);
---
2
1
0
---

TEST block.spl:
---
x :: 0;
{
  x :: 1;
  {
    x :: 2;
    print(x);
  }
  print(x);
}
print(x);

print();

y :: 0;
print(y);
{
  y = 1;
  print(y);
  {
    y = 2;
    print(y);
  }
  print(y);
}
print(y);

---
2
1
0

0
1
2
2
2
---

TEST binary.spl:
---
a :: 2;
b :: 4;
print(a + b);
print(a - b);
print(a * b);
print(a / b);

# FIXME
# a :: 2.0;
# b :: 4.0;
# print(a + b);
# print(a - b);
# print(a * b);
# print(a / b);

---
6
-2
8
0
---

TEST funcs.spl:
---
a :: () { 123; };
print(a());

b :: (x) { return x; };
print(b(321));

closure :: (start) {
  x :: start;
  return () {
    temp :: x;
    x = x + 1;
    return temp;
  };
};

inc :: closure(5);
print(inc());
print(inc());
print(inc());
---
123
321
5
6
7
---


TEST arr.spl:
---
arr :: [1, 2, 3, 4, 5];
for i :: 0; i < len(arr); i = i + 1 {
  print(arr[i]);
}

for i :: 0; i < len(arr); i = i + 1 {
  arr[i] = arr[i] * arr[i];
} 

print();

for i :: 0; i < len(arr); i = i + 1 {
  print(arr[i]);
}

---
1
2
3
4
5

1
4
9
16
25
---
