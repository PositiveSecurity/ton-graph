mod utils {
    pub fn inc(x: Field) -> Field { x + 1 }
    pub fn dec(x: Field) -> Field { x - 1 }
    pub fn dbl(x: Field) -> Field { x + x }
}

use utils::{inc, dec};
use utils::*;

fn main() {
    inc(1);
    dec(1);
    dbl(2);
}
