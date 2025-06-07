pub struct Dummy {}

impl Dummy {
    fn helper(self) {}
    fn call(self) {
        self.helper();
    }
}
