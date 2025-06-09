mod foo {
    pub mod bar {
        pub fn a() {}
        pub fn b() {}
    }
    pub fn c() {}
}

use foo::{bar::{a,b}, c};

fn main() {
    a();
    b();
    c();
}
