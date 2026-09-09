"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, LoaderCircle, MapPin, Plus, Route, Sparkles, Trash2, X } from 'lucide-react';
import type { Restaurant } from '../lib/types';
import type { KakaoMap, KakaoMapsApi } from '../lib/kakaoMapLoader';
import { buildCourseDraft, straightDistance, type CoursePlace } from '../lib/courseDraft';
import type { WalkingRoute } from '../lib/walkingRoute';

type CandidateResponse = { origin: Omit<CoursePlace, 'candidateId'>; places: CoursePlace[]; radiusMeters: number; message?: string };
const distanceLabel = (meters: number) => meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;

export default function CoursePlanner({ restaurant, map, maps, onClose }: {
  restaurant: Restaurant; map: KakaoMap | null; maps: KakaoMapsApi | null; onClose: () => void;
}) {
  const [count, setCount] = useState(5);
  const [attractionsOnly, setAttractionsOnly] = useState(false);
  const [stops, setStops] = useState<CoursePlace[]>([]);
  const [candidates, setCandidates] = useState<CoursePlace[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(2000);
  const [collapsed, setCollapsed] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [walkResult, setWalkResult] = useState<{ key: string; route?: WalkingRoute; error?: string } | null>(null);
  const [walkAttempt, setWalkAttempt] = useState(0);
  const walkKey = JSON.stringify(stops.map(({ latitude, longitude }) => ({ latitude, longitude })));
  const currentWalk = walkResult?.key === walkKey ? walkResult : null;
  const walk = currentWalk?.route;

  useEffect(() => {
    if (JSON.parse(walkKey).length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/courses/walk', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stops: JSON.parse(walkKey) }), signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || '도보 경로를 조회하지 못했어요.');
        if (!controller.signal.aborted) setWalkResult({ key: walkKey, route: data });
      } catch (error) {
        if (!controller.signal.aborted) setWalkResult({ key: walkKey, error: error instanceof Error ? error.message : '도보 경로를 조회하지 못했어요.' });
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [walkKey, walkAttempt]);

  useEffect(() => {
    if (!map || !maps || !walk) return;
    const lines = walk.legs.flatMap(leg => leg.paths.filter(path => path.length >= 2).map(path => new maps.Polyline({
      map, path: path.map(([longitude, latitude]) => new maps.LatLng(latitude, longitude)),
      strokeWeight: 5, strokeColor: '#7c3aed', strokeOpacity: 0.85, strokeStyle: 'solid',
    })));
    return () => lines.forEach(line => line.setMap(null));
  }, [map, maps, walk]);

  useEffect(() => {
    titleRef.current?.focus();
    return () => controllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!map || !maps) return;
    const extraPlace = candidates.find(place => place.candidateId === activeId && !stops.some(stop => stop.candidateId === activeId));
    const markedPlaces = extraPlace ? [...stops.slice(1), extraPlace] : stops.slice(1);
    const overlays = markedPlaces.map(place => {
      const order = stops.findIndex(stop => stop.candidateId === place.candidateId) + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-700 ${place.candidateId === activeId ? 'bg-neon-400 text-plum-900 ring-2 ring-plum-700/20' : 'bg-plum-700 text-white'}`;
      button.textContent = order ? String(order) : '+';
      button.setAttribute('aria-label', `${order ? `${order}번` : '주변 맛집'} ${place.title ?? '장소'} 위치 보기`);
      const position = new maps.LatLng(place.latitude, place.longitude);
      button.addEventListener('click', () => { setActiveId(place.candidateId); map.setCenter(position); });
      const wrapper = document.createElement('div');
      wrapper.className = 'relative flex flex-col items-center';
      if (place.candidateId === activeId) {
        const label = document.createElement('div');
        label.className = 'pointer-events-none absolute bottom-full mb-1 max-w-36 truncate rounded-md bg-plum-700 px-2 py-1 text-[10px] font-bold text-white shadow-sm';
        label.textContent = place.title ?? '장소';
        wrapper.appendChild(label);
      }
      wrapper.appendChild(button);
      return new maps.CustomOverlay({ map, position, content: wrapper, xAnchor: 0.5, yAnchor: 0.5, zIndex: place.candidateId === activeId ? 30 : 10 });
    });
    return () => overlays.forEach(overlay => overlay.setMap(null));
  }, [stops, activeId, candidates, map, maps]);

  async function generate() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');
    setError('');
    try {
      const load = async (radius?: number) => {
        const response = await fetch(`/api/courses/candidates?restaurantId=${restaurant.id}${radius ? `&radius=${radius}` : ''}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json() as CandidateResponse;
        if (!response.ok) throw new Error(data.message ?? '주변 장소를 불러오지 못했어요.');
        return data;
      };
      let data = await load();
      if (controller.signal.aborted) return;
      const origin = { ...data.origin, candidateId: `supabase:${data.origin.id}` };
      let draft = buildCourseDraft(origin, data.places, count, attractionsOnly);
      if (draft.length < count && data.radiusMeters < 3000) {
        data = await load(3000);
        if (controller.signal.aborted) return;
        draft = buildCourseDraft(origin, data.places, count, attractionsOnly);
      }
      if (draft.length < count) throw new Error(`${data.radiusMeters / 1000}km 안에 선택한 구성의 장소가 부족해요. 장소 수나 구성을 바꿔 주세요.`);
      setCandidates(data.places);
      setStops(draft);
      setRadius(data.radiusMeters);
      setActiveId(null);
      setStatus('ready');
      setShowOptions(false);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');
      setStatus('error');
    }
  }

  function focus(place: CoursePlace) {
    setActiveId(place.candidateId);
    if (map && maps) {
      map.setCenter(new maps.LatLng(place.latitude, place.longitude));
      setCollapsed(true);
    }
  }

  function move(index: number, offset: number) {
    setStops(current => {
      const next = [...current];
      const target = index + offset;
      if (index < 1 || target < 1 || target >= current.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const totalDistance = stops.reduce((total, place, index) => index ? total + straightDistance(stops[index - 1], place) : total, 0);
  const nearbyRestaurants = candidates.filter(place => place.kind === 'restaurant' && !stops.some(stop => stop.candidateId === place.candidateId));
  const busy = status === 'loading';

  return (
    <section aria-labelledby="course-planner-title" className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col overflow-hidden rounded-t-[28px] border border-plum-100 bg-white shadow-[0_-12px_40px_rgba(60,26,71,0.18)] ${collapsed ? 'h-24' : 'h-[62%]'}`}>
      <div className="flex shrink-0 items-center gap-3 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-plum-700 text-neon-400"><Route size={20} /></span>
        <div className="min-w-0 flex-1"><h2 ref={titleRef} tabIndex={-1} id="course-planner-title" className="text-base font-black text-plum-900 outline-none">{stops.length ? '나의 여행 코스' : '오늘은 어디까지 가볼까요?'}</h2><p className="mt-0.5 truncate text-xs text-plum-500">{stops.length ? `${stops.length}곳 · ${walk ? `도보 ${distanceLabel(walk.distance)} · 약 ${Math.ceil(walk.duration / 60)}분` : `구간 직선거리 합계 ${distanceLabel(totalDistance)}`}` : `${restaurant.name}에서 출발해요`}</p></div>
        <button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? '코스 펼치기' : '코스 접기'} aria-expanded={!collapsed} className="rounded-full p-2 text-plum-600"><ChevronDown size={18} className={collapsed ? 'rotate-180' : ''} /></button>
        <button type="button" onClick={onClose} aria-label="코스 닫고 주변 장소 보기" className="rounded-full p-2 text-plum-500"><X size={18} /></button>
      </div>
      {!collapsed && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
        <div className="rounded-2xl bg-plum-50 p-3">
          {stops.length > 0 && <button type="button" onClick={() => setShowOptions(value => !value)} aria-expanded={showOptions} className="flex w-full items-center justify-between text-xs font-bold text-plum-600"><span>추천 설정 · {count}곳 · {attractionsOnly ? '관광지 중심' : '맛집도 함께'}</span><span className="underline">{showOptions ? '접기' : '변경'}</span></button>}
          {showOptions && <>
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-plum-700">출발 맛집 포함</span><div className="flex gap-1">{[4, 5].map(value => <button key={value} type="button" disabled={busy} aria-pressed={count === value} onClick={() => setCount(value)} className={`rounded-lg px-4 py-2 text-xs font-bold ${count === value ? 'bg-plum-700 text-white' : 'bg-white text-plum-500'}`}>{value}곳</button>)}</div></div>
          <div className="mt-3 grid grid-cols-2 gap-2">{[{ value: false, label: '맛집도 함께' }, { value: true, label: '관광지 중심' }].map(option => <button key={String(option.value)} disabled={busy} type="button" aria-pressed={attractionsOnly === option.value} onClick={() => setAttractionsOnly(option.value)} className={`rounded-xl border px-3 py-2.5 text-xs font-extrabold ${attractionsOnly === option.value ? 'border-plum-700 bg-white text-plum-900' : 'border-transparent text-plum-500'}`}>{option.label}</button>)}</div>
          </>}
          <button type="button" disabled={busy} onClick={() => void generate()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-plum-700 py-3 text-sm font-extrabold text-neon-400 disabled:opacity-60">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}{busy ? '주변 장소를 찾고 있어요' : stops.length ? '새로 추천받기' : '추천 코스 생성'}</button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-orange-50 p-3 text-xs leading-5 text-orange-800">{error}{stops.length > 0 && ' 기존 코스는 유지했어요.'}</p>}
        {!stops.length && !error && <div className="py-5 text-center text-xs leading-6 text-plum-500">주변 2~3km의 장소를 가까운 순서로 연결해요.<br />코스를 만든 뒤 장소를 빼거나 순서를 바꿔 보세요.</div>}
        {stops.length > 0 && <>
          <div className="mb-3 mt-4 flex items-center justify-between"><p className="text-xs font-extrabold text-plum-700">방문 순서 초안</p><span className="text-[10px] text-plum-400">출발지 반경 {radius / 1000}km</span></div>
          <p className="mb-3 text-[11px] leading-5 text-plum-500">영업시간은 방문 전 확인해 주세요. 도보 시간은 이동만 포함한 예상 시간이에요.</p>
          <div role="status" className="mb-3 text-xs text-plum-600">{stops.length > 1 && !walk && (currentWalk?.error ? <>{currentWalk.error} 현재 거리는 직선거리예요. <button type="button" className="ml-2 font-bold underline" onClick={() => { setWalkResult(null); setWalkAttempt(value => value + 1); }}>다시 조회</button></> : '도보 경로를 조회하고 있어요…')}</div><ol className="space-y-2">{stops.map((place, index) => <li key={place.candidateId}>
            {index > 0 && <p className="mb-2 ml-4 border-l-2 border-dashed border-plum-200 py-1 pl-5 text-[10px] text-plum-400">{walk ? `도보 ${distanceLabel(walk.legs[index - 1].distance)} · 약 ${Math.ceil(walk.legs[index - 1].duration / 60)}분` : `직선 ${distanceLabel(straightDistance(stops[index - 1], place))}`}</p>}
            <div className={`rounded-2xl border p-3 ${activeId === place.candidateId ? 'border-plum-700 bg-neon-50' : 'border-plum-100 bg-white'}`}>
              <button type="button" onClick={() => focus(place)} className="flex w-full items-center gap-3 text-left" aria-label={`${index + 1}번 ${place.title ?? '장소'} 지도에서 보기`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${index === 0 ? 'bg-neon-400 text-plum-900' : 'bg-plum-700 text-white'}`}>{index + 1}</span><span className="min-w-0 flex-1"><span className="text-[10px] font-bold text-plum-400">{index === 0 ? '출발 · 고정' : place.kind === 'restaurant' ? '맛집' : '관광지'}</span><span className="block truncate text-sm font-extrabold text-plum-900">{place.title ?? '이름 없는 장소'}</span><span className="block truncate text-[11px] text-plum-400">{place.address || '주소 정보 없음'}</span></span><MapPin size={15} className="shrink-0 text-plum-400" /></button>
              {index > 0 && <div className="mt-2 flex justify-end gap-1 border-t border-plum-50 pt-2"><button type="button" disabled={busy || index === 1} onClick={() => move(index, -1)} aria-label={`${place.title} 위로 이동`} className="rounded-lg p-2 text-plum-600 disabled:opacity-25"><ArrowUp size={15} /></button><button type="button" disabled={busy || index === stops.length - 1} onClick={() => move(index, 1)} aria-label={`${place.title} 아래로 이동`} className="rounded-lg p-2 text-plum-600 disabled:opacity-25"><ArrowDown size={15} /></button><button type="button" disabled={busy} onClick={() => setStops(current => current.filter(stop => stop.candidateId !== place.candidateId))} aria-label={`${place.title} 코스에서 삭제`} className="rounded-lg p-2 text-plum-400 disabled:opacity-25"><Trash2 size={15} /></button></div>}
            </div>
          </li>)}</ol>
          <p role="status" className="mt-3 text-[11px] text-plum-500">{stops.length}곳 · 순서를 바꾸면 지도 번호와 도보 경로를 다시 계산해요.</p>
          {nearbyRestaurants.length > 0 && <div className="mt-5 border-t border-plum-100 pt-4"><h3 className="text-sm font-extrabold text-plum-900">근처 맛집도 둘러보세요</h3><p className="mt-1 text-[11px] text-plum-400">출발 맛집 주변 · 아직 코스에 포함되지 않았어요</p><div className="mt-2 space-y-2">{nearbyRestaurants.slice(0, 5).map(place => <div key={place.candidateId} className="flex items-center gap-2 rounded-xl bg-plum-50 p-3"><button type="button" onClick={() => focus(place)} className="min-w-0 flex-1 text-left"><span className="block truncate text-xs font-bold text-plum-800">{place.title}</span><span className="text-[10px] text-plum-400">출발지에서 직선 {distanceLabel(straightDistance(stops[0], place))}</span></button><button type="button" disabled={busy || stops.length >= 5} onClick={() => setStops(current => current.length < 5 && !current.some(stop => stop.candidateId === place.candidateId) ? [...current, place] : current)} aria-label={`${place.title} 코스 끝에 추가`} className="flex items-center gap-1 rounded-lg bg-white p-2 text-[11px] font-bold text-plum-700 disabled:opacity-40"><Plus size={13} />추가</button></div>)}</div>{stops.length >= 5 && <p className="mt-2 text-[10px] text-plum-400">최대 5곳까지 담을 수 있어요. 장소를 하나 삭제하면 추가할 수 있어요.</p>}</div>}
        </>}
      </div>}
    </section>
  );
}
