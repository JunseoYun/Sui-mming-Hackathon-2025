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
    // Bag inventory
    create_inventory, add_potion_to_inventory, use_potions_from_inventory,
    get_potion_quantity_in_inventory, E_INSUFFICIENT_POTION_IN_BAG,
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


// ===== Inventory (Bag/Dynamic Fields) Tests =====

const HP: u8 = 1u8;
const SENDER2: address = @0x222;

#[test]
fun inventory_create_add_and_update() {
    let mut scenario = test_scenario::begin(SENDER2);

    let mut inv = {
        let ctx = test_scenario::ctx(&mut scenario);
        create_inventory(ctx)
    };

    // add new entry (HP) quantity 3
    {
        let ctx = test_scenario::ctx(&mut scenario);
        add_potion_to_inventory(&mut inv, HP, 50, 3, string::utf8(b"HP Potion"), ctx);
    };
    assert_eq!(get_potion_quantity_in_inventory(&inv, HP), 3);

    // add again (update existing)
    {
        let ctx = test_scenario::ctx(&mut scenario);
        add_potion_to_inventory(&mut inv, HP, 50, 2, string::utf8(b"HP Potion"), ctx);
    };
    assert_eq!(get_potion_quantity_in_inventory(&inv, HP), 5);

    // consume inventory by transferring to sender to avoid unused value without 'drop'
    sui::transfer::public_transfer(inv, SENDER2);

    test_scenario::end(scenario);
}

#[test]
fun inventory_use_potions_success() {
    let mut scenario = test_scenario::begin(SENDER2);

    let mut inv = {
        let ctx = test_scenario::ctx(&mut scenario);
        create_inventory(ctx)
    };
    {
        let ctx = test_scenario::ctx(&mut scenario);
        add_potion_to_inventory(&mut inv, HP, 50, 3, string::utf8(b"HP Potion"), ctx);
    };
    assert_eq!(get_potion_quantity_in_inventory(&inv, HP), 3);

    {
        let ctx = test_scenario::ctx(&mut scenario);
        use_potions_from_inventory(&mut inv, HP, 2, ctx);
    };
    assert_eq!(get_potion_quantity_in_inventory(&inv, HP), 1);

    // consume inventory by transferring to sender to avoid unused value without 'drop'
    sui::transfer::public_transfer(inv, SENDER2);

    test_scenario::end(scenario);
}

#[test, expected_failure(abort_code = E_INSUFFICIENT_POTION_IN_BAG)]
fun inventory_use_potions_insufficient_should_fail() {
    let mut scenario = test_scenario::begin(SENDER2);

    let mut inv = {
        let ctx = test_scenario::ctx(&mut scenario);
        create_inventory(ctx)
    };
    {
        let ctx = test_scenario::ctx(&mut scenario);
        add_potion_to_inventory(&mut inv, HP, 50, 1, string::utf8(b"HP Potion"), ctx);
    };

    let ctx = test_scenario::ctx(&mut scenario);
    use_potions_from_inventory(&mut inv, HP, 2, ctx);
    abort
}


