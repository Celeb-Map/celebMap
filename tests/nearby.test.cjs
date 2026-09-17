/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS 테스트에서 TypeScript 서버 모듈을 로드한다. */
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// 기존 TypeScript 도구로 서버 모듈을 로드한다. 테스트용 추가 의존성은 없다.
function loadTs(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = mod.require.bind(mod);
  mod.require = (id) => id.startsWith('.')
    ? loadTs(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), id + '.ts')))
    : nativeRequire(id);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return mod.exports;
}

const originalFetch = global.fetch;
const envNames = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'API_KEY'];
const originalEnv = Object.fromEntries(envNames.map(key => [key, process.env[key]]));
afterEach(() => {
  global.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

function setupEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.API_KEY = 'test-tour-key';
}
const request = query => ({ nextUrl: new URL('http://localhost/api?' + query) });
const origin = { id: 1, longitude: 127, latitude: 37.5, kind: 'restaurant', source: 'supabase' };

test('언어별 관광지·숙박 코드를 사용하고 상세 조회도 같은 서비스로 연결한다', async () => {
  setupEnv();
  const { GET: nearby } = loadTs('app/api/tourism/nearby/route.ts');
  const { GET: detail } = loadTs('app/api/tourism/detail/[id]/route.ts');
  for (const [language, service, codes] of [['en', 'EngService2', ['76', '80']], ['ko', 'KorService2', ['12', '32']]]) {
    const calls = [];
    global.fetch = async input => {
      const url = new URL(String(input));
      assert.ok(url.pathname.includes(service));
      calls.push(url.searchParams.get('contentTypeId'));
      return Response.json(tourResult([{ contentid: '264455', title: language === 'en' ? 'Seoul Plaza' : '서울광장', mapx: '127', mapy: '37.5', overview: '<b>Overview</b>' }]));
    };
    const response = await nearby(request(`longitude=127&latitude=37.5&lang=${language}`));
    assert.equal(response.status, 200);
    assert.deepEqual(calls, codes);
    const data = await response.json();
    assert.deepEqual(data.places.map(place => place.kind), ['attraction', 'accommodation']);
    const details = await detail(request(`lang=${language}&contentTypeId=${codes[0]}`), { params: Promise.resolve({ id: data.places[0].id }) });
    assert.equal((await details.json()).detail.overview, 'Overview');
    assert.equal(calls.at(-1), codes[0]);
  }
});

test('영문 코스 후보의 언어를 유지하고 상세 오류 응답에 인증키를 노출하지 않는다', async () => {
  setupEnv();
  global.fetch = async input => {
    const url = new URL(String(input));
    if (url.hostname === 'example.supabase.co') return Response.json(rpcResult(2000, 4));
    assert.ok(url.pathname.includes('EngService2'));
    assert.equal(url.searchParams.get('contentTypeId'), '76');
    return Response.json(tourResult([{ contentid: '100', title: 'English attraction', mapx: '127', mapy: '37.5' }]));
  };
  const { GET } = loadTs('app/api/courses/candidates/route.ts');
  const data = await (await GET(request('restaurantId=1&lang=en'))).json();
  assert.equal(data.places.find(place => place.source === 'tourapi').title, 'English attraction');
  const { GET: detail } = loadTs('app/api/tourism/detail/[id]/route.ts');
  global.fetch = async () => { throw new Error('https://example.com?serviceKey=test-tour-key'); };
  const error = await detail(request('lang=en'), { params: Promise.resolve({ id: '100' }) });
  assert.equal(error.status, 502);
  const body = await error.text();
  assert.ok(!body.includes('test-tour-key'));
  assert.match(body, /Unable/);
});

test('번역은 동적 값을 보존하고 미등록 장소명은 원문을 유지한다', () => {
  const { translate } = loadTs('app/lib/translations.ts');
  assert.equal(translate('en', '검색'), 'Search');
  assert.equal(translate('ko', '검색'), '검색');
  assert.equal(translate('en', '직선 {distance}', { distance: '1.2km' }), 'Straight-line 1.2km');
  assert.equal(translate('en', '영문 미등록 가게'), '영문 미등록 가게');
  for (const file of fs.readdirSync(path.resolve(__dirname, '../app/components')).filter(file => file.endsWith('.tsx'))) {
    const source = ts.createSourceFile(file, fs.readFileSync(path.resolve(__dirname, '../app/components', file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === 't' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && /[가-힣]/.test(node.arguments[0].text)) {
        assert.notEqual(translate('en', node.arguments[0].text), node.arguments[0].text, `Missing translation in ${file}: ${node.arguments[0].text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});
test('코스 초안은 출발지를 고정하고 중복 없이 직전 장소에서 가까운 후보를 고른다', () => {
  const { buildCourseDraft } = loadTs('app/lib/courseDraft.ts');
  const start = { ...origin, candidateId: 'supabase:1' };
  const a = { ...start, id: 2, candidateId: 'supabase:2', longitude: 127.001 };
  const b = { ...start, id: 3, candidateId: 'tourapi:3', kind: 'attraction', longitude: 127.002 };
  const c = { ...start, id: 4, candidateId: 'tourapi:4', kind: 'attraction', longitude: 127.003 };
  assert.deepEqual(buildCourseDraft(start, [c, start, b, a, a], 4, false).map(p => p.candidateId), ['supabase:1', 'supabase:2', 'tourapi:3', 'tourapi:4']);
  assert.deepEqual(buildCourseDraft(start, [a, b, c], 4, true).map(p => p.candidateId), ['supabase:1', 'tourapi:3', 'tourapi:4']);
});

test('순서를 바꾸면 구간 거리 합계도 달라진다', () => {
  const { straightDistance } = loadTs('app/lib/courseDraft.ts');
  const a = { ...origin, longitude: 127 };
  const b = { ...origin, longitude: 127.01 };
  const c = { ...origin, longitude: 127.02 };
  assert.ok(straightDistance(a, c) + straightDistance(c, b) > straightDistance(a, b) + straightDistance(b, c));
  assert.equal(straightDistance(a, a), 0);
});
function rpcResult(radius, count) {
  return { origin, radiusMeters: radius, distanceType: 'geodesic', places: Array.from({ length: count }, (_, i) => ({
    ...origin, id: i + 2, title: '맛집', distanceMeters: 100 + i,
  })) };
}
function tourResult(items) {
  return { response: { header: { resultCode: '0000' }, body: { totalCount: items.length, items: { item: items } } } };
}

test('잘못된 ID와 반경은 외부 호출 전에 거절한다', async () => {
  global.fetch = () => { throw new Error('외부 호출 금지'); };
  const { GET } = loadTs('app/api/restaurants/nearby/route.ts');
  for (const query of ['', 'restaurantId=abc', 'restaurantId=1&radius=9999', 'restaurantId=1.5']) {
    assert.equal((await GET(request(query))).status, 400);
  }
});

test('검색 함수 미설치는 503과 설정 안내를 반환한다', async () => {
  setupEnv();
  global.fetch = async () => Response.json({ code: 'PGRST202', message: 'not found' }, { status: 404 });
  const { GET } = loadTs('app/api/restaurants/nearby/route.ts');
  const response = await GET(request('restaurantId=1'));
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /postgis-setup/);
});

test('통합 후보 부족 시 두 공급원 모두 3km로 확대하고 ID 충돌을 방지한다', async () => {
  setupEnv();
  const radii = [];
  global.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === 'example.supabase.co') {
      const body = JSON.parse(init.body);
      radii.push(['db', body.p_radius_meters]);
      assert.equal(body.p_restaurant_id, 1);
      return Response.json(rpcResult(body.p_radius_meters, body.p_radius_meters === 2000 ? 1 : 3));
    }
    radii.push(['tour', Number(url.searchParams.get('radius'))]);
    assert.equal(url.searchParams.get('mapX'), '127');
    assert.equal(url.searchParams.get('mapY'), '37.5');
    assert.equal(url.searchParams.get('contentTypeId'), '12');
    return Response.json(tourResult([{ contentid: '2', title: '관광지', mapx: '127.001', mapy: '37.501', dist: '200' }]));
  };
  const { GET } = loadTs('app/api/courses/candidates/route.ts');
  const response = await GET(request('restaurantId=1'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.expanded, true);
  assert.equal(data.returnedCount, 4);
  assert.equal(data.scheduleValidated, false);
  assert.deepEqual(radii, [['db', 2000], ['tour', 2000], ['db', 3000], ['tour', 3000]]);
  assert.ok(data.places.some(p => p.candidateId === 'supabase:2'));
  assert.ok(data.places.some(p => p.candidateId === 'tourapi:2'));
});

test('명시적 반경은 후보 부족에도 유지하고 관광지 중복 ID를 제거한다', async () => {
  setupEnv();
  let calls = 0;
  global.fetch = async input => {
    calls++;
    if (String(input).includes('supabase.co')) return Response.json(rpcResult(2000, 0));
    const item = { contentid: '9', title: '관광지', mapx: '127', mapy: '37.5', dist: '100' };
    return Response.json(tourResult([item, item]));
  };
  const { GET } = loadTs('app/api/courses/candidates/route.ts');
  const data = await (await GET(request('restaurantId=1&radius=2000'))).json();
  assert.equal(calls, 2);
  assert.equal(data.expanded, false);
  assert.equal(data.places.length, 1);
});

test('관광지 좌표 오류를 제외하고 누락 거리를 0m로 표시하지 않는다', async () => {
  setupEnv();
  global.fetch = async () => Response.json(tourResult([
    { contentid: '1', title: '빈 좌표', mapx: '', mapy: '' },
    { contentid: '2', title: '범위 초과', mapx: '181', mapy: '37' },
    { contentid: '3', title: '정상', mapx: '127', mapy: '37' },
  ]));
  const { getNearbyTourism } = loadTs('app/lib/nearbyTourism.ts');
  const data = await getNearbyTourism(127, 37, 2000, true);
  assert.equal(data.places.length, 1);
  assert.equal(data.places[0].distanceMeters, null);
});

test('관광지 API 실패를 빈 정상 결과로 숨기지 않는다', async () => {
  setupEnv();
  global.fetch = async input => String(input).includes('supabase.co')
    ? Response.json(rpcResult(2000, 4)) : new Response('error', { status: 500 });
  const { GET } = loadTs('app/api/courses/candidates/route.ts');
  assert.equal((await GET(request('restaurantId=1'))).status, 502);
});

test('반복 요청마다 관광지 API를 다시 호출하고 응답 캐시를 금지한다', async () => {
  setupEnv();
  let tourCalls = 0;
  global.fetch = async (input, init) => {
    if (String(input).includes('supabase.co')) return Response.json(rpcResult(2000, 4));
    tourCalls++;
    assert.equal(init.cache, 'no-store');
    return Response.json(tourResult([{ contentid: String(tourCalls), title: '관광지', mapx: '127', mapy: '37.5' }]));
  };
  const { GET } = loadTs('app/api/courses/candidates/route.ts');
  for (let i = 1; i <= 2; i++) {
    const response = await GET(request('restaurantId=1&radius=2000'));
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const data = await response.json();
    assert.ok(data.places.some(place => place.candidateId === `tourapi:${i}`));
  }
  assert.equal(tourCalls, 2);
});
