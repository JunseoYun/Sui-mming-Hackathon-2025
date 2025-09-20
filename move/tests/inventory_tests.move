#[test_only]
module blockmon::inventory_tests;

use std::string;
use std::unit_test::assert_eq;
use sui::event;
use sui::test_scenario;

use blockmon::inventory::{
    create_bm_token, add_bm_tokens, subtract_bm_tokens,
    get_bm_token_amount, burn_bm_token,
    create_potion, add_potions, use_potion,
    get_potion_quantity, burn_potion,
    E_INSUFFICIENT_BM_BALANCE, E_INSUFFICIENT_POTION_QUANTITY,
};

const SENDER: address = @0x111;

#[test]
fun bm_token_mint_update_burn_and_events() {
    let mut scenario = test_scenario::begin(SENDER);

    // mint
    let mut bm = {
        let ctx = test_scenario::ctx(&mut scenario);
        create_bm_token(100, string::utf8(b"BM"), ctx)
    };
    // check event count (Minted)
    assert_eq!(event::num_events(), 1);

    // add
    {
        let ctx = test_scenario::ctx(&mut scenario);
        add_bm_tokens(&mut bm, 50, ctx);
    };
    assert_eq!(get_bm_token_amount(&bm), 150);

    // subtract
    {
        let ctx = test_scenario::ctx(&mut scenario);
        subtract_bm_tokens(&mut bm, 20, ctx);
    };
    assert_eq!(get_bm_token_amount(&bm), 130);

    // burn
    {
        let ctx = test_scenario::ctx(&mut scenario);
        burn_bm_token(bm, ctx);
    };

    // 1 minted + 2 updated + 1 burned = 4 events in this tx sequence
    // We are still in the same tx; event buffer holds current tx events only
    assert_eq!(event::num_events(), 4);

    // finalize tx and verify effects counted user events
    let effects = test_scenario::next_tx(&mut scenario, SENDER);
    assert_eq!(test_scenario::num_user_events(&effects), 4);
    assert_eq!(event::num_events(), 0);

    test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_INSUFFICIENT_BM_BALANCE)]
fun bm_token_subtract_insufficient_balance_fails() {
    let mut scenario = test_scenario::begin(SENDER);
    let mut bm = {
        let ctx = test_scenario::ctx(&mut scenario);
        create_bm_token(10, string::utf8(b"BM"), ctx)
    };
    let ctx = test_scenario::ctx(&mut scenario);
    subtract_bm_tokens(&mut bm, 11, ctx);
    abort
}

#[test]
fun potion_mint_update_use_burn_and_events() {
    let mut scenario = test_scenario::begin(SENDER);

    let mut potion = {
        let ctx = test_scenario::ctx(&mut scenario);
        create_potion(string::utf8(b"HP"), 50, 3, string::utf8(b"Heal"), ctx)
    };
    assert_eq!(event::num_events(), 1);

    // add quantity
    {
        let ctx = test_scenario::ctx(&mut scenario);
        add_potions(&mut potion, 2, ctx);
    };
    assert_eq!(get_potion_quantity(&potion), 5);

    // use potion (decrease)
    {
        let ctx = test_scenario::ctx(&mut scenario);
        use_potion(&mut potion, 2, ctx);
    };
    assert_eq!(get_potion_quantity(&potion), 3);

    // burn potion
    {
        let ctx = test_scenario::ctx(&mut scenario);
        burn_potion(potion, ctx);
    };

    // 1 minted + 1 updated + 1 used + 1 burned = 4 events
    assert_eq!(event::num_events(), 4);
    let effects = test_scenario::next_tx(&mut scenario, SENDER);
    assert_eq!(test_scenario::num_user_events(&effects), 4);
    assert_eq!(event::num_events(), 0);

    test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_INSUFFICIENT_POTION_QUANTITY)]
fun potion_use_insufficient_quantity_fails() {
    let mut scenario = test_scenario::begin(SENDER);
    let mut potion = {
        let ctx = test_scenario::ctx(&mut scenario);
        create_potion(string::utf8(b"HP"), 50, 1, string::utf8(b"Heal"), ctx)
    };
    let ctx = test_scenario::ctx(&mut scenario);
    use_potion(&mut potion, 2, ctx);
    abort
}


