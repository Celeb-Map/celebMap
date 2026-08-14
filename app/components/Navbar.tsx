"use client";
import { Home, Search, Map, User } from 'lucide-react';
import type { Tab } from '../page';

type Props = {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
};

const tabs = [
  { id: 'home' as Tab, icon: Home, label: '홈' },
  { id: 'search' as Tab, icon: Search, label: '검색' },
  { id: 'map' as Tab, icon: Map, label: '지도' },
  { id: 'mypage' as Tab, icon: User, label: '마이' },
];

export default function Navbar({ activeTab, setActiveTab }: Props) {
  return (
    <nav className="absolute bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-plum-100 px-2 pt-2 pb-4 flex justify-around items-center z-50">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-2xl transition-all cursor-pointer"
          >
            {active && (
              <span className="absolute -top-2 h-1 w-8 rounded-full bg-neon-400" />
            )}
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              className={`transition-colors ${active ? 'text-plum-700' : 'text-plum-300'}`}
            />
            <span className={`text-[10px] font-semibold tracking-tight transition-colors ${active ? 'text-plum-700' : 'text-plum-300'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
