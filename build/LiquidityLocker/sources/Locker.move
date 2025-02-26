module LiquidityLocker::Locker {
    use std::signer;
    use std::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    struct LockedTokens has key {
        amount: u64,
        unlock_time: u64,
    }

    public entry fun lock_tokens(account: &signer, amount: u64, lock_duration: u64) {
        let now = timestamp::now_seconds();
        let unlock_time = now + lock_duration;

        // Transfer tokens from user to this contract (simplified for testnet)
        coin::transfer<AptosCoin>(account, signer::address_of(account), amount);

        // Store locked token info
        move_to(account, LockedTokens {
            amount,
            unlock_time,
        });
    }

    public entry fun unlock_tokens(account: &signer) acquires LockedTokens {
        let sender = signer::address_of(account);
        let locked = borrow_global_mut<LockedTokens>(sender);
        let now = timestamp::now_seconds();

        assert!(now >= locked.unlock_time, 1); // Error if still locked
        let amount = locked.amount;

        // Transfer tokens back to user
        coin::transfer<AptosCoin>(account, sender, amount);

        // Remove the locked token record
        let LockedTokens { amount: _, unlock_time: _ } = move_from<LockedTokens>(sender);
    }

    public fun get_locked_amount(account: address): u64 acquires LockedTokens {
        let locked = borrow_global<LockedTokens>(account);
        locked.amount
    }
}