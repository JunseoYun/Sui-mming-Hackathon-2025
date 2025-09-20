/// Module: blockmon
module blockmon::blockmon;

use std::string::String;
// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

// Part 1: These imports are provided by default
use sui::event;

public struct BlockMon has key, store {
    id: UID,
    mon_id: String,
    name: String,
    base: MonStat,
    skill: MonSkill,
}

public struct MonStat has store, drop {
  hp: u64,
  str: u64,
  dex: u64,
  con: u64,
  int: u64,
  wis: u64,
  cha: u64,
}

public struct MonSkill has store, drop {
  name: String,
  description: String,
}

public struct Minted has copy, drop, store {
  owner_address: address,
  mon_id: address,
}

public struct BattleRecorded has copy, drop, store {
  player_address: address,
  mon_id: address,
  opponent: String,
  won: bool,
  player_remaining_hp: u64,
  opponent_remaining_hp: u64,
}

public struct Burned has copy, drop, store {
  owner_address: address,
  mon_id: address,
}

const E_ARG_LENGTH_MISMATCH: u64 = 100;

public fun create_block_mon(
  mon_id: String,
  name: String,
  hp: u64,
  str: u64,
  dex: u64,
  con: u64,
  int: u64,
  wis: u64,
  cha: u64,
  skill_name: String,
  skill_description: String,
  ctx: &mut TxContext,
): BlockMon {
  let skill = MonSkill {
    name: skill_name,
    description: skill_description,
  };
  let base = MonStat {
    hp: hp,
    str: str,
    dex: dex,
    con: con,
    int: int,
    wis: wis,
    cha: cha,
  };
  let block_mon = BlockMon {
    id: object::new(ctx),
    mon_id: mon_id,
    name: name,
    base: base,
    skill: skill,
  };
  let owner = tx_context::sender(ctx);
  let mon_addr = object::uid_to_address(&block_mon.id);
  event::emit(Minted { owner_address: owner, mon_id: mon_addr });
  block_mon
}

public fun record_battle(
  mon: &BlockMon,
  opponent: String,
  won: bool,
  player_remaining_hp: u64,
  opponent_remaining_hp: u64,
  ctx: &mut TxContext,
) {
  let player = tx_context::sender(ctx);
  let mon_addr = object::uid_to_address(&mon.id);
  event::emit(BattleRecorded { player_address: player, mon_id: mon_addr, opponent, won, player_remaining_hp, opponent_remaining_hp });
}

// --------- READ (getters) ---------
public fun get_object_address(mon: &BlockMon): address { object::uid_to_address(&mon.id) }
public fun get_mon_id(mon: &BlockMon): &String { &mon.mon_id }
public fun get_name(mon: &BlockMon): &String { &mon.name }
public fun get_base(mon: &BlockMon): &MonStat { &mon.base }
public fun get_skill(mon: &BlockMon): &MonSkill { &mon.skill }

// Individual stat getters (optional convenience)
public fun get_hp(mon: &BlockMon): u64 { mon.base.hp }
public fun get_str(mon: &BlockMon): u64 { mon.base.str }
public fun get_dex(mon: &BlockMon): u64 { mon.base.dex }
public fun get_con(mon: &BlockMon): u64 { mon.base.con }
public fun get_int(mon: &BlockMon): u64 { mon.base.int }
public fun get_wis(mon: &BlockMon): u64 { mon.base.wis }
public fun get_cha(mon: &BlockMon): u64 { mon.base.cha }

// --------- UPDATE (setters) ---------
public fun set_name(mon: &mut BlockMon, name: String) { mon.name = name }
public fun set_mon_id(mon: &mut BlockMon, mon_id: String) { mon.mon_id = mon_id }
public fun set_base(mon: &mut BlockMon, base: MonStat) { mon.base = base }
public fun set_skill(mon: &mut BlockMon, skill: MonSkill) { mon.skill = skill }

public fun set_stats(
  mon: &mut BlockMon,
  hp: u64,
  str: u64,
  dex: u64,
  con: u64,
  int: u64,
  wis: u64,
  cha: u64,
) {
  mon.base = MonStat { hp, str, dex, con, int, wis, cha };
}

// --------- DELETE (burn) ---------
public fun burn(mon: BlockMon, ctx: &mut TxContext) {
  let owner = tx_context::sender(ctx);
  let mon_addr = object::uid_to_address(&mon.id);
  let BlockMon { id, mon_id: _, name: _, base: _, skill: _ } = mon;
  event::emit(Burned { owner_address: owner, mon_id: mon_addr });
  object::delete(id);
}

/// Create many BlockMon in a single entry and immediately transfer each
/// to the transaction sender to avoid large PTB payloads.
public fun create_many_block_mon(
  mon_ids: vector<String>,
  names: vector<String>,
  hps: vector<u64>,
  strs: vector<u64>,
  dexes: vector<u64>,
  cons: vector<u64>,
  ints: vector<u64>,
  wises: vector<u64>,
  chas: vector<u64>,
  skill_names: vector<String>,
  skill_descriptions: vector<String>,
  ctx: &mut TxContext,
): vector<BlockMon> {
  let mut mut_mon_ids = mon_ids;
  let mut mut_names = names;
  let mut mut_hps = hps;
  let mut mut_strs = strs;
  let mut mut_dexes = dexes;
  let mut mut_cons = cons;
  let mut mut_ints = ints;
  let mut mut_wises = wises;
  let mut mut_chas = chas;
  let mut mut_skill_names = skill_names;
  let mut mut_skill_descriptions = skill_descriptions;

  let n = vector::length(&mut_mon_ids);
  assert!(
    n == vector::length(&mut_names)
      && n == vector::length(&mut_hps)
      && n == vector::length(&mut_strs)
      && n == vector::length(&mut_dexes)
      && n == vector::length(&mut_cons)
      && n == vector::length(&mut_ints)
      && n == vector::length(&mut_wises)
      && n == vector::length(&mut_chas)
      && n == vector::length(&mut_skill_names)
      && n == vector::length(&mut_skill_descriptions),
    E_ARG_LENGTH_MISMATCH,
  );

  let mut result: vector<BlockMon> = vector::empty<BlockMon>();
  while (!vector::is_empty(&mut_mon_ids)) {
    // Pop from the end for O(1); order is not guaranteed but stable gas-wise
    let mon_id = vector::pop_back(&mut mut_mon_ids);
    let name = vector::pop_back(&mut mut_names);
    let hp = vector::pop_back(&mut mut_hps);
    let str_v = vector::pop_back(&mut mut_strs);
    let dex = vector::pop_back(&mut mut_dexes);
    let con = vector::pop_back(&mut mut_cons);
    let int_v = vector::pop_back(&mut mut_ints);
    let wis = vector::pop_back(&mut mut_wises);
    let cha = vector::pop_back(&mut mut_chas);
    let skill_name = vector::pop_back(&mut mut_skill_names);
    let skill_description = vector::pop_back(&mut mut_skill_descriptions);

    let bm = create_block_mon(
      mon_id,
      name,
      hp,
      str_v,
      dex,
      con,
      int_v,
      wis,
      cha,
      skill_name,
      skill_description,
      ctx,
    );
    vector::push_back(&mut result, bm);
  };
  result
}
