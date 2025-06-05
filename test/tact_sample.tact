contract Sample {
    init() {
        foo();
    }

    receive("msg") {
        foo();
    }

    fun foo() {
        bar();
    }

    fun bar() {}
}
