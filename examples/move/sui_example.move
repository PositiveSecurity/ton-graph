// Sui sample contract creating swords
module my_first_package::example {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct Sword has key, store {
        id: UID,
        magic: u64,
        strength: u64,
    }

    public struct Forge has key {
        id: UID,
        swords_created: u64,
    }

    fun init(ctx: &mut TxContext) {
        let admin = Forge {
            id: object::new(ctx),
            swords_created: 0,
        };
        transfer::transfer(admin, ctx.sender());
    }

    public fun sword_create(magic: u64, strength: u64, ctx: &mut TxContext): Sword {
        Sword {
            id: object::new(ctx),
            magic,
            strength,
        }
    }
}
