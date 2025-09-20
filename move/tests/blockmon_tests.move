#[test_only]
module blockmon::blockmon_tests;

use std::string;
use std::unit_test::assert_eq;
use sui::event;
use sui::test_scenario;

use blockmon::blockmon::{
    create_block_mon, record_battle, burn,
    get_object_address, get_hp,
};

const SENDER: address = @0x222;

#[test]
fun create_record_battle_burn_and_events() {
    let mut scenario = test_scenario::begin(SENDER);

    // create
    let mon = {
        let ctx = test_scenario::ctx(&mut scenario);
        create_block_mon(
            string::utf8(b"mon-001"),
            string::utf8(b"Bulba"),
            100, 10, 10, 10, 10, 10, 10,
            string::utf8(b"Tackle"),
            string::utf8(b"Basic attack"),
            ctx,
        )
    };
    assert_eq!(event::num_events(), 1);
    let _mon_addr = get_object_address(&mon);
    // minted event count by type
    let minted = event::events_by_type<blockmon::blockmon::Minted>();
    assert_eq!(vector::length(&minted), 1);

    // basic getter sanity
    assert!(get_hp(&mon) == 100);

    // record battle (event)
    {
        let ctx = test_scenario::ctx(&mut scenario);
        record_battle(&mon, string::utf8(b"Slime"), true, 7, 0, ctx);
    };
    assert_eq!(event::num_events(), 2);
    let battles = event::events_by_type<blockmon::blockmon::BattleRecorded>();
    assert_eq!(vector::length(&battles), 1);

    // burn (event)
    {
        let ctx = test_scenario::ctx(&mut scenario);
        burn(mon, ctx);
    };
    assert_eq!(event::num_events(), 3);
    let burned = event::events_by_type<blockmon::blockmon::Burned>();
    assert_eq!(vector::length(&burned), 1);

    // end tx, verify effects counted events and event buffer cleared
    let effects = test_scenario::next_tx(&mut scenario, SENDER);
    assert_eq!(test_scenario::num_user_events(&effects), 3);
    assert_eq!(event::num_events(), 0);

    test_scenario::end(scenario);
}


