/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser smoke test. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/dapi.kakao.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `window.kakao={maps:{load:cb=>cb(),LatLng:class{},Map:class{addControl(){}relayout(){}setCenter(){}},ZoomControl:class{},ControlPosition:{RIGHT:1},CustomOverlay:class{setMap(){}},Polyline:class{setMap(){}}}};` }));
    const restaurant = { id: 1, name: '테스트 맛집', english: { name: 'Test Restaurant', address: 'Seoul' }, category: '한식', distance: '주소 확인', rating: 0, reviewCount: 0, recom: ['BTS'], location: '서울', latitude: 37.5, longitude: 127, hours: '영업시간 정보 없음', priceRange: '', tags: [], liked: false, colorFrom: 'from-plum-300', colorTo: 'to-plum-100' };
    await page.route('**/api/catalog', route => route.fulfill({ json: { restaurants: [restaurant] } }));
    const languages = [];
    await page.route('**/api/tourism/nearby?**', async route => {
      const language = new URL(route.request().url()).searchParams.get('lang');
      languages.push(language);
      await route.fulfill({ json: { totalCount: 1, places: [{ id: language === 'en' ? '200' : '100', kind: 'attraction', contentTypeId: language === 'en' ? '76' : '12', title: language === 'en' ? 'English Attraction' : '한국어 관광지', address: language === 'en' ? 'Seoul' : '서울', imageUrl: null, longitude: 127, latitude: 37.5, distanceMeters: 100 }] } });
    });
    await page.route('**/api/tourism/detail/**', route => {
      assert.equal(new URL(route.request().url()).searchParams.get('lang'), 'en');
      assert.ok(route.request().url().includes('/200?'));
      return route.fulfill({ json: { detail: { title: 'English Attraction', address: 'Seoul', overview: 'English place description.', telephone: '', zipcode: '', imageUrl: null } } });
    });
    await page.goto(process.env.TEST_BASE_URL || 'http://localhost:3000', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByText('Whose favorite spots will you explore?', { exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await page.screenshot({ path: '.next/language-home-en.png' });
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByPlaceholder('Search celebrities or restaurants').fill('bts');
    await page.getByText('Test Restaurant', { exact: true }).click();
    await page.getByText('English Attraction', { exact: true }).click();
    await page.getByText('English place description.', { exact: true }).waitFor();
    await page.screenshot({ path: '.next/language-detail-en.png' });
    await page.getByRole('button', { name: 'Close place details', exact: true }).last().click();
    await page.getByRole('button', { name: 'My page', exact: true }).click();
    await page.getByRole('button', { name: '한국어', exact: true }).click();
    await page.getByRole('button', { name: '지도', exact: true }).click();
    await page.getByText('한국어 관광지', { exact: true }).waitFor();
    assert.equal(await page.getByText('English Attraction', { exact: true }).count(), 0);
    assert.deepEqual(languages, ['en', 'ko']);
    await page.getByRole('button', { name: '홈', exact: true }).click();
    await page.getByText('어떤 셀럽의 맛집으로 떠나볼까요?', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: language toggle, persistence, English celebrity search, English place details, Korean reset, no browser errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
