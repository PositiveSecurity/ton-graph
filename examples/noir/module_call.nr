mod utils {
    pub fn inc(x: Field) -> Field {
        x + 1
    }
}

fn use_utils() {
    utils::inc(5);
}

struct Dummy {}

impl Dummy {
    fn helper(self) {}
    fn call(self) {
        self.helper();
    }
}

fn main() {
    use_utils();
    let d = Dummy {};
    d.call();
}
