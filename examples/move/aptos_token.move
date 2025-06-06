// Simplified snippet from the Aptos token module
module aptos_token::token {
    use std::error;
    use std::option::{Self, Option};
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    public entry fun create_collection_script(
        account: &signer,
        name: String,
        description: String,
        uri: String,
    ) {
        // simplified
        create_collection(account, name, description, uri);
    }

    public fun create_collection(
        account: &signer,
        name: String,
        description: String,
        uri: String,
    ) {
        vector::length(&vector[]);
    }
}
