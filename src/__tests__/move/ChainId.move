module DiemFramework::ChainId {
    use DiemFramework::CoreAddresses;
    use DiemFramework::DiemTimestamp;
    use Std::Errors;
    use Std::Signer;

    struct ChainId has key {
        id: u8
    }

    const ECHAIN_ID: u64 = 0;

    public fun initialize(dr_account: &signer, id: u8) {
        DiemTimestamp::assert_genesis();
        CoreAddresses::assert_diem_root(dr_account);
        assert(!exists<ChainId>(Signer::address_of(dr_account)), Errors::already_published(ECHAIN_ID));
        move_to(dr_account, ChainId { id })
    }

    public fun get(): u8 acquires ChainId {
        DiemTimestamp::assert_operating();
        borrow_global<ChainId>(@DiemRoot).id
    }
}
