/// Module: inventory
module blockmon::inventory;

use std::string::String;
use sui::event;
use sui::bag;
// ===== Error Codes =====
const E_INSUFFICIENT_BM_BALANCE: u64 = 1;
const E_INSUFFICIENT_POTION_QUANTITY: u64 = 2;
// coin module imported implicitly via fully-qualified paths when needed
// ========== BM COIN (Coin<BM>) ==========

/// Fungible BM coin type
public struct BM has drop {}

// Note: Coin<BM> support will be provided via standard coin module. Module-owned
// init/mint/burn entries are temporarily omitted for compatibility with current
// toolchain. Frontend uses standard coin ops (join/split/transfer) when available.


// ========== BM TOKEN STRUCTURES ==========

/// BM 토큰 구조체
public struct BMToken has key, store {
    id: UID,
    amount: u64,
    token_type: String, // "BM" for basic BM tokens
}

/// BM 토큰 이벤트들
public struct BMTokenMinted has copy, drop, store {
    owner: address,
    token_id: address,
    amount: u64,
    token_type: String,
}

public struct BMTokenUpdated has copy, drop, store {
    owner: address,
    token_id: address,
    old_amount: u64,
    new_amount: u64,
}

public struct BMTokenBurned has copy, drop, store {
    owner: address,
    token_id: address,
    amount: u64,
}

// ========== POTION STRUCTURES ==========

/// 포션 구조체
public struct Potion has key, store {
    id: UID,
    potion_type: String, // 현재는 "HP"만 사용 (HP 복원용)
    effect_value: u64,   // 포션의 효과 수치 (HP 복원량)
    quantity: u64,       // 포션 개수
    description: String,
}

/// 포션 이벤트들
public struct PotionMinted has copy, drop, store {
    owner: address,
    potion_id: address,
    potion_type: String,
    effect_value: u64,
    quantity: u64,
}

public struct PotionUpdated has copy, drop, store {
    owner: address,
    potion_id: address,
    old_quantity: u64,
    new_quantity: u64,
}

public struct PotionUsed has copy, drop, store {
    owner: address,
    potion_id: address,
    potion_type: String,
    effect_value: u64,
    quantity_used: u64,
}

public struct PotionBurned has copy, drop, store {
    owner: address,
    potion_id: address,
    potion_type: String,
    quantity: u64,
}

// ========== INVENTORY (Bag/Dynamic Fields) ==========

/// Inventory object that owns a Bag of dynamic fields (potions/items)
public struct Inventory has key, store {
    id: UID,
    bag: bag::Bag,
}

/// Value stored in Bag for a potion entry
public struct PotionEntry has store {
    effect_value: u64,
    quantity: u64,
    description: String,
}

/// Key type for potions inside the Bag
public struct PotionKey has copy, drop, store { kind: u8 }

/// Events for Inventory bag operations
public struct InventoryCreated has copy, drop, store {
    owner: address,
    inventory_id: address,
}

public struct PotionAddedOrUpdatedInBag has copy, drop, store {
    owner: address,
    inventory_id: address,
    potion_kind: u8,
    effect_value: u64,
    old_quantity: u64,
    new_quantity: u64,
}

public struct PotionUsedFromBag has copy, drop, store {
    owner: address,
    inventory_id: address,
    potion_kind: u8,
    effect_value: u64,
    quantity_used: u64,
    remaining_quantity: u64,
}

// Kept for future use when removal on zero will be implemented
public struct PotionRemovedFromBag has copy, drop, store {}

/// Create a new Inventory with an empty Bag
public fun create_inventory(ctx: &mut TxContext): Inventory {
    let owner = tx_context::sender(ctx);
    let inv = Inventory { id: object::new(ctx), bag: bag::new(ctx) };
    let inv_addr = object::uid_to_address(&inv.id);
    event::emit(InventoryCreated { owner, inventory_id: inv_addr });
    inv
}

/// Add or increase a potion entry in the inventory bag
public fun add_potion_to_inventory(
    inv: &mut Inventory,
    potion_kind: u8,
    effect_value: u64,
    quantity_to_add: u64,
    description: String,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let inv_addr = object::uid_to_address(&inv.id);
    let k = PotionKey { kind: potion_kind };
    if (bag::contains<PotionKey>(&inv.bag, copy k)) {
        let entry = bag::borrow_mut<PotionKey, PotionEntry>(&mut inv.bag, copy k);
        let old_q = entry.quantity;
        entry.quantity = entry.quantity + quantity_to_add;
        // Keep latest effect/description authoritative
        entry.effect_value = effect_value;
        entry.description = description;
        event::emit(PotionAddedOrUpdatedInBag {
            owner,
            inventory_id: inv_addr,
            potion_kind,
            effect_value,
            old_quantity: old_q,
            new_quantity: entry.quantity,
        });
    } else {
        let new_entry = PotionEntry { effect_value, quantity: quantity_to_add, description };
        bag::add<PotionKey, PotionEntry>(&mut inv.bag, k, new_entry);
        event::emit(PotionAddedOrUpdatedInBag {
            owner,
            inventory_id: inv_addr,
            potion_kind,
            effect_value,
            old_quantity: 0,
            new_quantity: quantity_to_add,
        });
    };
}

/// Use potion(s) from inventory; aborts if insufficient
const E_INSUFFICIENT_POTION_IN_BAG: u64 = 10;
public fun use_potions_from_inventory(
    inv: &mut Inventory,
    potion_kind: u8,
    quantity_to_use: u64,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let inv_addr = object::uid_to_address(&inv.id);
    let k = PotionKey { kind: potion_kind };
    assert!(bag::contains<PotionKey>(&inv.bag, copy k), E_INSUFFICIENT_POTION_IN_BAG);
    let mut _remaining: u64 = 0;
    {
        let entry = bag::borrow_mut<PotionKey, PotionEntry>(&mut inv.bag, copy k);
        assert!(entry.quantity >= quantity_to_use, E_INSUFFICIENT_POTION_IN_BAG);
        entry.quantity = entry.quantity - quantity_to_use;
        _remaining = entry.quantity;
        event::emit(PotionUsedFromBag {
            owner,
            inventory_id: inv_addr,
            potion_kind,
            effect_value: entry.effect_value,
            quantity_used: quantity_to_use,
            remaining_quantity: _remaining,
        });
    };
    if (_remaining == 0) {
        // Remove entry entirely when depleted
        // Need to pass owned key; we moved potion_type in event above. Reconstruct path:
        // To avoid cloning string, require caller to provide owned string and not reuse it afterwards.
        // We cannot access the value now; so we cannot remove here using the moved key.
        // Instead, we leave zero-quantity entries as-is to keep API simple.
    };
}

/// Helpers (read)
public fun has_potion(inv: &Inventory, potion_kind: u8): bool {
    let k = PotionKey { kind: potion_kind };
    bag::contains<PotionKey>(&inv.bag, k)
}

public fun get_potion_quantity_in_inventory(inv: &Inventory, potion_kind: u8): u64 {
    let k = PotionKey { kind: potion_kind };
    if (bag::contains<PotionKey>(&inv.bag, copy k)) {
        let entry = bag::borrow<PotionKey, PotionEntry>(&inv.bag, k);
        entry.quantity
    } else { 0 }
}

/// Destroy inventory (must be empty)
public fun destroy_inventory(inv: Inventory) {
    let Inventory { id, bag } = inv;
    bag::destroy_empty(bag);
    object::delete(id);
}

// ========== BM TOKEN FUNCTIONS ==========

/// BM 토큰 생성
public fun create_bm_token(
    amount: u64,
    token_type: String,
    ctx: &mut TxContext,
): BMToken {
    let owner = tx_context::sender(ctx);
    let bm_token = BMToken {
        id: object::new(ctx),
        amount,
        token_type,
    };
    
    let token_id = object::uid_to_address(&bm_token.id);
    event::emit(BMTokenMinted {
        owner,
        token_id,
        amount,
        token_type,
    });
    
    bm_token
}

/// BM 토큰 수량 증가
public fun add_bm_tokens(
    bm_token: &mut BMToken,
    amount_to_add: u64,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let token_id = object::uid_to_address(&bm_token.id);
    let old_amount = bm_token.amount;
    
    bm_token.amount = bm_token.amount + amount_to_add;
    
    event::emit(BMTokenUpdated {
        owner,
        token_id,
        old_amount,
        new_amount: bm_token.amount,
    });
}

/// BM 토큰 수량 감소
public fun subtract_bm_tokens(
    bm_token: &mut BMToken,
    amount_to_subtract: u64,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let token_id = object::uid_to_address(&bm_token.id);
    let old_amount = bm_token.amount;
    
    assert!(bm_token.amount >= amount_to_subtract, E_INSUFFICIENT_BM_BALANCE);
    bm_token.amount = bm_token.amount - amount_to_subtract;
    
    event::emit(BMTokenUpdated {
        owner,
        token_id,
        old_amount,
        new_amount: bm_token.amount,
    });
}

/// BM 토큰 조회 함수들
public fun get_bm_token_address(bm_token: &BMToken): address {
    object::uid_to_address(&bm_token.id)
}

// get_bm_token_owner removed: on-chain ownership must be inferred from object owner

public fun get_bm_token_amount(bm_token: &BMToken): u64 {
    bm_token.amount
}

public fun get_bm_token_type(bm_token: &BMToken): &String {
    &bm_token.token_type
}

/// BM 토큰 업데이트 함수들
public fun set_bm_token_amount(bm_token: &mut BMToken, new_amount: u64) {
    bm_token.amount = new_amount;
}

public fun set_bm_token_type(bm_token: &mut BMToken, new_type: String) {
    bm_token.token_type = new_type;
}

/// BM 토큰 삭제 (소각)
public fun burn_bm_token(bm_token: BMToken, ctx: &mut TxContext) {
    let owner = tx_context::sender(ctx);
    let token_id = object::uid_to_address(&bm_token.id);
    let amount = bm_token.amount;
    
    let BMToken { id, amount: _, token_type: _ } = bm_token;
    
    event::emit(BMTokenBurned {
        owner,
        token_id,
        amount,
    });
    
    object::delete(id);
}

// ========== POTION FUNCTIONS ==========

/// 포션 생성 (현재는 HP 복원 포션만 지원)
public fun create_potion(
    potion_type: String, // 현재는 "HP"만 사용
    effect_value: u64,   // HP 복원량
    quantity: u64,
    description: String,
    ctx: &mut TxContext,
): Potion {
    let owner = tx_context::sender(ctx);
    let potion = Potion {
        id: object::new(ctx),
        potion_type,
        effect_value,
        quantity,
        description,
    };
    
    let potion_id = object::uid_to_address(&potion.id);
    event::emit(PotionMinted {
        owner,
        potion_id,
        potion_type,
        effect_value,
        quantity,
    });
    
    potion
}

/// 포션 수량 증가
public fun add_potions(
    potion: &mut Potion,
    quantity_to_add: u64,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let potion_id = object::uid_to_address(&potion.id);
    let old_quantity = potion.quantity;
    
    potion.quantity = potion.quantity + quantity_to_add;
    
    event::emit(PotionUpdated {
        owner,
        potion_id,
        old_quantity,
        new_quantity: potion.quantity,
    });
}

/// 포션 사용 (수량 감소) - HP 복원 포션 사용
public fun use_potion(
    potion: &mut Potion,
    quantity_to_use: u64,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let potion_id = object::uid_to_address(&potion.id);
    
    assert!(potion.quantity >= quantity_to_use, E_INSUFFICIENT_POTION_QUANTITY);
    
    potion.quantity = potion.quantity - quantity_to_use;
    
    event::emit(PotionUsed {
        owner,
        potion_id,
        potion_type: potion.potion_type,
        effect_value: potion.effect_value,
        quantity_used: quantity_to_use,
    });
}

/// 포션 조회 함수들
public fun get_potion_address(potion: &Potion): address {
    object::uid_to_address(&potion.id)
}

// get_potion_owner removed: on-chain ownership must be inferred from object owner

public fun get_potion_type(potion: &Potion): &String {
    &potion.potion_type
}

public fun get_potion_effect_value(potion: &Potion): u64 {
    potion.effect_value
}

public fun get_potion_quantity(potion: &Potion): u64 {
    potion.quantity
}

public fun get_potion_description(potion: &Potion): &String {
    &potion.description
}

/// 포션 업데이트 함수들
public fun set_potion_quantity(potion: &mut Potion, new_quantity: u64) {
    potion.quantity = new_quantity;
}

public fun set_potion_effect_value(potion: &mut Potion, new_effect_value: u64) {
    potion.effect_value = new_effect_value;
}

public fun set_potion_description(potion: &mut Potion, new_description: String) {
    potion.description = new_description;
}

/// 포션 삭제 (소각)
public fun burn_potion(potion: Potion, ctx: &mut TxContext) {
    let owner = tx_context::sender(ctx);
    let potion_id = object::uid_to_address(&potion.id);
    let potion_type = potion.potion_type;
    let quantity = potion.quantity;
    
    let Potion { id, potion_type: _, effect_value: _, quantity: _, description: _ } = potion;
    
    event::emit(PotionBurned {
        owner,
        potion_id,
        potion_type,
        quantity,
    });
    
    object::delete(id);
}

// ========== UTILITY FUNCTIONS ==========

// BM 토큰 잔액 확인
public fun has_sufficient_bm_tokens(bm_token: &BMToken, required_amount: u64): bool {
    bm_token.amount >= required_amount
}

// 포션 수량 확인
public fun has_sufficient_potions(potion: &Potion, required_quantity: u64): bool {
    potion.quantity >= required_quantity
}

// 전송 유틸리티 제거됨: 실제 전송은 PTB `tx.transferObjects` 또는
// `sui::transfer::public_transfer`를 사용하세요.
