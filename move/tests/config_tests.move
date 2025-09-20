#[test_only]
module blockmon::config_tests;

use sui::test_scenario;

use blockmon::config::{
    Config, create_and_share_for_testing, set_permissionless,
    add_minter, remove_minter, add_store_operator, remove_store_operator,
    is_permissionless, can_mint, can_use_store,
    E_NOT_ADMIN,
};

const ADMIN: address = @0x333;
const USER: address = @0x444;

#[test]
fun init_and_toggle_permissionless() {
    let mut scenario = test_scenario::begin(ADMIN);
    // init shared config
    let ctx = test_scenario::ctx(&mut scenario);
    create_and_share_for_testing(ctx);
    // end tx so shared object is in inventory
    test_scenario::next_tx(&mut scenario, ADMIN);

    // take shared Config and toggle
    let mut cfg = test_scenario::take_shared<Config>(&scenario);
    assert!(is_permissionless(&cfg));
    let ctx = test_scenario::ctx(&mut scenario);
    set_permissionless(&mut cfg, false, ctx);
    assert!(!is_permissionless(&cfg));
    // return shared
    test_scenario::return_shared(cfg);
    test_scenario::end(scenario);
}

#[test]
fun allowlists_and_checks() {
    let mut scenario = test_scenario::begin(ADMIN);
    let ctx = test_scenario::ctx(&mut scenario);
    create_and_share_for_testing(ctx);
    test_scenario::next_tx(&mut scenario, ADMIN);

    // disable permissionless and set allowlists
    let mut cfg = test_scenario::take_shared<Config>(&scenario);
    let ctx = test_scenario::ctx(&mut scenario);
    set_permissionless(&mut cfg, false, ctx);
    let ctx = test_scenario::ctx(&mut scenario);
    add_minter(&mut cfg, USER, ctx);
    let ctx = test_scenario::ctx(&mut scenario);
    add_store_operator(&mut cfg, USER, ctx);
    assert!(!is_permissionless(&cfg));
    assert!(can_mint(&cfg, USER));
    assert!(can_use_store(&cfg, USER));
    // remove and verify
    let ctx = test_scenario::ctx(&mut scenario);
    remove_minter(&mut cfg, USER, ctx);
    let ctx = test_scenario::ctx(&mut scenario);
    remove_store_operator(&mut cfg, USER, ctx);
    assert!(!can_mint(&cfg, USER));
    assert!(!can_use_store(&cfg, USER));
    test_scenario::return_shared(cfg);
    test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_NOT_ADMIN)]
fun only_admin_can_toggle() {
    // init by ADMIN
    let mut scenario = test_scenario::begin(ADMIN);
    let ctx = test_scenario::ctx(&mut scenario);
    create_and_share_for_testing(ctx);
    test_scenario::next_tx(&mut scenario, ADMIN);

    // USER tries to toggle
    test_scenario::next_tx(&mut scenario, USER);
    let mut cfg = test_scenario::take_shared<Config>(&scenario);
    let ctx = test_scenario::ctx(&mut scenario);
    set_permissionless(&mut cfg, true, ctx);
    // unreachable
    test_scenario::return_shared(cfg);
    abort
}
