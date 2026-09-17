"use client";
import { LanguageToggle, useLanguage } from './LanguageProvider';
import { useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft, ChevronRight, Heart,
  MapPin, Star, Clock, Coffee, Navigation, Utensils, CakeSlice, Wine,
} from 'lucide-react';
import type { Celeb, Restaurant } from '../lib/types';

type Props = {
  celebrities: Celeb[];
  restaurants: Restaurant[];
  catalogStatus?: 'loading' | 'success' | 'error';
  catalogError?: string;
  onSelectRestaurant: (restaurant: Restaurant) => void;
};

type Screen = 'celebs' | 'restaurants';

function CelebLogo({ celeb, compact = false }: { celeb: Celeb; compact?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-white ${compact ? 'h-12 w-16' : 'h-24 w-32 max-w-full'}`}>
      <Image
        src={celeb.logo}
        alt={t('{name} 로고', { name: t(celeb.name) })}
        fill
        sizes={compact ? '64px' : '128px'}
        className="object-contain mix-blend-multiply"
        style={{ transform: `scale(${celeb.logoScale})` }}
      />
    </div>
  );
}

export default function HomeView({ celebrities, restaurants, catalogStatus = 'success', catalogError, onSelectRestaurant }: Props) {
  const { locale, t } = useLanguage();
  const [screen, setScreen] = useState<Screen>('celebs');
  const [selectedCeleb, setSelectedCeleb] = useState<Celeb | null>(null);
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const goToCeleb = (celeb: Celeb) => {
    setSelectedCeleb(celeb);
    setScreen('restaurants');
  };

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
            <ChevronLeft size={18} />{t("셀럽 목록")}</button>
          <div className="flex items-center gap-3">
            <CelebLogo celeb={selectedCeleb} compact />
            <div>
              <h2 className="text-lg font-extrabold text-plum-900">
                {t(selectedCeleb.name)} {t("추천 맛집")}</h2>
              <p className="text-xs text-plum-400">{celebRestaurants.length}{t("개의 맛집")}</p>
            </div>
          </div>
        </div>

        {locale === 'en' && <p className="px-5 pb-3 text-[11px] leading-5 text-plum-400">{t('영문 정보가 없는 맛집명과 주소는 원문으로 표시돼요.')}</p>}
        {/* Sort button */}
        <div className="px-5 mb-3 flex justify-end">
          <button className="flex items-center gap-0.5 text-xs font-semibold text-plum-700 bg-white rounded-full px-3 py-1.5 border border-plum-100 shadow-sm">{t("거리순")}<ChevronRight size={12} />
          </button>
        </div>

        {/* Restaurant cards */}
        <div className="px-5 space-y-3">
          {celebRestaurants.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="text-plum-400 font-medium">{t("추천 맛집이 없어요")}</p>
            </div>
          ) : (
            celebRestaurants.map(r => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                liked={likedIds.has(r.id)}
                onToggleLike={e => toggleLike(e, r.id)}
                onClick={() => onSelectRestaurant(r)}
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
          <p className="text-xs text-plum-400 mt-0.5">{t("셀럽 추천 맛집 여행")}</p>
        </div>
        <LanguageToggle />
      </div>

      <p className="px-5 text-[13px] font-bold text-plum-800 mb-4">{t("어떤 셀럽의 맛집으로 떠나볼까요?")}</p>

      {catalogStatus !== 'success' && (
        <div className={`mx-5 mb-4 rounded-2xl px-4 py-3 text-xs font-semibold ${catalogStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-plum-50 text-plum-500'}`}>
          {catalogStatus === 'error' ? (catalogError ?? t("맛집 정보를 불러오지 못했어요. Supabase 권한 설정을 확인해 주세요.")) : t("셀럽 맛집을 불러오고 있어요…")}
        </div>
      )}

      {/* Celebrity badge grid */}
      <div className="px-5 grid grid-cols-2 gap-3">
        {celebrities.map(celeb => (
          <button
            key={celeb.id}
            onClick={() => goToCeleb(celeb)}
            className="bg-white rounded-3xl border border-plum-100 shadow-sm p-5 flex flex-col items-center gap-3 hover:border-neon-400 transition-colors cursor-pointer"
          >
            <CelebLogo celeb={celeb} />
            <div className="text-center">
              <p className="font-extrabold text-plum-900 text-[15px]">{t(celeb.name)}</p>
              <p className="text-[11px] text-plum-400 mt-0.5">{celeb.englishName}</p>
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
  restaurant: r, liked, onToggleLike, onClick,
}: {
  restaurant: Restaurant;
  liked: boolean;
  onToggleLike: (e: MouseEvent) => void;
  onClick: () => void;
}) {
  const { locale, t } = useLanguage();
  const Icon = /카페|커피|cafe|café|coffee/i.test(r.category) ? Coffee
    : /디저트|베이커리|dessert|bakery/i.test(r.category) ? CakeSlice
    : /주점|술집|와인|bar|pub|wine/i.test(r.category) ? Wine : Utensils;

  return (
    <article className="relative rounded-2xl border border-plum-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={onClick}
        className="block w-full cursor-pointer rounded-2xl p-4 text-left transition-colors hover:bg-plum-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-500"
      >
        <div className="flex items-start gap-3 pr-10">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-plum-100 bg-plum-50 text-plum-700">
            <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-plum-500">{t(r.category)}</p>
            <h3 className="mt-0.5 break-words text-[16px] font-extrabold leading-snug text-plum-900">{r.name}</h3>
            {r.priceRange && <p className="mt-1 text-xs text-plum-400">{r.priceRange}</p>}
          </div>
        </div>
        {r.location && (
          <div className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-plum-500">
            <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2 break-words">{r.location}</span>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.recom.map(group => (
            <span key={group} className="rounded-md bg-neon-50 px-2 py-1 text-[10px] font-bold text-plum-700">
              {t(group)} · {t('추천')}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-plum-100 pt-3">
          <span className="flex min-w-0 items-center gap-1 text-[11px] text-plum-400">
            {r.rating > 0 ? <><Star size={12} className="shrink-0 fill-neon-400 text-plum-700" aria-hidden="true" /><span className="font-bold text-plum-700">{r.rating}</span>{r.reviewCount > 0 && <span>({r.reviewCount})</span>}</> : <><Navigation size={12} className="shrink-0" aria-hidden="true" /><span>{t(r.distance)}</span></>}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-plum-700">{t('위치보기')}<ChevronRight size={13} aria-hidden="true" /></span>
        </div>
      </button>
      <button
        type="button"
        onClick={onToggleLike}
        aria-label={r.name + (locale === 'ko' ? ' 찜' : ' — Save')}
        aria-pressed={liked}
        className="absolute right-2 top-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-plum-500 transition-colors hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-plum-500"
      >
        <Heart size={19} className={liked ? 'fill-neon-400 text-plum-700' : 'text-plum-300'} aria-hidden="true" />
      </button>
    </article>
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
  const { t } = useLanguage();
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
            {t(r.category)}
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
                  key={t(g)}
                  className={`px-3 py-1 bg-gradient-to-r ${celeb?.gradient ?? 'from-plum-700 to-plum-500'} text-white text-xs font-bold rounded-full`}
                >
                  {celeb?.emoji} {t(g)}{t("추천")}</span>
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
            <span className="text-sm text-plum-500">{t(r.distance)}</span>
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
          <InfoRow icon={<MapPin size={14} className="text-plum-700" />} label={t("위치")} value={t(r.location)} />
          <InfoRow icon={<Clock size={14} className="text-plum-700" />} label={t("영업시간")} value={t(r.hours)} />
          {r.breakTime && (
            <InfoRow icon={<Coffee size={14} className="text-plum-700" />} label={t("브레이크 타임")} value={r.breakTime} />
          )}
        </div>

        <div className="flex gap-3 pb-4">
          {hasCoordinates ? (
            <Link
              href={mapHref}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-plum-700 py-4 font-bold text-neon-400 shadow-lg shadow-plum-200/60"
            >
              <Navigation size={18} />{t("위치보기")}</Link>
          ) : (
            <button
              type="button"
              disabled
              title={t("등록된 위도·경도가 없습니다.")}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-plum-300 py-4 font-bold text-white disabled:cursor-not-allowed"
            >
              <Navigation size={18} />{t("좌표 정보 없음")}</button>
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
