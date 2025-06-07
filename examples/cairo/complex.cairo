%lang starknet

@storage_var
func counter() -> (res: felt) {
}

@event
func Increment(by: felt, new_counter: felt) {}

@external
func increment{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(amount: felt) {
    let (current) = counter.read();
    let new_val = current + amount;
    counter.write(new_val);
    Increment.emit(amount, new_val);
    return ();
}

@view
func get_counter{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (res: felt) {
    let (current) = counter.read();
    return (res=current);
}

@external
func reset{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() {
    counter.write(0);
    return ();
}
