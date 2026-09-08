/* eslint-disable @typescript-eslint/no-require-imports -- 독립적인 브라우저 스모크 테스트. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const restaurant = { id: 1, name: '출발 맛집', category: '한식', distance: '', rating: 0, reviewCount: 0, recom: ['BTS'], location: '서울 테스트 주소', latitude: 37.5, longitude: 127, hours: '', priceRange: '', tags: [], liked: false, colorFrom: 'from-plum-300', colorTo: 'to-plum-100' };
    const origin = { id: 1, source: 'supabase', kind: 'restaurant', title: '출발 맛집', address: '서울', latitude: 37.5, longitude: 127 };
    const places = Array.from({ length: 7 }, (_, index) => ({ ...origin, id: index + 2, source: index < 4 ? 'tourapi' : 'supabase', kind: index < 4 ? 'attraction' : 'restaurant', candidateId: `${index < 4 ? 'tourapi' : 'supabase'}:${index + 2}`, title: index < 4 ? `관광지 ${index + 1}` : `주변 맛집 ${index + 1}`, longitude: 127 + (index + 1) * 0.001, distanceMeters: (index + 1) * 100 }));
    await page.route('**/api/catalog', route => route.fulfill({ json: { restaurants: [restaurant] } }));
    await page.route('**/api/tourism/nearby?**', route => route.fulfill({ json: { totalCount: 0, places: [] } }));
    let candidateCalls = 0;
    await page.route('**/api/courses/candidates?**', route => { candidateCalls++; return route.fulfill({ json: { origin, places, radiusMeters: 2000 } }); });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.getByText('BTS', { exact: true }).first().click();
    await page.getByText('출발 맛집', { exact: true }).first().click();
    await page.getByRole('button', { name: /이 맛집에서 추천 코스 만들기/ }).click();
    await page.getByRole('button', { name: '추천 코스 생성', exact: true }).click();
    await page.getByRole('heading', { name: '나의 여행 코스' }).waitFor();
    const panel = page.getByRole('region', { name: '나의 여행 코스' });
    assert.equal(await panel.locator('ol > li').count(), 5);
    await panel.getByRole('button', { name: '관광지 2 위로 이동', exact: true }).click();
    assert.match(await panel.locator('ol > li').nth(1).innerText(), /관광지 2/);
    await panel.getByRole('button', { name: '관광지 2 코스에서 삭제', exact: true }).click();
    assert.equal(await panel.locator('ol > li').count(), 4);
    await panel.getByRole('button', { name: '주변 맛집 5 코스 끝에 추가', exact: true }).click();
    assert.equal(await panel.locator('ol > li').count(), 5);
    assert.match(await panel.locator('ol > li').last().innerText(), /주변 맛집 5/);
    await panel.getByRole('button', { name: '코스 접기', exact: true }).click();
    await panel.getByRole('button', { name: '코스 펼치기', exact: true }).click();
    await page.screenshot({ path: 'tests/course-ui-preview.png' });
    await panel.getByRole('button', { name: '새로 추천받기', exact: true }).click();
    await page.waitForFunction(() => !document.body.innerText.includes('주변 장소를 찾고 있어요'));
    assert.equal(candidateCalls, 2);
    await panel.getByRole('button', { name: '코스 닫고 주변 장소 보기', exact: true }).click();
    await page.getByRole('button', { name: /이 맛집에서 추천 코스 만들기/ }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: 생성, 5곳 표시, 순서 변경, 삭제, 추가, 접기/펼치기, 재조회, 닫기');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
