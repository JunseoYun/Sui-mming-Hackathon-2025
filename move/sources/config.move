/// Module: config (minimal access control scaffolding)
module blockmon::config;

/// Shared configuration object to toggle permissionless mode
/// and maintain simple allowlists for future locking.
public struct Config has key {
    id: UID,
    /// If true, mint/store operations are open to everyone (default).
    is_permissionless: bool,
    /// Admin address captured at init. Admin can toggle and manage allowlists.
    admin: address,
    /// Addresses allowed to mint when permissionless is disabled.
    minters: vector<address>,
    /// Addresses allowed to operate the store when permissionless is disabled.
    store_operators: vector<address>,
}

const E_NOT_ADMIN: u64 = 1;

/// Initialize and share the Config object.
/// - Admin is set to the tx sender
/// - is_permissionless defaults to true
fun init(ctx: &mut TxContext) {
    let cfg = Config {
        id: object::new(ctx),
        is_permissionless: true,
        admin: tx_context::sender(ctx),
        minters: vector::empty<address>(),
        store_operators: vector::empty<address>(),
    };
    transfer::share_object(cfg);
}

/// Admin-only: toggle permissionless mode
public fun set_permissionless(cfg: &mut Config, value: bool, ctx: &mut TxContext) {
    assert!(tx_context::sender(ctx) == cfg.admin, E_NOT_ADMIN);
    cfg.is_permissionless = value;
}

/// Admin-only: add an address to minters allowlist
public fun add_minter(cfg: &mut Config, account: address, ctx: &mut TxContext) {
    assert!(tx_context::sender(ctx) == cfg.admin, E_NOT_ADMIN);
    if (!contains(&cfg.minters, account)) {
        vector::push_back(&mut cfg.minters, account);
    };
}

/// Admin-only: remove an address from minters allowlist
public fun remove_minter(cfg: &mut Config, account: address, ctx: &mut TxContext) {
    assert!(tx_context::sender(ctx) == cfg.admin, E_NOT_ADMIN);
    remove_address(&mut cfg.minters, account);
}

/// Admin-only: add an address to store_operators allowlist
public fun add_store_operator(cfg: &mut Config, account: address, ctx: &mut TxContext) {
    assert!(tx_context::sender(ctx) == cfg.admin, E_NOT_ADMIN);
    if (!contains(&cfg.store_operators, account)) {
        vector::push_back(&mut cfg.store_operators, account);
    };
}

/// Admin-only: remove an address from store_operators allowlist
public fun remove_store_operator(cfg: &mut Config, account: address, ctx: &mut TxContext) {
    assert!(tx_context::sender(ctx) == cfg.admin, E_NOT_ADMIN);
    remove_address(&mut cfg.store_operators, account);
}

/// Read-only helpers (can be used by other modules later)
public fun is_permissionless(cfg: &Config): bool { cfg.is_permissionless }

public fun can_mint(cfg: &Config, sender: address): bool {
    cfg.is_permissionless || contains(&cfg.minters, sender)
}

public fun can_use_store(cfg: &Config, sender: address): bool {
    cfg.is_permissionless || contains(&cfg.store_operators, sender)
}

/// Internal: vector contains helper
fun contains(list: &vector<address>, account: address): bool {
    let len = vector::length<address>(list);
    let mut i = 0u64;
    while (i < len) {
        let cur = *vector::borrow<address>(list, i);
        if (cur == account) { return true };
        i = i + 1;
    };
    false
}

/// Internal: remove address if present
fun remove_address(list: &mut vector<address>, account: address) {
    let len = vector::length<address>(list);
    let mut i = 0u64;
    while (i < len) {
        let cur = *vector::borrow<address>(list, i);
        if (cur == account) {
            // swap_remove to keep it O(1)
            let _ = vector::swap_remove<address>(list, i);
            return
        };
        i = i + 1;
    };
}


