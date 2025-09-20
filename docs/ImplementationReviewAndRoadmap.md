## Implementation Review and Roadmap (Sui)

### Executive Summary
- **현재 수준**: Competent(좋음). PTB·배치 민팅·재시도/직렬화 큐 등 실전형 처리 강점. 온체인/오프체인 경계 및 동기화 로직 우수.
- **핵심 격차**: 소유권 모델 위배 가능성(`owner` 필드/가짜 transfer), FT 비표준(BM을 Coin으로 전환 필요), 접근 제어 부재, Move 네이밍/에러 코드 컨벤션, 테스트/문서화.
- **로드맵 요지**: 1) 코어 정합성(소유권/코인/권한/네이밍/테스트) → 2) Sui 고유 기능 심화(Dynamic Fields/Bag, Display, create_many) → 3) 마켓·정책(Kiosk/TransferPolicy) → 4) 품질/CI·KPI.

### 평가 기준 요약
- **완성도**: 구현 범위가 아이디어 대비 얼마나 충실하게 동작하는가?
- **코드 품질**: 구조화, 모듈화, 가독성, 오류 처리, 문서화 수준은 어떠한가?
- **Move/Sui 컨벤션**: Move 스타일/네이밍, Sui 베스트 프랙티스(소유권 모델, Coin 표준 등) 준수 여부.
- **정확성**: 명백한 버그/반(半)구현 여부, 경계/에러 케이스 대응.
- **유지보수성**: 테스트(단위/통합/자동화)와 확장 가능성, 모듈 경계의 명확성.
- **Sui 고유성 활용**: PTB, Dynamic Fields/Bag, Display, Kiosk/TransferPolicy, Sui SDK(Typescript/dapp-kit) 등 Sui에서만 가능한 고유 기능의 활용도.

### 점수 밴드(요약)
- **Unsatisfactory**: 핵심 워크플로우 실패, 테스트/품질 부재, 치명적 결함.
- **Mediocre**: 기능은 동작하나 버그가 많고 Sui 마인드셋 위배, 유지보수성 낮음.
- **Competent(좋음)**: 기능 안정적, 버그 적음, 컨벤션 준수 양호, 테스트 존재. Sui 기능을 의도적으로 활용하면 가산.
- **Outstanding(탁월)**: 우아한 설계/코드, 광범위 테스트/문서화, Sui 기능을 창의적으로 확장.

## Implementation Review
### 온체인( Move )
- `blockmon.move`
  - `BlockMon` 구조와 민팅(`create_block_mon`), 이벤트(`Minted`, `BattleRecorded`, `Burned`), 소각(`burn`), 업데이트(setters) 제공.
  - Getter/Setter로 프런트 PTB 체이닝에 적합.
- `inventory.move`
  - BM 토큰/포션 오브젝트와 수량 증감/사용 이벤트 제공.
  - 현 구현은 FT를 커스텀 오브젝트로 표현(표준 Coin 미사용).

### 오프체인( Front/Services )
- 트랜잭션 빌더·실행자: `src/services/chain.js`, 실행 전략 `src/utils/signer.js`(env-key vs wallet)로 추상화.
- 도메인 서비스: `adventureService.js`, `fusionService.js`, `inventoryService.js`, `pvpService.js`가 게임 루프/정산/동기화 담당.
- 신뢰성: 직렬화 큐·지수 백오프 재시도·보류 큐(민트/번)·이벤트/오브젝트 조회로 체인/로컬 동기화 견고.
- 매핑: `src/utils/mappers.js`에서 온체인 → 로컬 모델 변환.

### 현재 프로젝트 진단(요약: Competent)
- **강점**
  - **PTB 적극 활용**: 배치 민팅(다중 `moveCall`)과 대기/재시도/폴백 설계가 실전적.
  - **서비스 구조 분리**: 트랜잭션 빌더/실행자(`src/services/chain.js`, `src/utils/signer.js`), 온체인→로컬 매퍼(`src/utils/mappers.js`), 도메인 서비스(`adventureService.js`, `fusionService.js`, `inventoryService.js`, `pvpService.js`)로 모듈 경계가 명확.
  - **결과 처리/동기화**: `extractCreatedByType`, 이벤트/오브젝트 조회, 로컬 상태 동기화, 보류 큐(민트/번) 및 재시도 로직 구현.
  - **Move 모듈**: `blockmon.move`(민팅/소각/업데이트/이벤트), `inventory.move`(BM 토큰/포션 수량 관리/이벤트)로 핵심 엔티티와 이벤트 정의.

- **개선 필요(핵심)**
  - **소유권 모델 위배**: `inventory`의 `owner: address` 필드와 `transfer_*` 함수가 실제 Sui 소유권을 이전하지 않음(필드만 변경). 혼선/자산 분기 위험 → 제거/개편 필요.
  - **FT 비표준**: BM 토큰을 커스텀 오브젝트+수량 필드로 구현. FT는 `sui::coin::Coin<T>`와 `TreasuryCap<T>`로 전환 권장.
  - **접근 제어 부재**: 누구나 임의 스탯으로 민팅 가능. 상점/민팅/밸런스 변경에 `AdminCap`/`StoreCap` 도입 필요.
  - **Move 컨벤션(완료)**: 함수/필드 snake_case로 통일, 에러 코드 상수화.
  - **테스트/문서화**: Move 유닛 테스트 및 Devnet e2e 자동화 부재. 이벤트 스키마/아키 설계 문서 미흡.
  - **데이터 검증**: 포션 `effect_value(9999)` 등 상한/검증 부재, 입력 스탯 검증/범위 체크 필요.

### Known Risks & Mitigations
- 잘못된 소유권 전송 API 사용 → 전송은 오직 PTB/Move `transfer`로 수행. 잘못된 함수는 제거.
- FT를 오브젝트로 관리 → `Coin<BM>`로 전환, `TreasuryCap<BM>` 보관/민팅 경로 제한.
- 무제한 스탯/포션 → 입력 상한/검증과 의미 있는 에러 코드 도입.
- 체인-로컬 불일치 → 이벤트/오브젝트 폴링 및 보류 큐 자동 플러시로 보강.

## Roadmap & Immediate Actions
### Immediate (Before Deadline)
- 체인 호출 안전망 강화: 직렬화 큐/재시도 설정을 Adventure/Fusion/PvP의 모든 온체인 경로에 일괄 적용(이미 있는 `queueAndRetry` 누락 경로 점검).
- 잘못된 전송 호출 방지: Move `inventory::transfer_*`는 사용하지 않도록 주석/경고를 코드 내에 표시하고, 전송은 오직 PTB `transferObjects`만 사용.
- 입력 검증 보강: 포션 구매/소비, BM 토큰 증감의 프론트 입력(음수/비정상치) 방지 및 경고 메시지 연결(현 번역 키 재사용).
- 대기열 자동 플러시: 앱 시작 시 보류 큐(민트/번) 자동 재시도 루틴 호출을 `App` 초기화에 추가.
- 문서/심사 대응: 본 문서의 "Known Risks & Mitigations"를 README 링크로 노출하여 심사 시 기술적 판단 근거 제시.
### 1) 핵심(필수)
- **BM을 Coin 표준으로 전환**
  - `struct BM has drop {}` + `TreasuryCap<BM>` 발행, 민트/소각/결제는 표준 코인 API 사용.
  - 프론트 `inventoryService`/`pvpService`/`adventureService`에서 BM 오브젝트 경로 → `Coin<BM>` 소비로 리팩토링.
- **소유권 모델 정합화**
  - `owner: address` 필드 제거, `transfer_*` 함수 삭제.
  - 전송은 PTB의 `tx.transferObjects` 또는 Move의 `transfer::public_transfer` 사용.
- **접근 제어 도입**
  - 민팅/상점/스탯 변경 경로에 `AdminCap`/`StoreCap` 요구.
  - 프론트는 해당 Cap 보유/역할 기반 UI 노출 제어.
- **Move 컨벤션/에러 정리 (완료)**
  - 함수/필드/이벤트 snake_case로 통일(`create_block_mon`, `player_remaining_hp`).
  - 에러 코드 상수화(e.g., `E_INSUFFICIENT_FUNDS`, `E_INVALID_STAT`).
- **테스트 추가**
  - Move 테스트 (완료): 민팅/소각/증감/사용/이벤트 어서션.
  - e2e(Devnet) (선택): Adventure/PvP/Fusion 정산 PTB 실행 및 잔액/이벤트 검증.

### 2) Sui 고유성 고도화(가치 상승)
- **인벤토리 오브젝트화**: `bag`/`dynamic_field`로 플레이어 인벤토리에 포션/아이템을 부착(조합성/쿼리 안정성 향상). [완료]
- **배치 민팅 최적화**: `entry create_many(...)` 추가(루프 내부 생성 즉시 전송) 또는 내부 전송 처리로 가스 절감.
- **Kiosk/TransferPolicy**: 블록몬 거래/로열티/락 정책 모델링.
- **Display**: `display` 메타데이터로 NFT UX 개선.
- **이벤트 스키마 표준화**: 스네이크 케이스/타입 명확화(주소 vs 오브젝트ID)로 인덱싱 친화성 확보.

### 3) 프론트/툴링
- 앱 시작 시 보류 큐 자동 플러시(미처리 민트/번 재시도) 루틴.
- 타입 강화(가능하면 TS 전환), 체인 에러 매핑/사용자 메시지 일관화.
- 가스/성능 로깅 및 간단한 대시보드.
 

## Acceptance Checklist
- [x] [Now] 모든 온체인 경로에 `queueAndRetry` 적용 확인
- [x] [Now] `inventory::transfer_*` 비사용 보장 및 코드 경고 주석 추가
- [x] [Now] 포션/BM 입력값 검증(음수/상한) 및 오류 메시지 연결
- [x] [Now] 앱 시작 시 보류 큐(민트/번) 자동 플러시 추가
- [x] [Now] README에 "Known Risks & Mitigations" 링크 노출
- [x] BM → `Coin<BM>` 전환 및 관련 서비스 리팩토링
- [x] `owner` 필드/`transfer_*` 제거 및 실제 전송 로직 적용
- [x] 권한 토글 가능한 최소 스캐폴딩(`blockmon::config`) 추가
- [x] Move 네이밍 snake_case 및 에러 코드 상수화
- [x] Move 유닛 테스트 추가(블록몬/인벤토리/컨피그, 이벤트/에러 검증)
- [ ] Devnet e2e 파이프라인 추가(해커톤 범위: 선택/생략)
- [x] 인벤토리 Dynamic Fields/Bag 도입
- [x] create_many 도입 또는 PTB 최적화
- [ ] Display/Kiosk/TransferPolicy 연계 (Deferred - 해커톤 범위 외: NFT Display 메타데이터/마켓 제외)
- [x] 이벤트 스키마 표준화와 문서화

## KPIs (Post-Refactor)
- 평균 가스 사용: 캡처/민팅/정산 트랜잭션별 가스 비용(중앙값/95p).
- 체결 지연: `signAndExecute` → `finality` 평균/95p 시간.
- 실패율: 재시도 후 최종 실패 비율, 원인별 분포.
- 데이터 일관성: 이벤트→로컬 상태 불일치 인시던트/주.
- 테스트: e2e 패스율(>95%), Move 유닛 커버리지(핵심 분기 90%+).

## 참고(파일/모듈)
- Move: `move/sources/blockmon.move`, `move/sources/inventory.move`, `move/sources/config.move`
- 체인 서비스: `src/services/chain.js`, 실행전략 `src/utils/signer.js`
- 도메인 서비스: `src/services/adventureService.js`, `fusionService.js`, `src/services/inventoryService.js`, `pvpService.js`
- 매퍼: `src/utils/mappers.js`


