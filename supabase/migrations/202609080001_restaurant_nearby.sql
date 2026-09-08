-- Supabase SQL Editor에서 전체 실행. 기존 좌표 및 RLS 정책은 유지한다.
-- PostGIS가 public / extensions / gis 중 어느 스키마에 설치되어도 감지한다.
begin;

do $migration$
declare
  gis_schema text;
begin
  select n.nspname into gis_schema
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'postgis';
  if gis_schema is null then
    raise exception 'PostGIS 확장을 먼저 활성화하세요.';
  end if;

  -- 문자열/숫자 좌표 모두 처리하며 잘못된 좌표는 검색에서 제외한다.
  execute format($ddl$
    create or replace function public.celeb_map_point(lon_text text, lat_text text)
    returns %1$I.geography
    language plpgsql immutable strict parallel safe
    set search_path = pg_catalog
    as $body$
    declare lon double precision; lat double precision;
    begin
      lon := nullif(trim(lon_text), '')::double precision;
      lat := nullif(trim(lat_text), '')::double precision;
      if lon is null or lat is null or not (lon between -180 and 180)
        or not (lat between -90 and 90) or (lon = 0 and lat = 0) then
        return null;
      end if;
      return %1$I.st_setsrid(%1$I.st_makepoint(lon, lat), 4326)::%1$I.geography;
    exception when invalid_text_representation or numeric_value_out_of_range then
      return null;
    end;
    $body$
  $ddl$, gis_schema);

  execute format($ddl$
    alter table public.restaurant add column if not exists course_location %1$I.geography(Point, 4326)
      generated always as (public.celeb_map_point(longitude::text, latitude::text)) stored
  $ddl$, gis_schema);

  create index if not exists restaurant_course_location_gist
    on public.restaurant using gist (course_location);

  execute format($ddl$
    create or replace function public.nearby_restaurants(
      p_restaurant_id bigint,
      p_radius_meters integer default 2000,
      p_limit integer default 30
    ) returns jsonb
    language plpgsql stable security invoker
    set search_path = pg_catalog, public, %1$I
    as $body$
    declare
      origin public.restaurant%%rowtype;
      places jsonb;
    begin
      if p_restaurant_id is null or p_radius_meters is null or p_radius_meters < 1
        or p_radius_meters > 3000 or p_limit is null or p_limit < 1 or p_limit > 100 then
        raise exception '잘못된 검색 조건입니다.' using errcode = '22023';
      end if;
      select * into origin from public.restaurant where id = p_restaurant_id;
      if not found then
        raise exception '출발 맛집을 찾을 수 없습니다.' using errcode = 'P0002';
      end if;
      if origin.course_location is null then
        raise exception '출발 맛집의 유효한 좌표가 없습니다.' using errcode = '22023';
      end if;

      select coalesce(jsonb_agg(jsonb_build_object(
        'id', q.id, 'source', 'supabase', 'kind', 'restaurant',
        'title', q.name_ko, 'category', q.category, 'address', q.address,
        'hours', q.business_hours,
        'longitude', %1$I.st_x(q.course_location::%1$I.geometry),
        'latitude', %1$I.st_y(q.course_location::%1$I.geometry),
        'distanceMeters', round(q.distance_meters)::integer
      ) order by q.distance_meters, q.id), '[]'::jsonb) into places
      from (
        select r.id, r.name_ko, r.category, r.address, r.business_hours, r.course_location,
          %1$I.st_distance(r.course_location, origin.course_location) as distance_meters
        from public.restaurant r
        where r.id <> origin.id
          and r.course_location is not null
          and %1$I.st_dwithin(r.course_location, origin.course_location, p_radius_meters)
        order by distance_meters, r.id
        limit p_limit
      ) q;

      return jsonb_build_object(
        'origin', jsonb_build_object(
          'id', origin.id, 'source', 'supabase', 'kind', 'restaurant',
          'title', origin.name_ko, 'address', origin.address,
          'longitude', %1$I.st_x(origin.course_location::%1$I.geometry),
          'latitude', %1$I.st_y(origin.course_location::%1$I.geometry)
        ),
        'radiusMeters', p_radius_meters, 'distanceType', 'geodesic',
        'places', places
      );
    end;
    $body$
  $ddl$, gis_schema);
end;
$migration$;

-- SECURITY INVOKER: 호출자의 SELECT 권한과 기존 RLS를 따른다.
-- 테이블 권한/RLS를 새로 열지 않는다.
revoke all on function public.nearby_restaurants(bigint, integer, integer) from public;
grant execute on function public.nearby_restaurants(bigint, integer, integer) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
commit;
