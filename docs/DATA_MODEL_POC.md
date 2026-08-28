# Prisma 데이터 모델 PoC 메모

- 기준일: 2026-08-28
- 범위: `docs/CONTENT_MODEL.md`의 출시 전 핵심 관계를 Prisma와 PostgreSQL로 표현할 수 있는지 검증
- 상태: 운영 스키마가 아닌 PoC

## 확인한 내용

- Content, Claim, Source와 두 출처 연결 관계를 명시적 관계 모델로 표현할 수 있다.
- ContentRevision과 Report를 Content에 종속시키되 삭제 전파 없이 보존할 수 있다.
- Report가 연결된 Claim은 일반적인 삭제를 제한해 신고 대상 Claim 관계가 유실되지 않게 한다.
- PostgreSQL의 nullable unique slug를 사용하면 여러 draft가 slug 없이 존재할 수 있다.

## PoC 선택

- ID는 DB 확장 없이 애플리케이션에서 생성할 수 있는 Prisma `cuid()`를 사용했다. 장기 ID 정책은 아니다.
- 합의된 Content 상태만 enum으로 두고 Claim 유형, Source·Report 상태와 evidenceRole은 문자열로 남겼다.
- Source URL은 같은 원문을 재사용한다는 기존 원칙에 따라 unique로 두었다.
- 관계 삭제 정책은 기본적으로 `Restrict`를 사용해 연결된 기록이 의도치 않게 유실되지 않게 했다.
- Prisma Client 생성물은 재생성 가능하므로 저장소와 lint 대상에서 제외했다.

## 문서 모델과의 차이 및 보류

- draft 저장 흐름을 위해 Content의 slug, summary, body, checkedAt을 nullable로 두었다. published 전 필수 조건은 후속 애플리케이션 규칙으로 검증해야 한다.
- RelatedContent 기능은 필요하지만 초기 문서 수에서는 독립 관계 모델이 필수라는 근거가 없어 이번 PoC에서 제외했다.
- GameVersion, SlugHistory, Structured Game Entity, Source 권리·유효 기간·대체 관계는 후속 범위로 남겼다.
- ContentRevision의 snapshot/diff 방식과 changedBy의 User FK는 확정하지 않았다.
- migration, seed, 실제 DB 연결과 Prisma Client 애플리케이션 사용은 수행하지 않았다.

## 도구 확인 사항

- 안정판 Prisma 7.10.0의 `@prisma/client → prisma → @prisma/config → deepmerge-ts` 의존 경로에 대해 npm audit이 high 취약점을 보고했다. 현재 PoC에서는 자동 수정이나 RC 업그레이드를 적용하지 않으며, 운영 도입 전에 수정된 안정판과 영향 범위를 다시 확인해야 한다.
