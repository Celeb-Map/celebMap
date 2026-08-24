"use client";
import { useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Bell, ChevronLeft, ChevronRight, Heart,
  MapPin, Star, Clock, Coffee, Navigation,
} from 'lucide-react';
import type { Celeb, Restaurant } from '../lib/types';

type Props = {
  celebrities: Celeb[];
  restaurants: Restaurant[];
  catalogStatus?: 'loading' | 'success' | 'error';
  catalogError?: string;
};

type Screen = 'celebs' | 'restaurants' | 'detail';

export default function HomeView({ celebrities, restaurants, catalogStatus = 'success', catalogError }: Props) {
  const [screen, setScreen] = useState<Screen>('celebs');
  const [selectedCeleb, setSelectedCeleb] = useState<Celeb | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(
    new Set(restaurants.filter(r => r.liked).map(r => r.id))
  );

  const celebRestaurants = selectedCeleb
    ? restaurants.filter(r => r.recom.includes(selectedCeleb.group))
    : [];

  const toggleLike = (e: MouseEvent, id: number) => {
    e.stopPropagation();
    setLikedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const goToCeleb = (celeb: Celeb) => {
    setSelectedCeleb(celeb);
    setScreen('restaurants');
  };

  const goToDetail = (r: Restaurant) => {
    setSelectedRestaurant(r);
    setScreen('detail');
  };

  /* ── 상세 화면 ── */
  if (screen === 'detail' && selectedRestaurant) {
    return (
      <RestaurantDetail
        restaurant={selectedRestaurant}
        celebrities={celebrities}
        liked={likedIds.has(selectedRestaurant.id)}
        onToggleLike={e => toggleLike(e, selectedRestaurant.id)}
        onBack={() => setScreen('restaurants')}
      />
    );
  }

  /* ── 맛집 목록 화면 ── */
  if (screen === 'restaurants' && selectedCeleb) {
    return (
      <div className="pb-28">
        {/* Header */}
        <div className="px-5 pt-6 pb-3 bg-canvas sticky top-0 z-10">
          <button
            onClick={() => setScreen('celebs')}
            className="flex items-center gap-1.5 text-sm font-semibold text-plum-700 mb-4"
          >
            <ChevronLeft size={18} /> 셀럽 목록
          </button>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${selectedCeleb.gradient} flex items-center justify-center text-lg flex-shrink-0`}
            >
              {selectedCeleb.emoji}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-plum-900">
                {selectedCeleb.name} 추천 맛집
              </h2>
              <p className="text-xs text-plum-400">{celebRestaurants.length}개의 맛집</p>
            </div>
          </div>
        </div>

        {/* Sort button */}
        <div className="px-5 mb-3 flex justify-end">
          <button className="flex items-center gap-0.5 text-xs font-semibold text-plum-700 bg-white rounded-full px-3 py-1.5 border border-plum-100 shadow-sm">
            거리순 <ChevronRight size={12} />
          </button>
        </div>

        {/* Restaurant cards */}
        <div className="px-5 space-y-3">
          {celebRestaurants.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="text-plum-400 font-medium">추천 맛집이 없어요</p>
            </div>
          ) : (
            celebRestaurants.map(r => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                celebrities={celebrities}
                liked={likedIds.has(r.id)}
                onToggleLike={e => toggleLike(e, r.id)}
                onClick={() => goToDetail(r)}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  /* ── 홈: 셀럽 배지 그리드 ── */
  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-plum-900">
            Celeb
            <span className="bg-plum-700 text-neon-400 rounded-lg px-1.5 py-0.5 ml-0.5">Map</span>
          </h1>
          <p className="text-xs text-plum-400 mt-0.5">셀럽 추천 맛집 여행</p>
        </div>
        <button className="relative w-9 h-9 bg-plum-700 rounded-full flex items-center justify-center shadow-sm">
          <Bell size={17} className="text-neon-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-neon-400 rounded-full border border-white" />
        </button>
      </div>

      <p className="px-5 text-[13px] font-bold text-plum-800 mb-4">
        어떤 셀럽의 맛집으로 떠나볼까요?
      </p>

      {catalogStatus !== 'success' && (
        <div className={`mx-5 mb-4 rounded-2xl px-4 py-3 text-xs font-semibold ${catalogStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-plum-50 text-plum-500'}`}>
          {catalogStatus === 'error' ? (catalogError ?? '맛집 정보를 불러오지 못했어요. Supabase 권한 설정을 확인해 주세요.') : '셀럽 맛집을 불러오고 있어요…'}
        </div>
      )}

      {/* Celebrity badge grid */}
      <div className="px-5 grid grid-cols-2 gap-3">
        {celebrities.map(celeb => (
          <button
            key={celeb.id}
            onClick={() => goToCeleb(celeb)}
            className="bg-white rounded-3xl border border-plum-100 shadow-sm p-5 flex flex-col items-center gap-3 active:scale-[0.97] hover:border-neon-400 transition-all cursor-pointer"
          >
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-br ${celeb.gradient} flex items-center justify-center text-3xl shadow-md`}
            >
              {celeb.emoji}
            </div>
            <div className="text-center">
              <p className="font-extrabold text-plum-900 text-[15px]">{celeb.name}</p>
              <p className="text-[11px] text-plum-400 mt-0.5">{celeb.group}</p>
            </div>
            {/* <div
              className={`w-full py-1.5 rounded-xl bg-gradient-to-r ${celeb.gradient} text-white text-xs font-bold text-center`}
            >
              맛집 보기
            </div> */}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 서브 컴포넌트들 ── */

function RestaurantCard({
  restaurant: r,
  celebrities,
  liked,
  onToggleLike,
  onClick,
}: {
  restaurant: Restaurant;
  celebrities: Celeb[];
  liked: boolean;
  onToggleLike: (e: MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-plum-100 cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className={`h-36 bg-gradient-to-br ${r.colorFrom} ${r.colorTo} relative flex items-end`}>
        <div className="px-3 pb-3 flex gap-1.5">
          {r.recom.map(g => {
            const celeb = celebrities.find(c => c.group === g);
            return (
              <span
                key={g}
                className={`px-2.5 py-0.5 bg-gradient-to-r ${celeb?.gradient ?? 'from-plum-700 to-plum-500'} text-white text-[10px] font-bold rounded-full shadow-sm`}
              >
                {g}
              </span>
            );
          })}
        </div>
        <button
          onClick={onToggleLike}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
            liked ? 'bg-plum-700' : 'bg-white/85'
          }`}
        >
          <Heart size={15} className={liked ? 'fill-neon-400 text-neon-400' : 'text-plum-400'} />
        </button>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-bold text-plum-900 text-[15px]">{r.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-plum-400">{r.category}</span>
            <span className="text-plum-200 text-xs">·</span>
            <span className="text-xs text-plum-400">{r.priceRange}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {r.rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star size={12} className="fill-neon-400 text-plum-700" />
              <span className="text-sm font-bold text-plum-800">{r.rating}</span>
              <span className="text-xs text-plum-400 ml-0.5">({r.reviewCount})</span>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <MapPin size={10} className="text-plum-400" />
            <span className="text-xs text-plum-400">{r.distance}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RestaurantDetail({
  restaurant: r,
  celebrities,
  liked,
  onToggleLike,
  onBack,
}: {
  restaurant: Restaurant;
  celebrities: Celeb[];
  liked: boolean;
  onToggleLike: (e: MouseEvent) => void;
  onBack: () => void;
}) {
  const hasCoordinates = r.latitude !== null && r.longitude !== null;
  const mapHref = {
    pathname: `/restaurants/${r.id}/map`,
    query: {
      name: r.name,
      address: r.location,
      latitude: r.latitude?.toString() ?? '',
      longitude: r.longitude?.toString() ?? '',
    },
  };

  return (
    <div className="pb-28">
      <div className={`h-64 bg-gradient-to-br ${r.colorFrom} ${r.colorTo} relative`}>
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-9 h-9 bg-plum-700 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
        >
          <ChevronLeft size={18} className="text-neon-400" />
        </button>
        <button
          onClick={onToggleLike}
          className={`absolute top-4 right-4 w-9 h-9 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-colors ${
            liked ? 'bg-plum-700' : 'bg-white/85'
          }`}
        >
          <Heart size={18} className={liked ? 'fill-neon-400 text-neon-400' : 'text-plum-500'} />
        </button>
        <div className="absolute bottom-4 left-4">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-plum-700 rounded-full">
            {r.category}
          </span>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        <div>
          <h2 className="text-2xl font-extrabold text-plum-900">{r.name}</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {r.recom.map(g => {
              const celeb = celebrities.find(c => c.group === g);
              return (
                <span
                  key={g}
                  className={`px-3 py-1 bg-gradient-to-r ${celeb?.gradient ?? 'from-plum-700 to-plum-500'} text-white text-xs font-bold rounded-full`}
                >
                  {celeb?.emoji} {g} 추천
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-plum-100">
          {r.rating > 0 && (
            <>
              <div className="flex items-center gap-1.5">
                <Star size={17} className="fill-neon-400 text-plum-700" />
                <span className="text-lg font-extrabold text-plum-900">{r.rating}</span>
                <span className="text-sm text-plum-400">({r.reviewCount})</span>
              </div>
              <div className="w-px h-4 bg-plum-200" />
            </>
          )}
          {r.priceRange && (
            <>
              <span className="text-sm font-medium text-plum-600">{r.priceRange}</span>
              <div className="w-px h-4 bg-plum-200" />
            </>
          )}
          <div className="flex items-center gap-1">
            <MapPin size={13} className="text-plum-400" />
            <span className="text-sm text-plum-500">{r.distance}</span>
          </div>
        </div>

        {/* 태그 */}
        {/* <div className="flex gap-2 flex-wrap">
          {r.tags.map(tag => (
            <span key={tag} className="px-3 py-1.5 bg-plum-50 text-plum-700 text-xs font-semibold rounded-full">
              #{tag}
            </span>
          ))}
        </div> */}

        <div className="bg-plum-50 rounded-2xl p-4 space-y-3.5">
          <InfoRow icon={<MapPin size={14} className="text-plum-700" />} label="위치" value={r.location} />
          <InfoRow icon={<Clock size={14} className="text-plum-700" />} label="영업시간" value={r.hours} />
          {r.breakTime && (
            <InfoRow icon={<Coffee size={14} className="text-plum-700" />} label="브레이크 타임" value={r.breakTime} />
          )}
        </div>

        <div className="flex gap-3 pb-4">
          {hasCoordinates ? (
            <Link
              href={mapHref}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-plum-700 py-4 font-bold text-neon-400 shadow-lg shadow-plum-200/60"
            >
              <Navigation size={18} /> 위치보기
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="등록된 위도·경도가 없습니다."
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-plum-300 py-4 font-bold text-white disabled:cursor-not-allowed"
            >
              <Navigation size={18} /> 좌표 정보 없음
            </button>
          )}
          <button
            onClick={onToggleLike}
            className={`w-14 rounded-2xl flex items-center justify-center border-2 transition-colors ${
              liked ? 'bg-plum-700 border-plum-700' : 'bg-plum-50 border-plum-200'
            }`}
          >
            <Heart size={20} className={liked ? 'fill-neon-400 text-neon-400' : 'text-plum-400'} />
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-plum-100">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-semibold text-plum-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-plum-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
