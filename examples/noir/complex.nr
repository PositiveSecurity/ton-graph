// Complex Noir contract demonstrating various features

// Structure representing a voter with a public key and voting weight
struct Voter {
    pub_key: Field,
    weight: i32,
}

// Structure representing a proposal with an identifier and current vote tally
struct Proposal {
    id: u32,
    tally: i32,
}

// Hash two field elements using a dummy hash function
fn hash_pair(a: Field, b: Field) -> Field {
    // In real circuits this would be a cryptographic hash
    return a + b;
}

// Combine two sibling nodes in a Merkle tree
fn merkle_hash(left: Field, right: Field) -> Field {
    return hash_pair(left, right);
}

// Verify a Merkle proof for a leaf against a root
fn verify_merkle(
    leaf: Field,
    path: [Field; 32],
    index_bits: [bool; 32],
    root: Field,
) -> bool {
    let mut hash = leaf;
    for i in 0..32 {
        if index_bits[i] {
            hash = merkle_hash(path[i], hash);
        } else {
            hash = merkle_hash(hash, path[i]);
        }
    }
    return hash == root;
}

// Update a proposal's tally with a delta
fn update_proposal(mut p: Proposal, delta: i32) -> Proposal {
    p.tally = p.tally + delta;
    return p;
}

// Record a vote if the voter is part of the Merkle tree
fn record_vote(v: Voter, mut p: Proposal, root: Field, path: [Field; 32], index_bits: [bool; 32]) -> Proposal {
    if verify_merkle(v.pub_key, path, index_bits, root) {
        p = update_proposal(p, v.weight);
    }
    return p;
}

// Aggregate vote tallies from multiple proposals
fn aggregate_votes(proposals: [Proposal; 10]) -> i32 {
    let mut total = 0;
    for i in 0..10 {
        total = total + proposals[i].tally;
    }
    return total;
}

// Check if the total votes exceed a threshold
fn has_majority(total: i32, threshold: i32) -> bool {
    return total >= threshold;
}

// Entry point demonstrating use of the above functions
fn main(
    pub_key: Field,
    weight: i32,
    root: Field,
    path: [Field; 32],
    index_bits: [bool; 32],
    mut prop: Proposal,
    other_props: [Proposal; 9],
) {
    let voter = Voter { pub_key, weight };
    prop = record_vote(voter, prop, root, path, index_bits);

    let mut proposals: [Proposal; 10] = [prop] + other_props;
    let total = aggregate_votes(proposals);
    assert(has_majority(total, 100));
}

