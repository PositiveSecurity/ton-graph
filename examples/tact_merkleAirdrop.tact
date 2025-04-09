import "@stdlib/deploy";
// message
message Claim {
    recipient: Address;
    amount: Int;
    proofs: map<Int, Int>;
    proofLength: Int;
}
message Stake {
    lockPeriod: Int;
}
message Withdraw {
    recipient: Address;
    amount: Int;
}

contract MerkleAirdrop {
    // state
    merkleRoot: Int;
    claimedMap: map<Address, Bool>;
    positions: map<Address, Int>;
    unlockTime: map<Address, Int>;
    reserve: Int;
    merkleTreeHeight: Int;
    // init setup
    init(){
        self.reserve = 10000;
        self.merkleTreeHeight = 4;
        //whitelist
        let seedBuilder: StringBuilder = beginString();
        seedBuilder.append("EQDaypwc_Jr8by-alaK4mntRu35_EhlMz60AOeSJRawcrNM0");
        seedBuilder.append("614");
        let leaf: Int = sha256(seedBuilder.toString());
        let nodes: map<Int, Int> = emptyMap();
        nodes.set(0, 3276839473039418448246626220846442448842246862622804046064860066224006800084);
        nodes.set(1, 47247882347545520880400048062206626448448620004800866600228646060442282848824);
        nodes.set(2, 17983245880419772846408460262448682866408688862244064640442682866626888428288);
        let i: Int = 0;
        while (i < 3) {
            let node: Int? = nodes.get(i);
            let temp1 = leaf - node!!;
            let temp2 = node!! - leaf;
            leaf = leaf > node!! ? sha256(temp1.toString()) : sha256(temp2.toString());
            i = i + 1;
        }
        self.merkleRoot = leaf;
    }

    // solve
    get fun is_solved(): Bool {
        return self.reserve == 0;
    }

    receive(msg: Stake){
        let ctx = context();
        require(ctx.value > 0 && (ctx.value / 1000000000) < self.reserve, "Insuffient amount");
        let unlocktime: Int? = self.unlockTime.get(sender());
        require(unlocktime != null, "Already staked");
        let reward: Int = ctx.value / 1000000000;
        if (msg.lockPeriod == 1) {
            reward = (reward * 1) / 10000;
        }
        if (msg.lockPeriod == 2) {
            reward = (reward * 3) / 10000;
        }
        if (msg.lockPeriod == 100) {
            reward = (reward * 500) / 10000;
        } else {
            throw(0xffff);
        }
        let position: Int? = self.positions.get(sender());
        self.reserve = self.reserve - (ctx.value / 1000000000);
        if (position == null) {
            self.positions.set(sender(), (ctx.value / 1000000000) + reward);
        } else {
            self.positions.set(sender(), ((ctx.value / 1000000000) + position!!) + reward);
        }
        self.unlockTime.set(sender(), (msg.lockPeriod * 3600) + now());
    }

    // receive
    receive(msg: Claim){
        require(!self.isClaimed(msg.recipient), "Already claimed!");
        require(msg.amount <= self.reserve, "Invalid amount!");
        let seedBuilder: StringBuilder = beginString();
        seedBuilder.append(msg.recipient.toString());
        seedBuilder.append(msg.amount.toString());
        let leaf: Int = sha256(seedBuilder.toString());
        require(self.verify(leaf, msg.proofs, msg.proofLength), "Invalid account or amount");
        self.claimedMap.set(msg.recipient, true);
        let position: Int? = self.positions.get(msg.recipient);
        self.reserve = self.reserve - msg.amount;
        if (position == null) {
            self.positions.set(msg.recipient, msg.amount);
        } else {
            self.positions.set(msg.recipient, msg.amount + position!!);
        }
    }

    receive(msg: Withdraw){
        require(msg.amount > 0, "Invalid amount");
        let position: Int? = self.positions.get(sender());
        require(position != null, "Invalid position");
        require(position!! >= msg.amount, "Insufficient balance");
        self.positions.set(sender(), position!! - msg.amount);
        send(SendParameters{to: msg.recipient, value: msg.amount});
    }

    // get functions
    get fun get_merkleroot(): Int {
        return self.merkleRoot;
    }

    get fun reserve(): Int {
        return self.reserve;
    }

    // private functions

    fun isClaimed(address: Address): Bool {
        let gotAddressClaimed: Bool? = self.claimedMap.get(address);
        if (gotAddressClaimed != null) {
            return self.claimedMap.get(address)!!;
        } else {
            return false;
        }
    }

    fun verify(leaf: Int, proofs: map<Int, Int>, proofLength: Int): Bool {
        let i: Int = 0;
        require((proofLength + 1) == self.merkleTreeHeight, "Invalid proof length");
        while (i < proofLength) {
            let proof: Int? = proofs.get(i);
            if (proof == null) {
                return false;
            }
            let temp1 = leaf - proof!!;
            let temp2 = proof!! - leaf;
            leaf = leaf > proof!! ? sha256(temp1.toString()) : sha256(temp2.toString());
            i = i + 1;
        }
        return leaf == self.merkleRoot;
    }
}

contract Exploit with Deployable {
    init(){}

    get fun sha256(x: Int): Int {
        return sha256(x.toString());
    }

    get fun myLeaf(recipient: Address, amount: Int): Int {
        let seedBuilder: StringBuilder = beginString();
        seedBuilder.append(recipient.toString());
        seedBuilder.append(amount.toString());
        let leaf: Int = sha256(seedBuilder.toString());
        return leaf;
    }
}