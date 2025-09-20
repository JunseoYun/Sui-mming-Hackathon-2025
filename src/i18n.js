const translations = {
  ko: {
    "app.brand": "Blockmon Battle Prototype",
    "system.starterCreated": "첫 블록몬 DNA가 생성되었습니다!",
    "system.adventureSummary":
      "모험 완료! 전투 {{battles}}회, 포획 {{captured}}마리, 보상 +{{tokens}} BM",
    "system.fusionCreated":
      "새로운 블록몬이 탄생했습니다! 인벤토리에서 확인하세요.",
    "system.fusionFailed":
      "합성이 실패했습니다. 예상 성공 확률 {{chance}}%였습니다.",
    "system.pvpWin": "PVP 매치에서 승리했습니다! (순이익 +1 BM)",
    "system.pvpLose": "PVP 매치에서 패배했습니다. 배팅 토큰 3 BM을 잃었습니다.",
    "errors.noBlockmon": "보유한 블록몬이 없습니다.",
    "errors.noTokensAdventure": "BM 토큰이 부족합니다. (필요: 1)",
    "errors.selectTeam": "모험에 출전할 블록몬을 선택하세요. (최대 4마리)",
    "errors.missingSelected": "선택한 블록몬을 찾을 수 없습니다.",
    "errors.sameBlockmon": "서로 다른 두 블록몬을 선택하세요.",
    "errors.sameSpeciesFusion": "같은 종족의 블록몬만 합성할 수 있습니다.",
    "errors.noTokensFusion": "BM 토큰이 부족합니다. (합성 비용: 1)",
    "errors.noBlockmonPvp": "출전 가능한 블록몬이 없습니다.",
    "errors.noTokensPvp": "BM 토큰이 부족합니다. (필요: 3)",
    "home.title": "환영합니다, {{name}}님",
    "home.subtitle":
      "랜덤 DNA로 탄생한 블록몬 팀을 성장시키고 SUI 바다를 정복하세요.",
    "home.section.blockmons": "내 블록몬",
    "home.noBlockmons":
      "아직 보유한 블록몬이 없습니다. DNA를 합성하거나 모험에서 확보하세요.",
    "home.selectedCount": "선택된 팀: {{count}} / 4",
    "home.clearSelection": "선택 초기화",
    "home.sort.default": "기본순",
    "home.sort.strong": "강한순",
    "home.sort.weak": "약한순",
    "home.selection.summaryLead": "선택된 블록몬 {{count}}마리",
    "home.selection.extraNotice":
      "※ 합성 시 선택한 모든 블록몬이 사용됩니다.",
    "home.potionSelect.title": "지참할 포션 선택",
    "home.potionSelect.subtitle": "보유 포션 {{stock}}개 · 최대 {{max}}개까지 가져갈 수 있습니다.",
    "home.potionSelect.option": "포션 {{count}}개 지참",
    "home.potionSelect.optionNone": "포션 없이 떠나기",
    "home.potionSelect.cancel": "취소",
    "home.actions.startAdventure": "모험 시작 (1 BM)",
    "home.actions.dnaFusion": "DNA 합성",
    "home.actions.currentBattle": "현재 배틀",
    "home.actions.pvp": "PVP 배틀",
    "home.actions.inventory": "인벤토리",
    "nav.home": "홈",
    "nav.adventure": "모험",
    "nav.battle": "배틀",
    "nav.fusion": "DNA 합성",
    "nav.pvp": "PVP",
    "nav.inventory": "인벤토리",
    "home.error.maxTeam": "모험 팀은 최대 4마리까지만 선택할 수 있습니다.",
    "home.activeAdventure.title": "진행 중인 모험",
    "home.activeAdventure.summary":
      "{{active}} / {{total}} 명 활동 중 · 포션 {{potions}}개 · 총 사용 토큰 {{spent}} · 포획 {{captured}}마리",
    "home.language.korean": "한글",
    "home.language.english": "English",
    "blockmon.powerLabel": "전투력",
    "blockmon.origin": "출처: {{value}}",
    "blockmon.temperament": "{{value}}",
    "token.bm": "BM 토큰",
    "token.dna": "DNA 보관",
    "token.active": "활성 블록몬",
    "token.seed": "시드 기록",
    "token.potion": "포션",
    "token.purchaseButton": "토큰 구매",
    "token.purchaseTitle": "구매할 토큰 수량을 선택하세요.",
    "token.purchaseOption": "{{amount}} BM 추가",
    "token.purchaseConfirm": "{{amount}} BM 토큰이 추가되었습니다.",
    "inventory.tokens": "토큰 인벤토리",
    "inventory.potions": "포션 인벤토리",
    "inventory.purchase.tokens": "토큰 충전",
    "inventory.purchase.potions": "포션 구매",
    "inventory.potionOptions": "포션 {{amount}}개 ({{cost}} BM)",
    "inventory.potionConfirm": "포션 {{amount}}개를 획득했습니다.",
    "inventory.potionError": "BM 토큰이 부족합니다.",
    "inventory.potionStock": "보유 포션: {{value}}개",
    "pvp.error.selectTeam": "PVP에 출전할 블록몬 4마리를 선택하세요.",
    "pvp.selection.title": "출전 블록몬 선택 (최대 4마리)",
    "adventure.log.potion": "{{name}}에게 포션을 사용하여 체력을 회복했습니다.",
    "adventure.prepTitle": "모험 준비",
    "adventure.prepSubtitle": "홈 화면에서 모험을 시작하면 로그가 공유됩니다.",
    "adventure.none": "현재 진행 중인 모험이 없습니다.",
    "adventure.heading": "모험 임무",
    "adventure.subtitle":
      "모험을 시작하면 팀이 모두 탈진할 때까지 야생 블록몬과 연속 전투를 수행합니다.",
    "adventure.teamHeader": "출전 팀",
    "adventure.member.knockedOut": "탈진",
    "adventure.member.hp": "잔여 HP {{hp}}",
    "adventure.footer.home": "홈으로",
    "adventure.log.start": "{{count}}마리의 블록몬이 모험을 시작했습니다.",
    "adventure.log.encounter": "야생 {{species}}을(를) 조우했습니다.",
    "adventure.log.knockout": "{{attacker}}의 공격으로 {{defender}}이(가) 탈진했습니다.",
    "adventure.log.capture": "{{species}}을(를) 포획했습니다! 팀에 합류합니다.",
    "adventure.log.complete": "팀 전원 탈진. 모험이 종료되었습니다.",
    "adventure.captures.title": "새로 포획한 블록몬",
    "adventure.captures.count": "총 {{count}}마리",
    "battle.infoTitle": "배틀 정보",
    "battle.infoSubtitle": "현재 진행 중인 PVE 배틀이 없습니다.",
    "battle.title": "PVE 배틀",
    "battle.subtitle": "야생과의 전투 결과를 기록합니다.",
    "battle.meta.spent": "소모 토큰: {{value}}",
    "battle.meta.reward": "보상 토큰: {{value}}",
    "battle.meta.result.win": "결과: 승리",
    "battle.meta.result.defeat": "결과: 패배",
    "battle.button.adventure": "모험 이어가기",
    "battle.button.home": "홈으로",
    "battleLog.title": "전투 로그",
    "battleLog.summary.win": "승리! 야생 블록몬을 제압했습니다.",
    "battleLog.summary.defeat": "패배… 팀을 재정비하세요.",
    "battleLog.actor.player": "내 블록몬",
    "battleLog.actor.opponent": "야생 블록몬",
    "battleLog.entry.player":
      "[내 블록몬 - {{name}}] {{action}} ({{detail}}) | 야생 {{target}} HP {{hp}}",
    "battleLog.entry.opponent":
      "[야생 블록몬 - {{name}}] {{action}} ({{detail}}) | 내 {{target}} HP {{hp}}",
    "battleLog.entry.potion": "{{name}}에게 포션을 사용하여 HP {{hp}}로 회복했습니다.",
    "battleLog.detail.noAction": "행동이 취소되었습니다.",
    "battleLog.detail.noDamage": "데미지 없음",
    "battleLog.detail.damage": "{{value}} 피해",
    "battleLog.action.miss": "공격이 빗나갔습니다.",
    "battleLog.action.hit": "공격 성공",
    "battleLog.action.basic": "공격",
    "battleLog.action.crit": "치명타!",
    "battleLog.action.critWin": "치명타 성공!",
    "battleLog.skill.activate": "{{name}}의 {{skill}} 발동!",
    "battleLog.skill.use": "{{name}}가 {{skill}}을 사용!",
    "battleLog.skill.effect.skipTurn": "{{source}}의 {{skill}} 효과로 행동을 건너뜁니다.",
    "battleLog.skill.detail.shell": "{{turns}}턴 동안 무적이 됩니다.",
    "battleLog.skill.detail.skip": "상대의 다음 턴을 건너뜁니다.",
    "battleLog.skill.detail.miss": "상대의 다음 공격이 빗나갑니다.",
    "battleLog.skill.detail.heal": "체력을 {{hp}}까지 회복했습니다.",
    "battleLog.skill.detail.instant": "상대를 즉시 쓰러뜨립니다!",
    "battleLog.skill.detail.blocked": "{{defender}}(은)는 {{skill}} 효과로 보호받고 있습니다!",
    "battleLog.skill.detail.nullified": "{{defender}}의 {{skill}} 효과로 공격이 무효화되었습니다.",
    "battleLog.skill.detail.forcedMiss": "{{defender}}의 {{skill}} 효과로 공격이 빗나갔습니다.",
    "battleLog.skill.orca": "{{name}}의 {{skill}}! 데미지 2배!",
    "fusion.title": "DNA 합성",
    "fusion.subtitle":
      "같은 종족의 DNA를 조합해 강력한 블록몬을 만들어보세요. (선택 수에 따라 비용 증가)",
    "fusion.section.blockmons": "보유 블록몬",
    "fusion.tokens": "현재 토큰: {{value}} BM",
    "fusion.selection.lead":
      "선택된 블록몬 {{count}}마리 (같은 종족만 유지됩니다.)",
    "fusion.selection.notice":
      "※ 합성 시 선택된 모든 블록몬이 소모됩니다.",
    "fusion.quickSelect.title": "빠른 동일 종족 선택",
    "fusion.quickSelect.button": "{{species}} ({{count}}마리)",
    "fusion.cost.summary":
      "선택 {{count}}마리 · 합성 비용 {{cost}} BM (보유 {{tokens}} BM)",
    "fusion.successChance": "예상 성공 확률 {{chance}}%",
    "fusion.preview.title": "예상 결과",
    "fusion.result.title": "선택된 블록몬",
    "fusion.button.execute": "DNA 합성 실행",
    "fusion.button.executeDynamic": "합성 실행 ({{cost}} BM)",
    "fusion.button.home": "홈으로",
    "fusion.warning.failurePenalty": "※ 실패 시 가장 강한 블록몬만 남고 나머지는 소멸합니다.",
    "fusion.error.selectTwo": "같은 종족의 블록몬을 두 마리 이상 선택해주세요.",
    "fusion.error.sameSpecies": "같은 종족만 합성할 수 있습니다.",
    "fusion.error.cost": "합성 비용 {{cost}} BM이 필요합니다.",
    "fusion.error.failure": "합성이 불안정하여 실패했습니다. (성공 확률 {{chance}}%)",
    "fusion.result.message":
      "{{name}}이(가) 합성되었습니다! 인벤토리에서 확인하세요.",
    "fusion.alert.title": "{{name}} 탄생!",
    "fusion.alert.dna": "DNA: {{dna}}",
    "fusion.alert.failure": "합성이 실패했습니다. (성공 확률 {{chance}}%)",
    "pvp.title": "PVP 매칭",
    "pvp.subtitle":
      "3 BM 토큰을 배팅하여 다른 수호자와 전투하세요. 승리 시 5 BM 획득, 1 BM 수수료 차감.",
    "pvp.card.entry": "출전 정보",
    "pvp.card.noBlockmon": "출전 가능한 블록몬이 없습니다.",
    "pvp.card.tokens": "보유 토큰: {{value}} BM",
    "pvp.card.rulesTitle": "배팅 규칙",
    "pvp.card.ruleStake": "배팅: 3 BM",
    "pvp.card.ruleReward": "승리 보상: 5 BM, 플랫폼 수수료 1 BM",
    "pvp.card.ruleProfit": "순이익(승리 기준): +1 BM",
    "pvp.card.ruleLoss": "패배 시 배팅 토큰 소멸",
    "pvp.card.recentTitle": "최근 전적",
    "pvp.card.recentNone": "아직 PVP 전적이 없습니다.",
    "pvp.card.recentResultWin": "결과: 승리",
    "pvp.card.recentResultLose": "결과: 패배",
    "pvp.card.recentOpponent": "상대: {{name}}",
    "pvp.card.recentStake": "배팅: {{value}} BM",
    "pvp.card.recentReward": "보상: {{value}} BM",
    "pvp.card.recentFee": "수수료: {{value}} BM",
    "pvp.card.recentNet": "순이익: {{value}} BM",
    "pvp.actions.match": "PVP 배틀 매칭 (3 BM)",
    "pvp.actions.home": "홈으로",
    "inventory.title": "인벤토리",
    "inventory.section.dna": "보유 DNA",
    "inventory.empty.dna": "DNA가 아직 없습니다.",
    "inventory.section.seed": "랜덤 시드 기록",
    "inventory.empty.seed": "아직 시드 기록이 없습니다.",
    "inventory.section.adventure": "모험 상태",
    "inventory.empty.adventure": "모험 이력이 없습니다.",
    "inventory.section.fusion": "합성 기록",
    "inventory.empty.fusion": "합성 기록이 없습니다.",
    "inventory.section.battle": "배틀 기록",
    "inventory.empty.battle": "PVE 배틀 기록이 없습니다.",
    "inventory.section.pvp": "PVP 기록",
    "inventory.empty.pvp": "PVP 기록이 없습니다.",
    "inventory.adventure.summary":
      "상태: {{status}} · 팀 {{team}} / 탈진 {{defeats}} · 포획 {{captured}}마리 · 포션 {{potions}} · 사용 토큰 {{spent}}",
    "inventory.adventure.button": "모험 로그 보기",
    "inventory.status.active": "진행 중",
    "inventory.status.complete": "완료",
    "signup.title": "BLOCKMON BATTLE",
    "signup.subtitle": "당신의 첫 번째 블록몬을 생성하세요.",
    "signup.tagline": "블록체인의 랜덤 시드가 생명의 씨앗이 되어 고유한 DNA를 부여합니다.",
    "signup.description": "이 신비로운 DNA 알에는 어떤 가능성이 잠들어 있을까요?",
    "signup.cta": "",
    "signup.button.label": "DNA 생성하기",
    "signup.cost": "[ 비용: 0.5 SUI ]",
    "signup.nicknameLabel": "수호자 닉네임",
    "signup.nicknamePlaceholder": "예: 심해탐험가",
    "signup.error.nickname": "닉네임을 입력해주세요.",
    "signup.error.walletRequired": "가입 전에 지갑을 연결해주세요.",
    "signup.button": "DNA 생성하고 입장",
    "signup.infoTitle": "시작 안내",
    "signup.bullet.seed": "✅ 랜덤 u64 시드 기반 고유 DNA 발급",
    "signup.bullet.starter": "✅ 스타터 블록몬 1마리 + BM 토큰 10개 지급",
    "signup.bullet.adventure":
      "✅ 모험 시작 시 토큰 1개 소모, 배틀 승리 시 추가 보상",
    "signup.bullet.fusion":
      "✅ 동일 종족 2마리 합성 → 새로운 DNA + 능력치 강화",
    "signup.wallet.connect": "지갑 연결하기",
    "signup.wallet.connected": "연결된 지갑: {{address}}",
    "signup.wallet.google": "Google로 로그인",
    "signup.wallet.unavailable": "지금은 Google 로그인 옵션을 불러올 수 없습니다.",
    "skill.orca.name": "쓰나미",
    "skill.orca.description": "50% 확률로 두 배의 데미지를 줍니다.",
    "skill.plankton.name": "증식",
    "skill.plankton.description": "HP가 20% 미만일 때, 50%까지 회복합니다. (한 번만 발동)",
    "skill.turtle.name": "껍질 요새",
    "skill.turtle.description": "2턴 동안 무적이 됩니다.",
    "skill.kraken.name": "먹물 구름",
    "skill.kraken.description": "상대의 다음 공격이 빗나갑니다.",
    "skill.leviathan.name": "심연의 손아귀",
    "skill.leviathan.description": "5% 확률로 상대를 즉시 쓰러뜨립니다.",
    "skill.mermaid.name": "세이렌의 노래",
    "skill.mermaid.description": "상대의 다음 턴을 건너뜁니다.",
  },
  en: {
    "app.brand": "Blockmon Battle Prototype",
    "system.starterCreated": "Starter Blockmon DNA created!",
    "system.adventureSummary":
      "Adventure complete! Battles {{battles}}, captured {{captured}}, reward +{{tokens}} BM",
    "system.fusionCreated":
      "A new Blockmon has been born! Check your inventory.",
    "system.fusionFailed":
      "Fusion failed. Your success chance was {{chance}}%.",
    "system.pvpWin": "PVP match won! (Net gain +1 BM)",
    "system.pvpLose": "PVP match lost. You forfeited 3 BM.",
    "errors.noBlockmon": "No Blockmon owned.",
    "errors.noTokensAdventure": "Not enough BM tokens. (Need 1)",
    "errors.selectTeam": "Select Blockmon for the adventure (up to 4).",
    "errors.missingSelected": "Selected Blockmon could not be found.",
    "errors.sameBlockmon": "Select two different Blockmon.",
    "errors.sameSpeciesFusion": "Only identical species can be fused.",
    "errors.noTokensFusion": "Not enough BM tokens. (Fusion cost: 1)",
    "errors.noBlockmonPvp": "No Blockmon available to fight.",
    "errors.noTokensPvp": "Not enough BM tokens. (Need 3)",
    "home.title": "Welcome, {{name}}",
    "home.subtitle":
      "Grow your Blockmon squad and conquer the SUI seas with unique DNA.",
    "home.section.blockmons": "My Blockmon",
    "home.noBlockmons":
      "No Blockmon yet. Fuse DNA or capture them during adventures.",
    "home.selectedCount": "Selected team: {{count}} / 4",
    "home.clearSelection": "Clear selection",
    "home.sort.default": "Default",
    "home.sort.strong": "Power ↓",
    "home.sort.weak": "Power ↑",
    "home.selection.summaryLead": "{{count}} Blockmon selected",
    "home.selection.extraNotice":
      "All selected Blockmon will be used for fusion.",
    "home.potionSelect.title": "Choose Potions",
    "home.potionSelect.subtitle": "You hold {{stock}} potions; you can carry up to {{max}}.",
    "home.potionSelect.option": "Carry {{count}} potions",
    "home.potionSelect.optionNone": "Go without potions",
    "home.potionSelect.cancel": "Cancel",
    "home.actions.startAdventure": "Start Adventure (1 BM)",
    "home.actions.dnaFusion": "DNA Fusion",
    "home.actions.currentBattle": "Current Battle",
    "home.actions.pvp": "PVP Battle",
    "home.actions.inventory": "Inventory",
    "nav.home": "Home",
    "nav.adventure": "Adventure",
    "nav.battle": "Battle",
    "nav.fusion": "DNA Fusion",
    "nav.pvp": "PVP",
    "nav.inventory": "Inventory",
    "home.error.maxTeam": "Adventure team can include up to 4 Blockmon.",
    "home.activeAdventure.title": "Active Adventure",
    "home.activeAdventure.summary":
      "{{active}} / {{total}} active · Potions {{potions}} · Tokens spent {{spent}} · Captured {{captured}}",
    "home.language.korean": "Korean",
    "home.language.english": "English",
    "blockmon.powerLabel": "Power",
    "blockmon.origin": "Origin: {{value}}",
    "blockmon.temperament": "{{value}}",
    "token.bm": "BM Tokens",
    "token.dna": "DNA Storage",
    "token.active": "Active Blockmon",
    "token.seed": "Seed Records",
    "token.potion": "Potions",
    "token.purchaseButton": "Buy Tokens",
    "token.purchaseTitle": "Select the amount of tokens to add.",
    "token.purchaseOption": "Add {{amount}} BM",
    "token.purchaseConfirm": "{{amount}} BM tokens added.",
    "inventory.tokens": "Token Inventory",
    "inventory.potions": "Potion Inventory",
    "inventory.purchase.tokens": "Top Up Tokens",
    "inventory.purchase.potions": "Buy Potions",
    "inventory.potionOptions": "{{amount}} potions ({{cost}} BM)",
    "inventory.potionConfirm": "Received {{amount}} potions.",
    "inventory.potionError": "Not enough BM tokens.",
    "inventory.potionStock": "Potions held: {{value}}",
    "pvp.error.selectTeam": "Select four Blockmon for PVP.",
    "pvp.selection.title": "Choose up to four Blockmon",
    "adventure.log.potion": "Used a potion on {{name}} to restore health.",
    "adventure.prepTitle": "Adventure Prep",
    "adventure.prepSubtitle":
      "Start an adventure from the home screen to view its log here.",
    "adventure.none": "No adventure is running right now.",
    "adventure.heading": "Adventure Mission",
    "adventure.subtitle":
      "Once started, the team battles wild Blockmon endlessly until everyone faints.",
    "adventure.teamHeader": "Expedition Team",
    "adventure.member.knockedOut": "KO",
    "adventure.member.hp": "HP remaining {{hp}}",
    "adventure.footer.home": "Back to Home",
    "adventure.log.start": "{{count}} Blockmon set out on the adventure.",
    "adventure.log.encounter": "Encountered wild {{species}}.",
    "adventure.log.knockout": "{{defender}} was knocked out by {{attacker}}.",
    "adventure.log.capture": "Captured {{species}}! Joined the team.",
    "adventure.log.complete": "All team members fainted. Adventure ended.",
    "adventure.captures.title": "Newly Captured Blockmon",
    "adventure.captures.count": "{{count}} captured",
    "battle.infoTitle": "Battle Info",
    "battle.infoSubtitle": "No ongoing PVE battle.",
    "battle.title": "PVE Battle",
    "battle.subtitle": "Review the results against the wild encounter.",
    "battle.meta.spent": "Tokens spent: {{value}}",
    "battle.meta.reward": "Token reward: {{value}}",
    "battle.meta.result.win": "Result: Victory",
    "battle.meta.result.defeat": "Result: Defeat",
    "battle.button.adventure": "Return to Adventure",
    "battle.button.home": "Back to Home",
    "battleLog.title": "Battle Log",
    "battleLog.summary.win": "Victory! Wild Blockmon subdued.",
    "battleLog.summary.defeat": "Defeat… Regroup your team.",
    "battleLog.actor.player": "My Blockmon",
    "battleLog.actor.opponent": "Wild Blockmon",
    "battleLog.entry.player":
      "[My Blockmon - {{name}}] {{action}} ({{detail}}) | Wild {{target}} HP {{hp}}",
    "battleLog.entry.opponent":
      "[Wild Blockmon - {{name}}] {{action}} ({{detail}}) | My {{target}} HP {{hp}}",
    "battleLog.entry.potion": "Used a potion on {{name}}. HP restored to {{hp}}.",
    "battleLog.detail.noAction": "No action taken.",
    "battleLog.detail.noDamage": "No damage",
    "battleLog.detail.damage": "{{value}} damage",
    "battleLog.action.miss": "Attack missed.",
    "battleLog.action.hit": "Attack landed.",
    "battleLog.action.basic": "Attack.",
    "battleLog.action.crit": "Critical hit!",
    "battleLog.action.critWin": "Critical hit!",
    "battleLog.skill.activate": "{{name}} activates {{skill}}!",
    "battleLog.skill.use": "{{name}} uses {{skill}}!",
    "battleLog.skill.effect.skipTurn": "{{source}}'s {{skill}} forces a skipped turn.",
    "battleLog.skill.detail.shell": "Immune for {{turns}} turns.",
    "battleLog.skill.detail.skip": "Opponent skips the next turn.",
    "battleLog.skill.detail.miss": "Opponent's next attack will miss.",
    "battleLog.skill.detail.heal": "Recovered HP to {{hp}}.",
    "battleLog.skill.detail.instant": "Instantly defeats the opponent!",
    "battleLog.skill.detail.blocked": "{{defender}} is protected by {{skill}}!",
    "battleLog.skill.detail.nullified": "{{defender}}'s {{skill}} nullified the attack.",
    "battleLog.skill.detail.forcedMiss": "{{defender}}'s {{skill}} caused the attack to miss.",
    "battleLog.skill.orca": "{{name}} unleashes {{skill}}! Damage doubled!",
    "fusion.title": "DNA Fusion",
    "fusion.subtitle":
      "Fuse DNA from the same species to create a stronger Blockmon. (Cost scales with selection)",
    "fusion.section.blockmons": "Owned Blockmon",
    "fusion.tokens": "Current tokens: {{value}} BM",
    "fusion.selection.lead":
      "{{count}} Blockmon selected (same species required).",
    "fusion.selection.notice":
      "All selected Blockmon will be consumed during fusion.",
    "fusion.quickSelect.title": "Quick Same-Species Pick",
    "fusion.quickSelect.button": "{{species}} ({{count}})",
    "fusion.cost.summary":
      "Selected {{count}} · Cost {{cost}} BM (You have {{tokens}} BM)",
    "fusion.successChance": "Estimated success chance {{chance}}%",
    "fusion.preview.title": "Projected Result",
    "fusion.result.title": "Selected Blockmon",
    "fusion.button.execute": "Execute DNA Fusion",
    "fusion.button.executeDynamic": "Fuse Now ({{cost}} BM)",
    "fusion.button.home": "Back to Home",
    "fusion.warning.failurePenalty": "※ On failure, only the strongest Blockmon survives; others are lost.",
    "fusion.error.selectTwo": "Select at least two Blockmon of the same species.",
    "fusion.error.sameSpecies": "Only identical species can be fused.",
    "fusion.error.cost": "You need {{cost}} BM for this fusion.",
    "fusion.error.failure": "Fusion destabilised and failed. (Success chance {{chance}}%)",
    "fusion.result.message": "{{name}} has been fused! Check your inventory.",
    "fusion.alert.title": "{{name}} is born!",
    "fusion.alert.dna": "DNA: {{dna}}",
    "fusion.alert.failure": "Fusion failed. (Success chance {{chance}}%)",
    "pvp.title": "PVP Matchmaking",
    "pvp.subtitle":
      "Stake 3 BM tokens and battle another guardian. Win 5 BM with a 1 BM fee.",
    "pvp.card.entry": "Entry Info",
    "pvp.card.noBlockmon": "No Blockmon available to fight.",
    "pvp.card.tokens": "Tokens held: {{value}} BM",
    "pvp.card.rulesTitle": "Staking Rules",
    "pvp.card.ruleStake": "Stake: 3 BM",
    "pvp.card.ruleReward": "Win reward: 5 BM, platform fee 1 BM",
    "pvp.card.ruleProfit": "Net profit on win: +1 BM",
    "pvp.card.ruleLoss": "Stake is lost on defeat",
    "pvp.card.recentTitle": "Recent Record",
    "pvp.card.recentNone": "No PVP history yet.",
    "pvp.card.recentResultWin": "Result: Victory",
    "pvp.card.recentResultLose": "Result: Defeat",
    "pvp.card.recentOpponent": "Opponent: {{name}}",
    "pvp.card.recentStake": "Stake: {{value}} BM",
    "pvp.card.recentReward": "Reward: {{value}} BM",
    "pvp.card.recentFee": "Fee: {{value}} BM",
    "pvp.card.recentNet": "Net: {{value}} BM",
    "pvp.actions.match": "Match PVP Battle (3 BM)",
    "pvp.actions.home": "Back to Home",
    "inventory.title": "Inventory",
    "inventory.section.dna": "Stored DNA",
    "inventory.empty.dna": "No DNA stored yet.",
    "inventory.section.seed": "Seed Records",
    "inventory.empty.seed": "No seed records yet.",
    "inventory.section.adventure": "Adventure Status",
    "inventory.empty.adventure": "No adventure history.",
    "inventory.section.fusion": "Fusion History",
    "inventory.empty.fusion": "No fusion history.",
    "inventory.section.battle": "Battle History",
    "inventory.empty.battle": "No PVE battle history.",
    "inventory.section.pvp": "PVP History",
    "inventory.empty.pvp": "No PVP history.",
    "inventory.adventure.summary":
      "Status: {{status}} · Team {{team}} / KO {{defeats}} · Captured {{captured}} · Potions {{potions}} · Tokens spent {{spent}}",
    "inventory.adventure.button": "View Adventure Log",
    "inventory.status.active": "Active",
    "inventory.status.complete": "Complete",
    "signup.title": "BLOCKMON BATTLE",
    "signup.subtitle": "Forge your very first Blockmon.",
    "signup.tagline": "A random chain seed becomes the spark that grants a unique DNA.",
    "signup.description": "What potential lies within this mysterious DNA shell?",
    "signup.cta": "",
    "signup.button.label": "Generate DNA",
    "signup.cost": "[ Cost: 0.5 SUI ]",
    "signup.nicknameLabel": "Guardian nickname",
    "signup.nicknamePlaceholder": "e.g. Abyss Explorer",
    "signup.error.nickname": "Please enter a nickname.",
    "signup.error.walletRequired": "Please connect your wallet before signing up.",
    "signup.button": "Generate DNA & Enter",
    "signup.infoTitle": "Getting Started",
    "signup.bullet.seed": "✅ Unique DNA via random u64 seed",
    "signup.bullet.starter": "✅ Starter Blockmon + 10 BM tokens",
    "signup.bullet.adventure":
      "✅ Adventures cost 1 BM, battle wins grant extra rewards",
    "signup.bullet.fusion": "✅ Fuse identical species to unlock stronger DNA",
    "signup.wallet.connect": "Connect wallet",
    "signup.wallet.connected": "Connected wallet: {{address}}",
    "signup.wallet.google": "Sign in with Google",
    "signup.wallet.unavailable": "Unable to load the Google login option right now.",
    "skill.orca.name": "Tsunami",
    "skill.orca.description": "50% chance to deal double damage.",
    "skill.plankton.name": "Multiply",
    "skill.plankton.description": "When HP is below 20%, heals up to 50%. (Once per battle)",
    "skill.turtle.name": "Shell Fortress",
    "skill.turtle.description": "Becomes invincible for 2 turns.",
    "skill.kraken.name": "Ink Cloud",
    "skill.kraken.description": "The opponent's next attack will miss.",
    "skill.leviathan.name": "Abyssal Grasp",
    "skill.leviathan.description": "5% chance to instantly defeat the opponent.",
    "skill.mermaid.name": "Siren's Song",
    "skill.mermaid.description": "The opponent skips their next turn.",
  },
};

const speciesTranslations = {
  범고래: { ko: "범고래", en: "Orca" },
  플랑크톤: { ko: "플랑크톤", en: "Plankton" },
  거북이: { ko: "거북이", en: "Turtle Guardian" },
  크라켄: { ko: "크라켄", en: "Kraken" },
  레비아탄: { ko: "레비아탄", en: "Leviathan" },
  인어: { ko: "인어", en: "Mermaid" },
  불사조: { ko: "불사조", en: "Phoenix" },
  수룡: { ko: "수룡", en: "Sea Drake" },
  전기너구리: { ko: "전기너구리", en: "Volt Ferret" },
  포자트롤: { ko: "포자트롤", en: "Spore Troll" },
  아이비온: { ko: "아이비온", en: "Iveon" },
  지구방위대: { ko: "지구방위대", en: "Earth Defender" },
};

const temperamentTranslations = {
  "창공을 가르는 검은 거인": {
    ko: "창공을 가르는 검은 거인",
    en: "Black giant that cleaves the sky",
  },
  "심연의 빛을 머금은 미립자": {
    ko: "심연의 빛을 머금은 미립자",
    en: "Microbe infused with abyssal light",
  },
  "백사장 위의 장수 감시자": {
    ko: "백사장 위의 장수 감시자",
    en: "Long-lived guardian watching the shores",
  },
  "폭풍을 부르는 촉수의 제왕": {
    ko: "폭풍을 부르는 촉수의 제왕",
    en: "Tentacled monarch that summons storms",
  },
  "바다를 가르는 고대의 용": {
    ko: "바다를 가르는 고대의 용",
    en: "Ancient dragon cleaving the seas",
  },
  "파도에 노래를 실어 보내는 수호자": {
    ko: "파도에 노래를 실어 보내는 수호자",
    en: "Guardian whose songs ride the waves",
  },
  "합성으로 각성한 유전자": {
    ko: "합성으로 각성한 유전자",
    en: "Genes awakened through fusion",
  },
};

const originTranslations = {
  "야생 탄생": { ko: "야생 탄생", en: "Born in the wild" },
  "스타터 DNA": { ko: "스타터 DNA", en: "Starter DNA" },
  "포획된 야생 블록몬": {
    ko: "포획된 야생 블록몬",
    en: "Captured wild Blockmon",
  },
  "합성 DNA": { ko: "합성 DNA", en: "Fused DNA" },
  "합성으로 각성한 유전자": {
    ko: "합성으로 각성한 유전자",
    en: "Genes awakened through fusion",
  },
  "야생 조우": { ko: "야생 조우", en: "Wild encounter" },
  "PVP 상대": { ko: "PVP 상대", en: "PVP opponent" },
};

const noteTranslations = {
  "가입 보상": { ko: "가입 보상", en: "Signup reward" },
  "모험 포획": { ko: "모험 포획", en: "Adventure capture" },
  "합성 결과": { ko: "합성 결과", en: "Fusion result" },
};

const entityStatusTranslations = {
  활성: { ko: "활성", en: "Active" },
  보관: { ko: "보관", en: "Stored" },
};

const statusTranslations = {
  active: { ko: "진행 중", en: "Active" },
  complete: { ko: "완료", en: "Complete" },
};

const actionMap = {
  "공격이 빗나갔습니다.": { ko: "공격이 빗나갔습니다.", en: "Attack missed." },
  "공격 성공": { ko: "공격 성공", en: "Attack landed." },
  공격: { ko: "공격", en: "Attack." },
  "치명타!": { ko: "치명타!", en: "Critical hit!" },
  "치명타 성공!": { ko: "치명타 성공!", en: "Critical hit!" },
};

function formatTemplate(template, params) {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params?.[key] ?? "");
}

export function translate(language, key, params = {}) {
  const langTable = translations[language] || translations.ko;
  const template = langTable[key] ?? translations.ko[key] ?? key;
  return formatTemplate(template, params);
}

export function translateSpecies(name, language) {
  if (!name) return "";
  const entry = speciesTranslations[name];
  if (!entry) return name;
  return entry[language] ?? entry.ko ?? name;
}

export function translateTemperament(text, language) {
  if (!text) return "";
  const entry = temperamentTranslations[text];
  if (!entry) return text;
  return entry[language] ?? entry.ko ?? text;
}

export function translateOrigin(text, language) {
  if (!text) return "";
  const entry = originTranslations[text];
  if (!entry) return text;
  return entry[language] ?? entry.ko ?? text;
}

export function translateNote(text, language) {
  if (!text) return "";
  const entry = noteTranslations[text];
  if (!entry) return text;
  return entry[language] ?? entry.ko ?? text;
}

export function translateEntityStatus(text, language) {
  if (!text) return "";
  const entry = entityStatusTranslations[text];
  if (!entry) return text;
  return entry[language] ?? entry.ko ?? text;
}

export function translateStatus(status, language) {
  if (!status) return "";
  const entry = statusTranslations[status];
  if (!entry) return status;
  return entry[language] ?? entry.ko ?? status;
}

export function translateAction(action, language) {
  if (!action) return "";
  const entry = actionMap[action];
  if (!entry) return action;
  return entry[language] ?? entry.ko ?? action;
}

export function translateDetail(detail, language) {
  if (!detail) return "";
  if (detail.includes("피해")) {
    const value = detail.replace(/[^0-9]/g, "");
    if (value) {
      return translate(language, "battleLog.detail.damage", { value });
    }
  }
  if (detail === "데미지 없음") {
    return translate(language, "battleLog.detail.noDamage");
  }
  return detail;
}

export function translateNet(value, language) {
  const formatted = value > 0 ? `+${value}` : `${value}`;
  return language === "ko" ? `${formatted} BM` : `${formatted} BM`;
}
