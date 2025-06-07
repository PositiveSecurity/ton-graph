function bar() -> result {
  result := 1
}

function foo() -> result {
  result := bar()
}
