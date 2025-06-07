struct Box<T> {
  value: T,
}

impl<T> Box<T> {
  fn new(v: T) -> Self {
    Box { value: v }
  }

  fn get(self) -> T {
    self.value
  }
}

fn main() {
  let b = Box::<Field>::new(5);
  b.get();
}
