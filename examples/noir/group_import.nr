mod utils {
    pub fn add(x: Field, y: Field) -> Field { x + y }
    pub fn sub(x: Field, y: Field) -> Field { x - y }
}

use utils::{add, sub};

fn main() {
    add(1, 2);
    sub(3, 1);
}
