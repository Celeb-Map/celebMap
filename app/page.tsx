"use client";
import { useState } from 'react';
import Navbar from './components/Navbar';
import HomeView from './components/HomeView';
import SearchView from './components/SearchView';
import MapView from './components/MapView';
import MyPageView from './components/MyPageView';
import type { Celeb, Restaurant } from './lib/types';

export type Tab = 'home' | 'search' | 'map' | 'mypage';

const CELEBRITIES: Celeb[] = [
  { id: 1, name: 'BTS', group: 'BTS', emoji: '💜', gradient: 'from-purple-500 to-indigo-600' },
  { id: 2, name: '아이브', group: 'IVE', emoji: '🌸', gradient: 'from-rose-400 to-pink-500' },
  { id: 3, name: '르세라핌', group: 'LE SSERAFIM', emoji: '🔥', gradient: 'from-orange-400 to-red-500' },
  { id: 4, name: '스키즈', group: 'Stray Kids', emoji: '⚡', gradient: 'from-yellow-400 to-amber-500' },
  { id: 5, name: '에스파', group: 'aespa', emoji: '🤖', gradient: 'from-cyan-400 to-teal-500' },
  { id: 6, name: 'NewJeans', group: 'NewJeans', emoji: '🫧', gradient: 'from-emerald-400 to-green-500' },
];

const RESTAURANTS: Restaurant[] = [
  {
    id: 1,
    name: '골든 비스트로',
    category: '양식·퓨전',
    distance: '0.5km',
    rating: 4.9,
    reviewCount: 284,
    recom: ['BTS', 'LE SSERAFIM'],
    location: '서울 강남구 테헤란로 123',
    hours: '11:00 - 21:00',
    breakTime: '15:00 - 17:00',
    priceRange: '₩₩₩',
    tags: ['분위기 맛집', '데이트'],
    liked: false,
    colorFrom: 'from-purple-200',
    colorTo: 'to-pink-100',
  },
  {
    id: 2,
    name: '오션 퓨전',
    category: '해산물',
    distance: '1.2km',
    rating: 4.7,
    reviewCount: 156,
    recom: ['IVE'],
    location: '서울 서초구 강남대로 456',
    hours: '12:00 - 22:00',
    breakTime: null,
    priceRange: '₩₩₩₩',
    tags: ['특별한 날', '오션뷰'],
    liked: true,
    colorFrom: 'from-blue-200',
    colorTo: 'to-cyan-100',
  },
  {
    id: 3,
    name: '달콤한 디저트',
    category: '카페·디저트',
    distance: '0.8km',
    rating: 4.8,
    reviewCount: 412,
    recom: ['BTS', 'Stray Kids'],
    location: '서울 강남구 역삼동 789',
    hours: '10:00 - 20:00',
    breakTime: null,
    priceRange: '₩₩',
    tags: ['인스타감성', '달달함'],
    liked: false,
    colorFrom: 'from-yellow-200',
    colorTo: 'to-orange-100',
  },
  {
    id: 4,
    name: '한식 정원',
    category: '한식',
    distance: '2.1km',
    rating: 4.6,
    reviewCount: 98,
    recom: ['LE SSERAFIM', 'Stray Kids'],
    location: '서울 송파구 잠실동 321',
    hours: '11:30 - 21:30',
    breakTime: '15:30 - 17:00',
    priceRange: '₩₩',
    tags: ['전통', '가성비'],
    liked: true,
    colorFrom: 'from-green-200',
    colorTo: 'to-emerald-100',
  },
  {
    id: 5,
    name: '도쿄 라멘 마켓',
    category: '일식·라멘',
    distance: '1.5km',
    rating: 4.8,
    reviewCount: 321,
    recom: ['aespa', 'NewJeans'],
    location: '서울 용산구 이태원로 100',
    hours: '11:00 - 22:00',
    breakTime: null,
    priceRange: '₩₩',
    tags: ['줄서는 맛집', '진한 국물'],
    liked: false,
    colorFrom: 'from-red-200',
    colorTo: 'to-orange-100',
  },
  {
    id: 6,
    name: '루프탑 카페 로맨틱',
    category: '카페·음료',
    distance: '0.9km',
    rating: 4.7,
    reviewCount: 203,
    recom: ['IVE', 'NewJeans'],
    location: '서울 마포구 홍대입구 200',
    hours: '10:00 - 23:00',
    breakTime: null,
    priceRange: '₩₩₩',
    tags: ['뷰 맛집', '야경'],
    liked: false,
    colorFrom: 'from-violet-200',
    colorTo: 'to-purple-100',
  },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8f7ff] max-w-md mx-auto border-x border-gray-200/40 overflow-hidden relative shadow-2xl">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'home' && (
          <HomeView celebrities={CELEBRITIES} restaurants={RESTAURANTS} />
        )}
        {activeTab === 'search' && (
          <SearchView celebrities={CELEBRITIES} restaurants={RESTAURANTS} />
        )}
        {activeTab === 'map' && (
          <MapView />
        )}
        {activeTab === 'mypage' && (
          <MyPageView restaurants={RESTAURANTS} />
        )}
      </div>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
