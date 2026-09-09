/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS 테스트에서 TypeScript 서버 모듈을 로드한다. */
const { test } = require('node:test');
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

const { parseWalkingRoute, walkingParams, validStop } = loadTs('app/lib/walkingRoute.ts');
const stops = [{ longitude: 127, latitude: 37 }, { longitude: 127.01, latitude: 37.01 }, { longitude: 127.02, latitude: 37.02 }];
test('경유지 순서와 WGS84 경도/위도를 유지한다', () => {
  const params = walkingParams(stops);
  assert.equal(params.get('start_x'), '127');
  assert.equal(params.get('via_x'), '127.01');
  assert.equal(params.get('via_y'), '37.01');
  assert.equal(params.get('end_y'), '37.02');
  assert.equal(walkingParams(stops.slice(0, 2)).has('via_x'), false);
  assert.equal(validStop({ latitude: 91, longitude: 127 }), false);
  assert.equal(validStop({ latitude: '37', longitude: 127 }), false);
});
const fixture = () => ({ status: 'OK', route: {
  properties: { totalDistance: 120, totalTime: 100 },
  legs: [{ properties: { distance: 120, time: 100 }, steps: [
    { path: { points: [[127, 37], [127.001, 37.002], [127.003, 37.003]] } },
  ] }],
} });
test('도로 굴곡 좌표와 미터/초를 보존하고 잘못된 응답은 거절한다', () => {
  const result = parseWalkingRoute(fixture(), 1);
  assert.equal(result.duration, 100);
  assert.deepEqual(result.legs[0].paths[0][1], [127.001, 37.002]);
  assert.throws(() => parseWalkingRoute({ status: 'ROUTE_RESULT_NOT_FOUND' }, 1));
  assert.throws(() => parseWalkingRoute(fixture(), 2));
  const invalid = fixture();
  invalid.route.legs[0].steps[0].path.points[1] = [127, 100];
  assert.throws(() => parseWalkingRoute(invalid, 1));
});
test('서버는 키를 클라이언트에 노출하지 않고 경로 API에만 전달한다', async () => {
  const { POST } = loadTs('app/api/courses/walk/route.ts');
  const previousKey = process.env.KAKAO_REST_API_KEY;
  const previousFetch = global.fetch;
  const request = points => new Request('http://localhost/api/courses/walk', {
    method: 'POST', body: JSON.stringify({ stops: points }),
  });
  try {
    delete process.env.KAKAO_REST_API_KEY;
    assert.equal((await POST(request(stops))).status, 503);
    assert.equal((await POST(request([stops[0]]))).status, 400);
    process.env.KAKAO_REST_API_KEY = 'private-test-key';
    global.fetch = async (url, options) => {
      assert.equal(new URL(url).pathname, '/v2/routing/walk');
      assert.equal(options.headers.Authorization, 'KakaoAK private-test-key');
      return Response.json(fixture());
    };
    const response = await POST(request(stops.slice(0, 2)));
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(text.includes('private-test-key'), false);
    assert.equal(JSON.parse(text).distance, 120);
    global.fetch = async () => new Response('', { status: 429 });
    assert.equal((await POST(request(stops))).status, 502);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.KAKAO_REST_API_KEY;
    else process.env.KAKAO_REST_API_KEY = previousKey;
  }
});
