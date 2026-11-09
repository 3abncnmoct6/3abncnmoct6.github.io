# 3abncnmoct6.github.io
Test

## 방명록 (GitHub Pages + Vercel Functions + Supabase)

화면(`guestbook.html`)은 GitHub Pages가, API(`api/guestbook.js`)는 Vercel이, 데이터는 Supabase가 맡습니다.

1. **Supabase**: 새 프로젝트를 만들고 SQL Editor에서 `supabase/guestbook.sql`을 실행합니다.
   Project Settings → API에서 `Project URL`과 `service_role` 키를 확인합니다.
2. **Vercel**: 이 저장소를 Import하고 (Framework Preset: Other) 환경 변수를 등록합니다.
   - `SUPABASE_URL`: Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role 키 (절대 커밋하거나 HTML에 넣지 마세요)
   - `ALLOWED_ORIGINS` (선택): 기본값 `https://3abncnmoct6.github.io`, 쉼표로 여러 개 지정
   - `IP_HASH_SALT` (선택): 도배 방지용 IP 해시에 쓰는 임의의 문자열
3. **연결**: `guestbook.html`의 `API_BASE`를 배포된 Vercel 주소(예: `https://xxx.vercel.app`)로 바꾸고 푸시합니다.

API: `GET /api/guestbook`은 최신 글 50개를 돌려주고, `POST /api/guestbook`은 `{ "name": "...", "message": "..." }`로 글을 저장합니다. 같은 IP에서는 1분에 3개까지만 쓸 수 있습니다.
