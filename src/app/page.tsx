'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://pgqgubpojygepaaskbsb.supabase.co";
// 💡 이 부분에 본인의 실제 anon 키를 넣으시면 됩니다.
const supabaseAnonKey = "sb_publishable_InbYU657lLA1BNl4eRL0Uw_WQ7v_ihA";
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

  // 1. 데이터 불러오기
  const fetchData = async () => {
    const { data: lostData } = await supabase.from('lost_items').select('*').order('id', { ascending: false });
    if (lostData) setItems(lostData as LostItem[]);
    const { data: mapData } = await supabase.from('school_map').select('map_image').eq('id', 1).single();
    if (mapData?.map_image) setSchoolMapImage(mapData.map_image);
  };

  // 2. 분실물 등록하기 (실제 Supabase 연동)
  const handleCreate = async () => {
    if (!title.trim() || !locationText.trim()) {
      alert("물품명과 위치를 입력해주세요.");
      return;
    }

    const { error } = await supabase.from('lost_items').insert([
      {
        title,
        description,
        locationtext: locationText,
        mapx: Math.round(clickX),
        mapy: Math.round(clickY),
        category,
        status: '보관중',
        isapproved: true // 등록 시 지도에 바로 표시되도록 true 설정
      }
    ]);

    if (error) {
      alert("등록 실패: " + error.message);
    } else {
      alert("분실물이 성공적으로 등록되었습니다!");
      setTitle('');
      setDescription('');
      setLocationText('');
      setClickX(50);
      setClickY(50);
      fetchData();
      setViewMode('list');
    }
  };

  // 3. 해결하기 기능 (수령자 학번 입력받고 저장)
  const handleResolve = async (id: number) => {
    const inputStudentId = prompt("물품을 찾아가는 수령자의 학번을 입력해주세요 (예: 10101):");
    
    if (inputStudentId === null) return; // 취소 누른 경우
    if (!inputStudentId.trim()) {
      alert("학번을 입력해야 해결 처리가 가능합니다.");
      return;
    }

    const { error } = await supabase
      .from('lost_items')
      .update({ 
        status: '찾음', 
        studentid: inputStudentId.trim() // studentid 컬럼에 수령자 학번 저장
      })
      .eq('id', id);

    if (error) {
      alert("업데이트 실패: " + error.message);
    } else {
      alert("수령 완료 처리가 되었습니다! 🎉");
      fetchData();
      setViewMode('list');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-4">
      <header className="max-w-4xl mx-auto flex justify-between items-center py-4 border-b">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            서원고 분실물 센터
            {isAdmin && <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-md">관리자 모드</span>}
          </h1>
          <p className="text-[10px] text-slate-400">Seowon Lost & Found</p>
        </div>
        {isAdmin ? (
          <button onClick={() => setIsAdmin(false)} className="text-xs border px-3 py-1.5 rounded-lg bg-slate-100 font-bold">로그아웃</button>
        ) : (
          <button onClick={() => setShowAdminModal(true)} className="text-xs border px-3 py-1.5 rounded-lg bg-white">관리자 로그인</button>
        )}
      </header>

      <main className="max-w-4xl mx-auto py-6">
        {/* 리스트 화면 */}
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

        {/* 등록 화면 */}
        {viewMode === 'create' && (
          <div className="bg-white p-6 rounded-xl border space-y-4">
            <h2 className="font-bold">분실물 등록</h2>
            <input className="w-full p-2 border rounded-lg text-sm" placeholder="물품명" value={title} onChange={e => setTitle(e.target.value)} />
            <input className="w-full p-2 border rounded-lg text-sm" placeholder="위치 설명 (예: 2층 본교무실 앞)" value={locationText} onChange={e => setLocationText(e.target.value)} />
            <input className="w-full p-2 border rounded-lg text-sm" placeholder="상세 설명 (특징 등)" value={description} onChange={e => setDescription(e.target.value)} />
            
            <div className="text-xs text-slate-400 font-bold">지도에서 습득 장소를 클릭해 주세요:</div>
            <div ref={registerMapRef} onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setClickX(((e.clientX - rect.left) / rect.width) * 100);
              setClickY(((e.clientY - rect.top) / rect.height) * 100);
            }} className="relative cursor-crosshair border rounded-lg overflow-hidden bg-slate-50">
              {schoolMapImage && <img src={schoolMapImage} className="w-full" />}
              <div className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${clickX}%`, top: `${clickY}%` }} />
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setViewMode('list')} className="flex-1 py-2 border rounded-lg text-sm">취소</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-bold">등록 신청</button>
            </div>
          </div>
        )}

        {/* 상세 보기 화면 (추가됨 🌟) */}
        {viewMode === 'detail' && selectedItem && (
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="font-bold text-base">{selectedItem.title}</h2>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${selectedItem.status === '보관중' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{selectedItem.status}</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <p><span className="font-bold text-slate-400 mr-2">카테고리:</span> {selectedItem.category || '일반'}</p>
              <p><span className="font-bold text-slate-400 mr-2">습득위치:</span> {selectedItem.locationtext}</p>
              <p><span className="font-bold text-slate-400 mr-2">상세설명:</span> {selectedItem.description || '설명이 없습니다.'}</p>
            </div>

            {/* 🔒 보안 로직: 관리자(`isAdmin`)가 로그인했을 때만 수령자 학번이 노출됨 */}
            {isAdmin && selectedItem.status === '찾음' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-xs font-semibold">
                🔒 [관리자 인증 전용] 수령자 학번: {selectedItem.studentid || '기록 없음'}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <button onClick={() => setViewMode('list')} className="flex-1 py-2 border rounded-lg text-sm">목록으로</button>
              {selectedItem.status === '보관중' && (
                <button onClick={() => handleResolve(selectedItem.id)} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-bold">해결하기</button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 관리자 로그인 모달 */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
            <h3 className="text-sm font-bold mb-3">관리자 패스워드 입력</h3>
            <input type="password" placeholder="비밀번호" onChange={e => setPasswordInput(e.target.value)} className="w-full p-2 border rounded-lg mb-4 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdminModal(false)} className="flex-1 py-2 border rounded-lg text-sm">취소</button>
              <button onClick={() => { if(passwordInput === '7272') { setIsAdmin(true); setShowAdminModal(false); } else { alert('비밀번호가 틀렸습니다.'); } }} className="flex-1 py-2 bg-black text-white rounded-lg text-sm">인증</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}