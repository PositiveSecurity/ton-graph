import "@stdlib/deploy";

struct Proposal {
    id: Int;
    votes: map<Address, Int>;
    totalVotes: Int;
}

message CreateProposal {
    id: Int;
}

message Vote {
    proposalId: Int;
    amount: Int;
}

contract Voting {
    proposals: map<Int, Proposal>;

    init() {
        self.proposals = map();
    }

    receive(msg: CreateProposal) {
        let prop = Proposal(id: msg.id, votes: map(), totalVotes: 0);
        self.proposals[msg.id] = prop;
    }

    receive(msg: Vote) {
        let prop = self.proposals[msg.proposalId];
        let current = prop.votes[msg.sender] ?? 0;
        prop.votes[msg.sender] = current + msg.amount;
        prop.totalVotes = prop.totalVotes + msg.amount;
        self.proposals[msg.proposalId] = prop;
    }

    get totalVotes(id: Int): Int {
        return self.proposals[id].totalVotes;
    }
}
