# Celeb Map (개발 중)

간단한 모바일 레이아웃의 Next.js 앱입니다. 셀럽(그룹) 기반으로 추천 맛집을 보여주는 UI 데모입니다.

## 개발 문서

- [PostGIS 설정 및 API 확인](docs/postgis-setup.md) — Supabase SQL Editor에서 실행할 SQL과 주변 맛집·관광지 통합 조회 API
- [코스 추천 기능 명세](docs/course-recommendation.md) — 후보 조회, 추천 기준, 방문 순서, 지도 경로, 코스 편집·재계산 규칙 및 개발 전 결정 사항

기능별 상세 요구사항은 `docs/`에서 관리합니다. 위 명세는 개발 기준이며 구현 완료를 의미하지 않습니다.

## 주요 기능
- 홈: 셀럽 카드 선택 → 해당 그룹 추천 맛집 목록 → 상세 보기
- 검색/코스/지도 탭(더미 UI)
- 하단 네비게이션 바

## 프로젝트 구조 (중요 파일)
- `app/page.tsx` — 메인 페이지(상태 보유, 탭 관리)
- `app/layout.tsx` — 공통 레이아웃
- `app/components/Navbar.tsx` — 하단 네비게이션
- `app/components/HomeView.tsx` — 홈 / 리스트 / 상세 뷰
- `app/components/SearchView.tsx` — 검색 뷰
- `app/components/CourseView.tsx` — 코스 뷰
- `app/components/MapView.tsx` — 지도 뷰
- `app/components/Icons.tsx` — (로컬 아이콘 모음, 필요시 lucide로 교체 가능)

## 개발 환경 및 실행
도보 코스 경로는 카카오 REST API의 `GET https://dapi.kakao.com/v2/routing/walk`를 사용합니다.
`.env`에 `KAKAO_REST_API_KEY=발급받은_REST_API_키`를 추가하고 개발 서버를 재시작하세요.
기존 `NEXT_PUBLIC_KAKAO_MAP_KEY`는 지도 SDK용 JavaScript 키이며 별도로 유지합니다.
배포 환경에도 서버 전용 `KAKAO_REST_API_KEY`를 설정해야 합니다.
코스 생성·편집 시 경유지를 포함해 조회하며, 지도에 도보 경로와 구간별 거리·예상 시간을 표시합니다.
조회에 실패하면 경로선을 표시하지 않고 직선거리와 재조회 버튼을 표시합니다.

Node.js와 npm이 설치되어 있어야 합니다.

설치:
```bash
npm install
```

만약 일부 아이콘 패키지(lucide-react 등)에서 peer dependency 충돌로 설치 실패할 경우, 아래 옵션으로 재시도하세요:
```bash
npm install --legacy-peer-deps
```

개발 서버 실행:
```bash
npm run dev
```

빌드/배포:
```bash
npm run build
npm start
```

## 스타일/아이콘
- Tailwind CSS를 사용합니다. (`globals.css`에 설정)
- 초기 구현에서는 로컬 SVG 아이콘과 `lucide-react` 중 선택하여 사용했습니다. 문제가 발생하면 `app/components/Icons.tsx`를 편집해 대체 가능합니다.

## 변경사항 요약
- 페이지 및 뷰들을 컴포넌트로 분리했습니다.
- 하단 네비게이션과 홈 스택 네비게이션(간단한 push/pop) 구현했습니다.
- 클릭 가능한 요소에 `cursor-pointer`를 적용했습니다.

## 다음으로 할 일(제안)
- 타입스크립트 타입 정리 (`selectedGroup` 등 `unknown` → 명시적 타입)
- 접근성(aria) 추가
- 반응형/테스트 강화

원하시면 README 내용을 더 자세히 채우거나, 배포(Verce/Netlify) 설정을 추가해 드리겠습니다.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
