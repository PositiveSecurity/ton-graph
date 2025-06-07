mod utils {
    pub fn inc(x: Field) -> Field { x + 1 }
    pub fn dec(x: Field) -> Field { x - 1 }
}

use utils::*;

fn main() {
    inc(5);
    dec(5);
}
