# 공략 커뮤니티 설계 결정

- 문서 상태: PHASE E 구현 기준
- 기준일: 2026-09-01
- 범위: Community 스키마와 PHASE B/C 운영 규칙을 기록한다.

## 기존 위키 콘텐츠와 분리

`Content` 계열은 출처 검수와 공개 상태를 가진 편집 콘텐츠다. 일반 사용자 UGC는 `GuidePost` 계열로 분리해 검수 위키 문서와 좋아요·댓글·알림의 수명주기가 섞이지 않게 한다.

## 게시글과 Rich Text

`GuidePost.body`는 raw HTML이 아니라 JSON document로 저장한다. TipTap JSON은 paragraph, heading, bold, italic, text color, text size, link, image, video 노드의 명시적인 allowlist schema로 서버에서 다시 검증한다.

게시글과 댓글은 `deletedAt`을 사용하는 soft delete가 기본이다. 개인정보·권리 침해처럼 실제 삭제가 필요한 경우에만 관리자 절차로 hard delete한다. 작성자 계정 삭제 시 글과 댓글은 유지하고 `authorId`를 `SET NULL`로 바꿔 UI에서 탈퇴한 사용자로 표시한다. 닉네임 snapshot은 계정 삭제 뒤 불필요한 개인 식별 정보가 남을 수 있어 저장하지 않는다.

## 미디어

게시글 이미지는 기존 signed Cloudinary 검증 core를 재사용하되 route, authorization, 폴더를 프로필과 분리한다. 빈 draft row 생성을 피하기 위해 게시 전 업로드는 `dokkaebi/posts/staging/...` namespace를 사용하고 JSON 이미지 노드에는 서버가 Cloudinary 서명·계정·경로를 확인한 HTTPS URL만 저장한다. 업로드 전 MIME, magic bytes, 크기와 실제 Cloudinary 응답을 서버에서 다시 검증한다. 게시물을 soft delete할 때 자산은 즉시 지우지 않으며, 미참조 staging asset 정리는 후속 운영 작업으로 둔다.

게시글 영상은 YouTube URL/ID embed를 사용하지 않고 Cloudinary signed direct upload를 사용한다. `dokkaebi/posts/videos/staging` namespace와 `resource_type=video` endpoint를 사용하며 MP4, WEBM, MOV 및 50MB 이하만 허용한다. 브라우저에서 MIME·확장자·magic bytes·크기를 먼저 검사하고, 서버가 Cloudinary response signature, resource type, format, bytes, public ID와 HTTPS URL을 다시 검증한다. 본문에는 검증된 URL을 가진 `video` JSON node만 저장하고 상세에서는 autoplay 없이 `<video controls preload="metadata">`로 렌더링한다.

직접 영상 업로드는 이미지보다 Cloudinary 저장·변환·전송량을 빠르게 소비하고 저작권·moderation 부담이 크다. 이미지/프로필 preset과 분리된 `CLOUDINARY_VIDEO_UPLOAD_PRESET` signed preset에 MP4/WEBM/MOV와 `52428800` bytes(50MB) 제한을 반드시 설정한다. 요청 서명과 서버 finalize 검증만으로는 검증 실패 전 업로드된 대용량 orphan의 비용 abuse를 완전히 막을 수 없으므로 preset 제한은 필수다. 신고 대응·고아 자산 cleanup·월간 사용량 경고도 운영 체크리스트에 포함한다.

## 좋아요·즐겨찾기와 카운터

좋아요와 즐겨찾기는 각각 복합 PK로 중복을 막는다. 자기 게시글 좋아요는 인기 순위 조작을 줄이기 위해 이후 서버 API에서 금지한다. 댓글 자기 좋아요도 같은 원칙을 적용한다.

목록과 홈 인기글 읽기 비용을 줄이기 위해 `likeCount`, `commentCount`, `viewCount`를 게시글에, `likeCount`를 댓글에 둔다. 관계 row의 생성·삭제와 counter 증감은 반드시 한 DB transaction에서 실행한다. toggle은 먼저 unique row의 create/delete 성공 여부를 확인한 뒤 원자적 increment/decrement를 실행하고, decrement는 0보다 큰 경우에만 허용한다. 충돌 시 unique constraint를 정상적인 이미 처리됨 상태로 다룬다. 운영 점검용 relation count 대조 작업을 후속 단계에 둔다.

## 댓글과 답글

댓글 body는 초기에는 plain text다. `parentId`로 답글을 연결하되 서버가 부모 댓글의 `parentId`가 null이고 같은 게시글에 속하는지 검증해 깊이를 1단계로 제한한다. 답글이 있는 댓글 삭제도 soft delete하고 본문 대신 “삭제된 댓글입니다.”를 표시한다.

댓글은 앞뒤 공백을 제거한 1~1,000자만 허용한다. 최상위 댓글은 작성순 20개씩 cursor pagination하고 답글은 같은 relation query에 포함한다. 댓글·답글 생성과 `commentCount`, 댓글 좋아요 relation과 `likeCount`는 각각 같은 transaction에서 변경하며 대상 게시글과 댓글 row를 lock한다. soft delete된 댓글은 count에서 제외한다.

## 읽기 위치

반응형 화면에서 깨지는 pixel 값 대신 `0~1` scroll progress를 저장한다. 클라이언트는 일정 간격과 page hide 시점에만 저장하고, 서버는 로그인 세션의 user ID와 요청 post ID를 사용해 값을 clamp·검증한다. 에디터가 안정적인 block ID를 제공하게 되면 block anchor를 보조 값으로 추가하는 방안을 재검토한다.

## 조회수

렌더나 Next.js prefetch에서는 증가시키지 않는다. 상세 화면이 실제로 열린 뒤 별도 server endpoint가 signed HttpOnly random browser cookie를 발급하고, 서버 비밀값으로 HMAC한 `viewerKeyHash`와 날짜 bucket을 `GuidePostView`에 저장한다. IP 원문은 수집하지 않는다. `(postId, viewerKeyHash, viewedOn)` 복합 PK 생성과 `viewCount` 증가는 한 transaction에서 실행하며, 같은 브라우저·게시글·날짜의 충돌은 중복 조회로 처리한다.

## 알림

알림 문장은 저장하지 않고 `type`, actor, 대상 relation으로 UI에서 만든다. recipient와 actor가 같으면 생성하지 않는다. `dedupeKey`는 좋아요처럼 toggle 가능한 사건은 actor/type/target 조합, 댓글·답글은 생성된 comment ID를 포함한 결정적 값으로 만들어 중복 알림을 막는다. recipient 삭제 시 알림은 cascade 삭제하고, actor 삭제 시 `SET NULL`로 익명 표시한다.

좋아요 취소 시 읽지 않은 toggle 알림만 삭제하고, 이미 읽은 알림은 활동 이력으로 보존한다. 알림 목록은 recipient 세션으로 격리하며 최신순 25개 cursor pagination을 사용한다. 알림 클릭과 모두 읽음은 `recipientId=session.user.id` 조건으로만 `readAt`을 변경한다.

## 권한

작성·수정·삭제·좋아요·즐겨찾기·댓글·읽기 위치 API는 모두 Better Auth 서버 세션에서 user ID를 얻는다. client가 전달한 authorId나 recipientId를 신뢰하지 않는다. 게시글과 댓글 수정·삭제는 서버에서 작성자 일치 여부를 확인하고, 관리자 moderation은 별도 authorization layer에서 명시적으로 허용한다.

신고와 moderation의 role별 capability, 처리 이력, rate abuse 및 미디어 cleanup 운영 한계는 `COMMUNITY_MODERATION.md`에 기록한다.

## 시간과 목록

NEW는 컬럼으로 저장하지 않고 `createdAt`이 현재 시각 기준 24시간 이내인지 계산한다. 24시간 미만은 상대 시간, 이후는 `YYYY.MM.DD`로 표시한다. 기본 목록은 삭제되지 않은 글의 최신순이며 인기순은 `likeCount DESC, createdAt DESC`다.

## 다음 구현 단계

PHASE C에서는 좋아요, 즐겨찾기, 일별 중복 방지 조회수, 읽기 위치 저장·복원을 구현했다. signed viewer cookie는 1년 동안 `HttpOnly`, `SameSite=Lax`, production `Secure`로 유지하며 IP나 device fingerprint를 저장하지 않는다. 쿠키를 삭제하거나 다른 브라우저를 사용하면 별도 조회로 집계될 수 있다.

읽기 위치는 로그인 사용자별로 최대 4초 간격 및 page hide 시 저장한다. `0.05~0.95` 구간만 자동 복원하며 안내와 “처음부터 보기”를 제공한다. 댓글·답글·댓글 좋아요·알림·moderation과 조회수 abuse 고도화는 다음 단계 범위다.
