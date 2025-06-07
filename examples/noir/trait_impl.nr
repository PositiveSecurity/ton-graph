trait Summable<T> {
  fn sum(self, a: T, b: T) -> T;
}

struct Adder {}

impl Summable<Field> for Adder {
  fn sum(self, a: Field, b: Field) -> Field {
    a + b
  }
}

fn main() {
  let a = Adder {};
  a.sum(3, 4);
}
