/// Module: inventory
module blockmon::inventory;

use std::string::String;
use sui::event;

// ========== BM TOKEN STRUCTURES ==========

/// BM 토큰 구조체
public struct BMToken has key, store {
    id: UID,
    owner: address,
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
    owner: address,
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
        owner,
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
    
    assert!(bm_token.amount >= amount_to_subtract, 0); // 에러: 잔액 부족
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

public fun get_bm_token_owner(bm_token: &BMToken): address {
    bm_token.owner
}

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
    
    let BMToken { id, owner: _, amount: _, token_type: _ } = bm_token;
    
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
        owner,
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
    
    assert!(potion.quantity >= quantity_to_use, 0); // 에러: 포션 부족
    
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

public fun get_potion_owner(potion: &Potion): address {
    potion.owner
}

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
    
    let Potion { id, owner: _, potion_type: _, effect_value: _, quantity: _, description: _ } = potion;
    
    event::emit(PotionBurned {
        owner,
        potion_id,
        potion_type,
        quantity,
    });
    
    object::delete(id);
}

// ========== UTILITY FUNCTIONS ==========

/// BM 토큰 잔액 확인
public fun has_sufficient_bm_tokens(bm_token: &BMToken, required_amount: u64): bool {
    bm_token.amount >= required_amount
}

/// 포션 수량 확인
public fun has_sufficient_potions(potion: &Potion, required_quantity: u64): bool {
    potion.quantity >= required_quantity
}

/// BM 토큰 전송 (소유권 변경)
public fun transfer_bm_token(bm_token: &mut BMToken, new_owner: address) {
    bm_token.owner = new_owner;
}

/// 포션 전송 (소유권 변경)
public fun transfer_potion(potion: &mut Potion, new_owner: address) {
    potion.owner = new_owner;
}
