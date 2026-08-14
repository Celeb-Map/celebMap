"use client";
import { useState } from 'react';
import { Settings, Heart, Route, MapPin, Star, LogIn } from 'lucide-react';
import type { Restaurant } from '../lib/types';

type Props = {
  restaurants: Restaurant[];
};

type ProfileTab = 'liked' | 'course';

const MOCK_COURSES = [
  {
    id: 1,
    title: 'BTS 성지순례 코스',
    spots: ['골든 비스트로', '달콤한 디저트', '코엑스'],
    duration: '하루',
    celeb: 'BTS',
    emoji: '💜',
    colorFrom: 'from-plum-100',
    colorTo: 'to-plum-50',
    borderColor: 'border-plum-200',
  },
  {
    id: 2,
    title: '아이브 강남 데이트 코스',
    spots: ['오션 퓨전', '봉은사', '루프탑 카페'],
    duration: '반나절',
    celeb: 'IVE',
    emoji: '🌸',
    colorFrom: 'from-neon-100',
    colorTo: 'to-plum-50',
    borderColor: 'border-neon-300',
  },
  {
    id: 3,
    title: '에스파 이태원 나이트',
    spots: ['도쿄 라멘 마켓', '한강공원', '홍대거리'],
    duration: '저녁',
    celeb: 'aespa',
    emoji: '🤖',
    colorFrom: 'from-plum-200',
    colorTo: 'to-neon-100',
    borderColor: 'border-plum-300',
  },
];

const isLoggedIn = false;

export default function MyPageView({ restaurants }: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('liked');
  const likedRestaurants = restaurants.filter(r => r.liked);

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-plum-900">마이페이지</h2>
        <button className="w-9 h-9 bg-plum-700 rounded-full flex items-center justify-center shadow-sm">
          <Settings size={17} className="text-neon-400" />
        </button>
      </div>

      {/* Profile card */}
      {isLoggedIn ? (
        <div className="mx-5 bg-white rounded-3xl p-5 shadow-sm border border-plum-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-plum-700 rounded-full flex items-center justify-center text-neon-400 text-xl font-extrabold flex-shrink-0">
            J
          </div>
          <div>
            <p className="font-bold text-plum-900">지유님</p>
            <p className="text-sm text-plum-400">eunjun1018@gmail.com</p>
          </div>
        </div>
      ) : (
        <div className="mx-5 bg-plum-700 rounded-3xl p-5 flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-[15px]">로그인하고 더 많은 기능을!</p>
            <p className="text-xs text-plum-200 mt-1">좋아요, 코스 저장을 이용해보세요</p>
          </div>
          <button className="px-4 py-2 bg-neon-400 text-plum-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md flex-shrink-0">
            <LogIn size={14} /> 로그인
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-plum-100">
          <div className="w-10 h-10 bg-neon-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <Heart size={18} className="fill-plum-700 text-plum-700" />
          </div>
          <p className="text-2xl font-extrabold text-plum-900">{likedRestaurants.length}</p>
          <p className="text-xs text-plum-400 mt-0.5">좋아요한 맛집</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-plum-100">
          <div className="w-10 h-10 bg-plum-700 rounded-full flex items-center justify-center mx-auto mb-2">
            <Route size={18} className="text-neon-400" />
          </div>
          <p className="text-2xl font-extrabold text-plum-900">{MOCK_COURSES.length}</p>
          <p className="text-xs text-plum-400 mt-0.5">저장한 코스</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="mx-5 mt-5 flex gap-1 bg-plum-100 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('liked')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'liked'
              ? 'bg-plum-700 text-neon-400 shadow-sm'
              : 'text-plum-500'
          }`}
        >
          좋아요 맛집
        </button>
        <button
          onClick={() => setActiveTab('course')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'course'
              ? 'bg-plum-700 text-neon-400 shadow-sm'
              : 'text-plum-500'
          }`}
        >
          여행 코스
        </button>
      </div>

      {/* Tab content */}
      <div className="mx-5 mt-4">
        {activeTab === 'liked' && (
          <>
            {likedRestaurants.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-4xl mb-3">🍽️</p>
                <p className="font-semibold text-plum-600">좋아요한 맛집이 없어요</p>
                <p className="text-sm text-plum-400 mt-1">홈에서 마음에 드는 맛집을 저장해보세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {likedRestaurants.map(r => (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-plum-100 flex"
                  >
                    <div
                      className={`w-20 bg-gradient-to-br ${r.colorFrom} ${r.colorTo} flex-shrink-0`}
                    />
                    <div className="flex-1 px-4 py-3">
                      <p className="font-bold text-plum-900">{r.name}</p>
                      <p className="text-xs text-plum-400 mt-0.5">{r.category}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-0.5">
                          <Star size={11} className="fill-neon-400 text-plum-700" />
                          <span className="text-xs font-bold text-plum-800">{r.rating}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <MapPin size={10} className="text-plum-400" />
                          <span className="text-xs text-plum-400">{r.distance}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center pr-4">
                      <Heart size={17} className="fill-plum-700 text-plum-700" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'course' && (
          <div className="space-y-3">
            {MOCK_COURSES.map(c => (
              <div
                key={c.id}
                className={`bg-gradient-to-r ${c.colorFrom} ${c.colorTo} rounded-2xl p-4 border ${c.borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{c.emoji}</span>
                      <span className="text-[10px] font-bold text-neon-400 bg-plum-700 px-2 py-0.5 rounded-full">
                        {c.celeb}
                      </span>
                      <span className="text-[10px] font-semibold text-plum-400">
                        {c.duration}
                      </span>
                    </div>
                    <p className="font-bold text-plum-900">{c.title}</p>
                  </div>
                  <button className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart size={15} className="fill-plum-700 text-plum-700" />
                  </button>
                </div>

                <div className="flex items-center gap-1 mt-3 flex-wrap">
                  {c.spots.map((s, i) => (
                    <span key={s} className="flex items-center gap-1">
                      <span className="text-xs font-medium text-plum-800 bg-white/80 px-2.5 py-1 rounded-full">
                        {s}
                      </span>
                      {i < c.spots.length - 1 && (
                        <span className="text-plum-500 text-xs">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
