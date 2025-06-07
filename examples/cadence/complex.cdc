pub contract ExampleToken {
    pub var totalSupply: UFix64

    pub event TokensMinted(amount: UFix64, recipient: Address)
    pub event TokensBurned(amount: UFix64, from: Address)

    pub resource Vault {
        pub var balance: UFix64

        init(balance: UFix64) {
            self.balance = balance
        }

        pub fun deposit(from: @Vault) {
            self.balance = self.balance + from.balance
            destroy from
        }

        pub fun withdraw(amount: UFix64): @Vault {
            pre {
                amount <= self.balance: "Insufficient balance"
            }
            self.balance = self.balance - amount
            return <-create Vault(balance: amount)
        }
    }

    pub fun createEmptyVault(): @Vault {
        return <-create Vault(balance: 0.0)
    }

    init() {
        self.totalSupply = 0.0
    }

    pub fun mintTokens(amount: UFix64, recipient: &AnyResource{Receiver}) {
        self.totalSupply = self.totalSupply + amount
        recipient.deposit(from: <-create Vault(balance: amount))
        emit TokensMinted(amount: amount, recipient: recipient.owner!.address)
    }
}
