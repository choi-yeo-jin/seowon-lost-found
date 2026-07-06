'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 직접 URL을 입력하여 배포 환경 오류 해결
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
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState('생활용품');
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [locationText, setLocationText] = useState(''); 
  const [clickX, setClickX] = useState<number>(50);
  const [clickY, setClickY] = useState<number>(50);
  const registerMapRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'전체' | '보관중' | '찾음' | '승인대기'>('전체');
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [authStudentId, setAuthStudentId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: lostData } = await supabase.from('lost_items').select('*').order('id', { ascending: false });
    if (lostData) setItems(lostData as LostItem[]);
    const { data: mapData } = await supabase.from('school_map').select('map_image').eq('id', 1).single();
    if (mapData?.map_image) setSchoolMapImage(mapData.map_image);
    setIsLoading(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'item' | 'map') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (type === 'item') setItemImage(base64);
        else {
          setSchoolMapImage(base64);
          await supabase.from('school_map').upsert({ id: 1, map_image: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('lost_items').insert([{
      title, description, image: itemImage, locationtext: locationText, 
      mapx: clickX, mapy: clickY, studentid: studentId, 
      date: new Date().toISOString().split('T')[0], status: '보관중', 
      category, isapproved: false
    }]);
    alert('등록 신청되었습니다.');
    fetchData();
    setViewMode('list');
  };

  const filterOptions = isAdmin ? ['전체', '보관중', '찾음', '승인대기'] : ['전체', '보관중', '찾음'];

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <header className="max-w-2xl mx-auto flex justify-between items-center mb-6">
        <h1 className="font-bold text-xl">서원고 분실물 센터</h1>
        <button onClick={() => setShowAdminModal(true)} className="text-xs bg-white px-3 py-1 border rounded shadow-sm">관리자</button>
      </header>

      <main className="max-w-2xl mx-auto space-y-4">
        {viewMode === 'list' && (
          <>
            <div className="flex gap-2 mb-4">
              {filterOptions.map(t => (
                <button key={t} onClick={() => setFilter(t as any)} className={`px-3 py-1 text-xs border rounded ${filter === t ? 'bg-black text-white' : 'bg-white'}`}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => setViewMode('create')} className="w-full py-3 bg-black text-white rounded-lg font-bold">등록하기</button>
            <div className="space-y-2">
              {items.filter(i => filter === '전체' || (filter === '승인대기' ? !i.isapproved : i.status === filter)).map(item => (
                <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border" onClick={() => {setSelectedItem(item); setViewMode('detail');}}>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.locationtext}</p>
                </div>
              ))}
            </div>
          </>
        )}
        
        {viewMode === 'create' && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg space-y-4">
            <input className="w-full p-2 border rounded" placeholder="물품명" onChange={e => setTitle(e.target.value)} required />
            <input className="w-full p-2 border rounded" placeholder="위치" onChange={e => setLocationText(e.target.value)} required />
            <input className="w-full p-2 border rounded" placeholder="학번" onChange={e => setStudentId(e.target.value)} required />
            <button type="submit" className="w-full py-2 bg-black text-white rounded">제출</button>
          </form>
        )}
      </main>

      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm">
            <input type="password" placeholder="비밀번호" onChange={e => setPasswordInput(e.target.value)} className="w-full p-2 border rounded mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdminModal(false)} className="flex-1 py-2 border rounded">취소</button>
              <button onClick={() => { if(passwordInput === '7272') { setIsAdmin(true); setShowAdminModal(false); }}} className="flex-1 py-2 bg-black text-white rounded">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
