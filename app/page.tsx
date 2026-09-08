"use client";
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import HomeView from './components/HomeView';
import SearchView from './components/SearchView';
import MapView from './components/MapView';
import MyPageView from './components/MyPageView';
import type { Celeb, Restaurant } from './lib/types';

export type Tab = 'home' | 'search' | 'map' | 'mypage';

const CELEBRITIES: Celeb[] = [
  { id: 1, name: '블랙핑크', group: '블랙핑크', emoji: '🖤', gradient: 'from-plum-900 to-pink-500' },
  { id: 2, name: '세븐틴', group: '세븐틴', emoji: '💎', gradient: 'from-blue-400 to-pink-300' },
  { id: 3, name: 'BTS', group: 'BTS', emoji: '💜', gradient: 'from-plum-800 to-plum-500' },
  { id: 4, name: '스트레이키즈', group: '스트레이키즈', emoji: '⚡', gradient: 'from-red-600 to-plum-800' },
  { id: 5, name: '코르티스', group: '코르티스', emoji: '✨', gradient: 'from-neon-500 to-plum-500' },
  { id: 6, name: 'GD', group: 'GD', emoji: '🌼', gradient: 'from-yellow-300 to-plum-600' },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [mapRestaurant, setMapRestaurant] = useState<Restaurant | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [catalogError, setCatalogError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/catalog', { signal: controller.signal })
      .then(async response => {
        const data = await response.json() as { restaurants?: Restaurant[]; message?: string };
        if (!response.ok) throw new Error(data.message ?? '맛집 정보를 불러오지 못했습니다.');
        setRestaurants(data.restaurants ?? []);
        setCatalogError(undefined);
        setCatalogStatus('success');
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCatalogError(error instanceof Error ? error.message : '맛집 정보를 불러오지 못했습니다.');
        setCatalogStatus('error');
      });

    return () => controller.abort();
  }, []);

  const openRestaurantMap = (restaurant: Restaurant) => {
    setMapRestaurant(restaurant);
    setActiveTab('map');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-canvas max-w-md mx-auto border-x border-plum-100 overflow-hidden relative shadow-2xl">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'home' && (
          <HomeView celebrities={CELEBRITIES} restaurants={restaurants} catalogStatus={catalogStatus} catalogError={catalogError} onSelectRestaurant={openRestaurantMap} />
        )}
        {activeTab === 'search' && (
          <SearchView celebrities={CELEBRITIES} restaurants={restaurants} onSelectRestaurant={openRestaurantMap} />
        )}
        {activeTab === 'map' && (
          <MapView key={mapRestaurant?.id ?? 'empty'} restaurant={mapRestaurant} />
        )}
        {activeTab === 'mypage' && (
          <MyPageView restaurants={restaurants} />
        )}
      </div>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
