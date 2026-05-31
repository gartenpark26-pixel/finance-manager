# Family Finance

혼자(혹은 가족 단위로) 쓰는 개인 재무 관리 웹앱. 주식 포트폴리오와 지출을 한곳에서 본다.

## 스택

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS, Recharts
- Prisma + PostgreSQL (Supabase 권장)
- NextAuth.js (Credentials — 단일 비밀번호)
- yahoo-finance2 (Yahoo Finance 시세 조회)

## 시작하기

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 (.env.local 또는 .env)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
APP_PASSWORD="your-initial-password"

# 3) DB 스키마 생성 + 시드
npx prisma migrate dev --name init
npx prisma db seed

# 4) 개발 서버
npm run dev
```

## 페이지

- `/` 대시보드 (전체 평가금액, 이번 달 지출, 최근 지출)
- `/portfolio` 포트폴리오 (탭별 보유 종목 / 도넛 차트 / 추가·수정·삭제)
- `/expenses` 지출 (빠른 입력, 기간 필터, 카테고리 파이/월별 바 차트)
- `/settings` 카테고리·포트폴리오·비밀번호 관리

## 인증

- 단일 비밀번호. 최초 비밀번호는 `APP_PASSWORD` 환경변수.
- `/settings`에서 변경하면 DB에 bcrypt 해시로 저장되고 이후로는 DB값이 우선.
- 세션 유지 기간 30일.

## 주가 조회 캐시

- `PriceCache`에 `(ticker, price, currency, fetchedAt)` 저장.
- 같은 날 데이터가 있으면 재조회하지 않음.
- 조회 실패 시 마지막 캐시 값을 사용하고 UI에 stale 표시.
- USD/KRW 환율은 `KRW=X`로 별도 캐시, 6시간 TTL.

## 배포 (Vercel)

1. GitHub에 push 후 Vercel 프로젝트 연결
2. 위 환경변수 4개 설정 (`NEXTAUTH_URL`은 실제 도메인으로)
3. `npm run build`가 `prisma generate`를 실행하므로 별도 설정 불필요
