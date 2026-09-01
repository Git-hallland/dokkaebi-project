# Community 신고 및 moderation 운영

- 문서 상태: PHASE E 구현 기준
- 기준일: 2026-09-01

## 권한 정책

권한은 `src/lib/community-reports.ts`의 capability 함수에서만 결정한다.

- `USER`, `EDITOR`: 신고 관리 접근 불가
- `REVIEWER`: 신고 목록 조회, 처리 완료, 기각
- `ADMIN`: REVIEWER 권한과 게시글·댓글 soft-delete moderation

신고 API의 `reporterId`와 처리 API의 `resolvedById`는 Better Auth 서버 세션에서만 가져온다. 클라이언트가 사용자 ID나 처리자 ID를 지정할 수 없다. ADMIN은 자신의 콘텐츠와 관련된 신고도 처리할 수 있다. 초기 운영 인원이 적은 MVP 정책이며, 독립적인 감사 로그가 없으므로 운영자가 늘기 전에 이해충돌 회피 정책을 추가한다.

## 신고 및 처리 규칙

신고 사유는 `SPAM`, `ABUSE`, `MISINFORMATION`, `COPYRIGHT`, `OTHER`만 허용한다. 추가 설명은 선택이며 trim 후 1,000자 이하의 plain text만 저장한다. HTML 구분자와 제어문자는 거부한다.

자기 게시글·댓글과 soft-delete된 대상은 신고할 수 없다. 같은 사용자의 같은 대상 신고는 DB unique constraint로 막고 HTTP 409와 안전한 안내 문구로 처리한다. 대상 FK는 RESTRICT이므로 신고 기록이 남아 있는 대상은 hard delete하지 않는다.

신고 처리에는 `GuideReport.status`, `resolvedById`, `resolvedAt`, `resolution`을 기록한다. ADMIN이 대상 숨김과 신고 해결을 선택하면 하나의 DB transaction에서 처리한다. 댓글은 실제로 처음 숨겨진 경우에만 `GuidePost.commentCount`를 1 감소시킨다. 게시글·댓글의 관계 row와 기존 신고는 보존한다.

## 알려진 운영 한계

- 별도 `AuditLog`가 없어 현재는 신고 처리자·시각·상태·메모만 감사 근거로 남는다. 콘텐츠 복구, role 변경, 관리자 행동 전반을 추적하려면 후속 migration으로 append-only AuditLog를 설계해야 한다.
- 동일 대상 반복 신고는 unique로 차단하지만 여러 대상을 연속 신고하는 abuse를 막는 distributed rate limiter는 없다. 공개 운영 전 사용자·IP를 과도하게 보관하지 않는 rate-limit 저장소와 임계값을 결정한다.
- 신고 처리 결과 알림 type은 이번 단계에서 추가하지 않았다.

## YouTube 설정

홈 공식 영상 조회는 `YOUTUBE_API_KEY`가 있을 때만 YouTube Data API를 사용한다. 키가 없거나 API가 실패하면 기존 정적 fallback을 유지한다. 운영자는 배포 환경에 실제 키를 직접 설정해야 하며 저장소나 로그에 값을 남기지 않는다. 게시글 embed는 API key와 무관하게 검증된 11자 video ID를 `youtube-nocookie.com`으로 표시한다.

## Cloudinary staging 자산 정리 제안

현재 `dokkaebi/posts/staging` 자산을 자동 삭제하지 않는다. 안전한 cleanup은 다음 조건이 모두 충족된 별도 운영 작업으로 구현한다.

1. Cloudinary Admin API로 staging 자산을 페이지 단위 조회한다.
2. 최소 24시간보다 오래된 자산만 후보로 삼는다.
3. 이미지와 video resource를 구분해 모든 soft-delete 포함 `GuidePost.body`와 프로필 `User.image`에서 public ID 참조를 대조한다.
4. 기본 동작은 dry-run 목록이며, 명시적 운영 승인 때만 후보 ID를 정확히 지정해 삭제한다.
5. 실행 결과와 실패를 audit log에 남긴다.

Netlify scheduled function 또는 별도 scheduler 선택, API 호출 비용, 동시 게시 중 race 방지, audit 저장소가 아직 결정되지 않았으므로 이번 PHASE에서는 cron이나 삭제 utility를 만들지 않는다. 사용 중인 프로필·게시글 이미지·동영상 자산은 삭제하지 않는다.
