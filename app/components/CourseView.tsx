"use client";
import React from 'react';
import { Compass } from 'lucide-react';

export default function CourseView() {
    return (
        <div className="p-6 space-y-6 pt-10">
            <h2 className="text-2xl font-bold text-plum-900">오늘의 여행 코스 ✨</h2>
            <div className="bg-white p-6 rounded-3xl border border-plum-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 text-plum-700 opacity-10">
                    <Compass size={80} />
                </div>
                <p className="font-semibold text-plum-700">현재 위치에서 가장 가까운 곳!</p>
                <div className="my-6 py-4 border-y-2 border-dashed border-plum-100 text-center text-plum-400 text-sm">
                    숙소 ➜ 근처 맛집 ➜ 유명 관광지 (최적의 동선)
                </div>
                <button className="w-full py-3 bg-plum-700 text-neon-400 rounded-xl font-bold">코스 보기</button>
            </div>
        </div>
    );
}
