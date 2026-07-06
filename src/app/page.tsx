'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://pgqgubpojygepaaskbsb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncWd1YnBvanlnZXBhYXNrYnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzQ0MTYsImV4cCI6MjA5ODc1MDQxNn0.GWVhm3pfXo9c_9gof1BL1OcjvXp34yn65Q5Jgx5s8d0";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface LostItem {
  id: number;
  title: string;
  description: string;
  image: string | null;
  locationtext: string;
  mapx: number; 
  mapy: number; 
  studentid: string;
  date: string;
  status: '보관중' | '찾음';
  category: string;
  isapproved: boolean;
}

export default function Home() {
  const [items, setItems] = useState<LostItem[]>([]);
  const [schoolMapImage, setSchoolMapImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState('생활용품');
  const [locationText, setLocationText] = useState(''); 
  const [clickX, setClickX] = useState<number>(50);
  const [clickY, setClickY] = useState<number>(50);
  const registerMapRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'전체' | '보관중' | '찾음'>('전체');
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: lostData } = await supabase.from('lost_items').select('*').order('id', { ascending: false });
    if (lostData) setItems(lostData as LostItem[]);
    const { data: mapData } = await supabase.from('school_map').select('map_image').eq('id', 1).single();
    if (mapData?.map_image) setSchoolMapImage(mapData.map_image);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-4">
      <header className="max-w-4xl mx-auto flex justify-between items-center py-4 border-b">
        <div>
          <h1 className="text-lg font-bold">서원고 분실물 센터</h1>
          <p className="text-[10px] text-slate-400">Seowon Lost & Found</p>
        </div>
        <button onClick={() => setShowAdminModal(true)} className="text-xs border px-3 py-1.5 rounded-lg bg-white">관리자 로그인</button>
      </header>

      <main className="max-w-4xl mx-auto py-6">
        {viewMode === 'list' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h3 className="text-xs font-bold mb-3">📍 실시간 학교 분실물 위치</h3>
              <div className="relative border rounded-xl overflow-hidden bg-slate-100">
                {schoolMapImage && (
                  <div className="relative w-full">
                    <img src={schoolMapImage} className="w-full h-auto" />
                    {items.filter(i => i.isapproved && i.status === '보관중').map(item => (
                      <div key={item.id} className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${item.mapx}%`, top: `${item.mapy}%` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {['전체', '보관중', '찾음'].map(t => (
                <button key={t} onClick={() => setFilter(t as any)} className={`px-4 py-2 text-xs font-bold rounded-lg ${filter === t ? 'bg-black text-white' : 'bg-white border'}`}>
                  {t}
                </button>
              ))}
              <button onClick={() => setViewMode('create')} className="ml-auto bg-black text-white px-4 py-2 text-xs font-bold rounded-lg">+ 등록하기</button>
            </div>

            <div className="grid gap-3">
              {items.filter(i => filter === '전체' || i.status === filter).map(item => (
                <div key={item.id} onClick={() => {setSelectedItem(item); setViewMode('detail');}} className="bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:border-slate-400">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm">{item.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${item.status === '보관중' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>{item.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">위치: {item.locationtext}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'create' && (
          <div className="bg-white p-6 rounded-xl border space-y-4">
            <h2 className="font-bold">분실물 등록</h2>
            <input className="w-full p-2 border rounded-lg text-sm" placeholder="물품명" onChange={e => setTitle(e.target.value)} />
            <input className="w-full p-2 border rounded-lg text-sm" placeholder="위치" onChange={e => setLocationText(e.target.value)} />
            <div ref={registerMapRef} onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setClickX(((e.clientX - rect.left) / rect.width) * 100);
              setClickY(((e.clientY - rect.top) / rect.height) * 100);
            }} className="relative cursor-crosshair border rounded-lg overflow-hidden">
              {schoolMapImage && <img src={schoolMapImage} className="w-full" />}
              <div className="absolute w-3 h-3 bg-red-500 rounded-full" style={{ left: `${clickX}%`, top: `${clickY}%` }} />
            </div>
            <button onClick={() => setViewMode('list')} className="w-full py-2 bg-black text-white rounded-lg">등록 신청</button>
          </div>
        )}
      </main>

      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
            <input type="password" placeholder="비밀번호" onChange={e => setPasswordInput(e.target.value)} className="w-full p-2 border rounded-lg mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdminModal(false)} className="flex-1 py-2 border rounded-lg">취소</button>
              <button onClick={() => { if(passwordInput === '7272') { setIsAdmin(true); setShowAdminModal(false); }}} className="flex-1 py-2 bg-black text-white rounded-lg">인증</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
