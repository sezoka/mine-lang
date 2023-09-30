ex_1 :: fn() {
  print("hello, ");
  print("world");
  print("\n");
};

# ex_1();

ex_3 :: fn() {
  fahr :: 0.0;
  celsius :: 0.0;
  lower :: 0.0;
  upper :: 300.0;
  step :: 20.0;

  println("FAHR\t\tCELS");
  fahr = lower;
  for fahr <= upper {
    celsius = (5.0 / 9.0) * (fahr - 32.0);
    print(int(fahr));
    print("\t\t");
    println(int(celsius));
    fahr = fahr + step;
  }
};

# ex_3();

ex_4 :: fn() {
  celsius :: 0.0;
  lower :: 0.0;
  upper :: 300.0;
  step :: 20.0;

  println("CELS\t\tFAHR");
  celsius = lower;
  for celsius <= upper {
    fahr :: celsius * (9.0 / 5.0) + 32.0;
    print(int(celsius));
    print("\t\t");
    println(int(fahr));
    celsius += step;
  }
};

# ex_4();

ex_5 :: fn() {
  lower :: 0.0;
  upper :: 300.0;
  step :: 20.0;

  println("CELS\t\tFAHR");
  for celsius :: upper; lower < celsius; celsius -= step {
    fahr :: celsius * (9.0 / 5.0) + 32.0;
    print(int(celsius));
    print("\t\t");
    println(int(fahr));
  }
};

ex_5();
