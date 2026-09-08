# PostGIS 주변 맛집 검색 설정

## 현재 준비된 내용

- 실제 `public.restaurant`에서 `id`, `latitude`, `longitude` 컬럼과 좌표 샘플을 읽어 확인했다.
- 공간 컬럼·인덱스·RPC 생성 SQL 및 Next.js API를 작성했다.
- **2026-09-08 사용자 SQL 실행 후 원격 RPC 호출 성공을 확인했다.** 맛집 ID 1, 반경 2km에서 출발지 제외 맛집 6곳을 조회했으며 모두 반경 내였다.
- 같은 출발 좌표로 TourAPI 실시간 호출 시 유효한 좌표가 있는 관광지 5곳을 확인했다. 개수는 조회 시점에 따라 달라진다.
- 관광지 목록·상세는 요청마다 TourAPI를 호출한다. 응답을 Supabase나 파일에 저장하지 않는다. 외부 fetch와 성공 응답에 `no-store`를 적용한다. 현재 응답 처리·화면 표시를 위한 메모리 사용만 허용한다.

## 1. SQL 한 번 실행

PostGIS 확장이 활성화된 Supabase 프로젝트에서 **SQL Editor → New query**를 연다.

현재 프로젝트에는 적용을 완료했다. 아래는 신규 환경에서의 설정 절차이며 다시 실행할 필요는 없다.

[설정 SQL](../supabase/migrations/202609080001_restaurant_nearby.sql)의 전체 내용을 붙여 넣고 실행한다.

SQL이 하는 일:

1. PostGIS가 설치된 스키마를 자동으로 찾는다.
2. 기존 위도·경도로 `course_location` 공간 컬럼을 생성한다.
3. GiST 공간 인덱스를 만든다.
4. `nearby_restaurants` 검색 함수를 만든다.

기존 좌표를 삭제하지 않는다. 공간 컬럼은 생성 컬럼이므로 맛집 좌표 추가·수정 시 자동으로 갱신된다. 좌표가 비어 있거나 형식·범위가 잘못되면 공간 값은 NULL이며 검색에서 제외된다. `(0, 0)`도 미설정 좌표로 취급한다.

검색 함수는 `SECURITY INVOKER`이며 기존 SELECT 권한과 RLS 정책을 따른다. SQL Editor에서는 보이는데 앱 결과가 다르면 호출자의 RLS 정책을 확인한다. 이 SQL은 RLS를 끄거나 테이블 공개 정책을 추가하지 않는다.

## 2. SQL Editor에서 확인

```sql
select id, name_ko, latitude, longitude, course_location is not null as searchable
from public.restaurant
order by id
limit 10;

-- 1 대신 유효한 좌표가 있는 실제 맛집 ID를 넣어도 된다.
select public.nearby_restaurants(1, 2000, 30);
```

결과에는 출발 맛집(`origin`)과 출발지를 제외한 반경 내 맛집(`places`)이 담긴다. 거리는 직선거리 성격의 지표면 거리이며 실제 도보 거리나 이동 시간이 아니다.

## 3. 앱 API 확인

`npm run dev`로 실행하고 브라우저에서 아래 주소를 연다. 포트와 맛집 ID는 실행 환경에 맞춘다.

```text
http://localhost:3000/api/restaurants/nearby?restaurantId=1&radius=2000
http://localhost:3000/api/courses/candidates?restaurantId=1
```

| API | 동작 |
| --- | --- |
| `/api/restaurants/nearby` | PostGIS로 주변 맛집 최대 30곳 조회. 기본 반경 2km |
| `/api/courses/candidates` | 맛집과 TourAPI 관광지 후보를 합침. 숙소 제외 |
| `/api/tourism/nearby` | 기존 관광지·숙소 조회 유지. 선택적으로 `radius=2000` 또는 `3000` 지원 |

두 신규 API는 `restaurantId`를 필수로 받는다. `radius`는 2000 또는 3000만 허용한다.

통합 후보 API에서 반경을 생략하면 2km부터 조회하고 **출발지 외 후보가 4곳 미만이면 3km로 다시 조회**한다. 반경을 명시하면 자동 확대하지 않는다. 이는 초기 후보 개수 기준이며 영업시간을 확인해 확대하는 기능은 아직 아니다.

통합 응답의 `places`에는 `candidateId`(`supabase:ID` 또는 `tourapi:ID`), `source`, `kind`, 이름·좌표·거리가 포함된다. 출처 내 중복 ID는 제거한다. TourAPI는 현재 관광지 최대 20곳을 조회하므로 전체 관광지 목록을 보장하지 않는다. `returnedCount`는 실제 반환 후보 수다.

출발 좌표를 사용해 두 공급원을 조회하며 후보는 출발지 거리순으로 반환한다. 이 정렬은 최종 방문 순서가 아니다. `scheduleValidated: false`는 방문 가능 시간을 아직 검증하지 않았다는 의미다. 거리 누락은 0m 대신 NULL로 표시한다.

## 오류 처리

- 400: 잘못된 맛집 ID 또는 반경
- 404: 출발 맛집이 없거나 호출자에게 보이지 않음
- 422: 출발 맛집의 유효한 좌표 없음
- 503: 검색 함수 미설치. SQL 적용 후 다시 확인
- 502: DB 권한·연결 또는 관광지 API 조회 실패

통합 조회에서 관광지 API가 실패하면 502를 반환한다. 누락된 공급원 데이터를 정상적인 전체 후보로 표시하지 않는다.

## 다음 구현 범위

지도 화면의 코스 생성 버튼에서 후보 API를 호출한다. 가까운 후보를 연결하는 4~5곳 초안, 지도 번호, 장소 삭제·이동·추가를 구현했다. 방문시간·테마·신뢰도 평가와 실제 길찾기는 [기능 명세](course-recommendation.md)에 따라 이어서 구현한다.

## 로컬 검증

```text
node --test tests/nearby.test.cjs
npx tsc --noEmit --incremental false
```

테스트는 외부 응답을 대체해 입력 검증, 함수 미설치 안내, 반경 확대, 후보 병합, 좌표 누락, 관광지 API 실패를 확인한다. 실제 anon 역할의 PostGIS 함수 호출과 TourAPI 호출도 위 샘플로 확인했다. 모든 장소·권한 조합에 대한 검증을 의미하지는 않는다.
