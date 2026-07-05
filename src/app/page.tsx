'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (환경 변수 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
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

  // 화면 전환 상태
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);

  // 등록 폼 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState('생활용품');
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [locationText, setLocationText] = useState(''); 
  
  const [clickX, setClickX] = useState<number>(50);
  const [clickY, setClickY] = useState<number>(50);

  const registerMapRef = useRef<HTMLDivElement>(null);

  // 필터 및 모달 상태
  const [filter, setFilter] = useState<'전체' | '보관중' | '찾음' | '승인대기'>('전체');
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [authStudentId, setAuthStudentId] = useState('');

  // 🌍 1. 사이트 켜지면 전용 DB에서 데이터 실시간으로 긁어오기
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: lostData, error: lostError } = await supabase
        .from('lost_items')
        .select('*')
        .order('id', { ascending: false });

      if (!lostError && lostData) {
        setItems(lostData as LostItem[]);
      }

      const { data: mapData } = await supabase
        .from('school_map')
        .select('map_image')
        .eq('id', 1)
        .single();

      if (mapData?.map_image) {
        setSchoolMapImage(mapData.map_image);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  // 이미지 업로드 (Base64 변환 후 DB 저장용)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'item' | 'map') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (type === 'item') setItemImage(base64String);
        if (type === 'map') {
          setSchoolMapImage(base64String);
          await supabase.from('school_map').upsert({ id: 1, map_image: base64String });
          alert('학교 지도가 데이터베이스에 동기화되었습니다.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!registerMapRef.current) return;
    const rect = registerMapRef.current.getBoundingClientRect();
    setClickX(((e.clientX - rect.left) / rect.width) * 100);
    setClickY(((e.clientY - rect.top) / rect.height) * 100);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '7272') { 
      setIsAdmin(true);
      setShowAdminModal(false);
      setPasswordInput('');
    } else {
      alert('비밀번호가 올바르지 않습니다!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !studentId || !locationText.trim()) {
      return alert('물품명, 학번, 발견 장소를 모두 입력해주세요!');
    }

    const { error } = await supabase.from('lost_items').insert([
      {
        title,
        description,
        image: itemImage,
        locationtext: locationText.trim(),
        mapx: clickX,
        mapy: clickY,
        studentid: studentId.trim(),
        date: new Date().toISOString().split('T')[0],
        status: '보관중',
        category,
        isapproved: false,
      }
    ]);

    if (error) {
      alert('등록 중 에러가 발생했습니다: ' + error.message);
    } else {
      alert('등록 신청되었습니다. 관리자 승인 후 목록에 표시됩니다.');
      fetchData();
      setTitle(''); setDescription(''); setStudentId(''); setLocationText(''); setItemImage(null);
      setViewMode('list');
    }
  };

  const handleResolveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    if (isAdmin || selectedItem.studentid === authStudentId.trim()) {
      const { error } = await supabase
        .from('lost_items')
        .update({ status: '찾음' })
        .eq('id', selectedItem.id);

      if (!error) {
        alert('수령 완료 처리되었습니다!');
        setResolveModalOpen(false);
        setAuthStudentId('');
        fetchData();
        setViewMode('list');
      }
    } else {
      alert('등록된 학번과 일치하지 않습니다.');
    }
  };

  const handleApproveItem = async (id: number) => {
    const { error } = await supabase
      .from('lost_items')
      .update({ isapproved: true })
      .eq('id', id);

    if (!error) {
      alert('물품이 승인되어 공용 리스트에 공개됩니다.');
      fetchData();
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm('이 분실물 항목을 정말 완전히 DB에서 삭제하시겠습니까?')) {
      const { error } = await supabase.from('lost_items').delete().eq('id', id);
      if (!error) {
        alert('삭제되었습니다.');
        setSelectedItem(null);
        setViewMode('list');
        fetchData();
      }
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === '승인대기') return !item.isapproved;
    if (!item.isapproved) return false;
    if (filter === '전체') return true;
    return item.status === filter;
  });

  const activeMapItems = items.filter(item => item.isapproved && item.status === '보관중');
  
  // 💡 타입 에러 완벽 해결을 위해 배열을 깔끔하게 분리 처리합니다.
  const filterOptions = isAdmin 
    ? ['전체', '보관중', '찾음', '승인대기'] 
    : ['전체', '보관중', '찾음'];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="cursor-pointer" onClick={() => setViewMode('list')}>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">서원고 분실물 센터</h1>
            <p className="text-[10px] text-slate-400">Seowon Lost & Found (Live)</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">관리자</span>
                <button onClick={() => { setIsAdmin(false); setFilter('전체'); setViewMode('list'); }} className="text-xs text-slate-400 hover:text-slate-600 underline">로그아웃</button>
              </div>
            ) : (
              <button onClick={() => setShowAdminModal(true)} className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-lg bg-white shadow-sm font-medium">관리자 로그인</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {viewMode === 'list' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                {filterOptions.map((t) => (
                  <button key={t} onClick={() => setFilter(t as any)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filter === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {t} {t === '승인대기' && `(${items.filter(i => !i.isapproved).length})`}
                  </button>
                ))}
              </div>
              <button onClick={() => setViewMode('create')} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1">
                <span>➕</span> 분실물 등록하기
              </button>
            </div>

            {isAdmin && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 mb-2">🗺️ [관리자 전용] 학교 지도 이미지 등록 (공용 동기화)</h3>
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'map')} className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
              </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1">🔍 실시간 학교 분실물 현황판</h3>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">보관중: {activeMapItems.length}개</span>
              </div>
              
              <div className="relative border border-slate-100 rounded-xl overflow-hidden bg-slate-50 max-w-sm mx-auto">
                {schoolMapImage ? (
                  <div className="relative w-full h-auto">
                    <img src={schoolMapImage} alt="학교 지도 메인" className="w-full h-auto block select-none pointer-events-none" />
                    {activeMapItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setSelectedItem(item); setViewMode('detail'); }}
                        className="absolute w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full shadow-md hover:scale-125 hover:bg-slate-950 transition-all z-10 group transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${item.mapx}%`, top: `${item.mapy}%` }}
                      >
                        <span className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                          {item.title} ({item.locationtext})
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 text-xs">
                    <p className="font-bold">🗺️ 업로드된 지도가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-16 bg-white rounded-xl text-slate-400 text-xs">서버에서 분실물 실시간 정보 동기화 중...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl text-slate-400 text-xs">등록된 분실물이 없습니다.</div>
              ) : (
                filteredItems.map((item) => {
                  const isFound = item.status === '찾음';
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => { if (item.isapproved || isAdmin) { setSelectedItem(item); setViewMode('detail'); } }}
                      className={`bg-white p-5 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition cursor-pointer hover:border-slate-400 ${isFound ? 'opacity-50 bg-slate-50/50 border-slate-100' : 'border-slate-200'}`}
                    >
                      <div className="flex gap-4 items-start">
                        {item.image && <img src={item.image} alt="물품" className="w-16 h-16 object-cover rounded-lg shrink-0 border border-slate-200" />}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{item.category}</span>
                            <span className="text-[10px] text-slate-400">{item.date}</span>
                            {!item.isapproved && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">승인 대기</span>}
                          </div>
                          <h3 className={`font-bold text-sm ${isFound ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.title}</h3>
                          <p className="text-xs text-slate-500">📍 위치: <span className="font-semibold text-slate-700">{item.locationtext}</span></p>
                        </div>
                      </div>
                      
                      <div className="shrink-0 w-full md:w-auto flex justify-end gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && !item.isapproved && (
                          <button onClick={() => handleApproveItem(item.id)} className="bg-slate-950 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">승인하기</button>
                        )}
                        {item.isapproved && (
                          <button onClick={() => { if (isFound) return; setSelectedItem(item); setResolveModalOpen(true); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${isFound ? 'bg-slate-200 text-slate-400 border-slate-100' : 'bg-white text-slate-700 border-slate-200'}`}>
                            {item.status === '보관중' ? '보관중 (해결하기)' : '✓ 수령 완료'}
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDeleteItem(item.id)} className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-lg">삭제</button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {viewMode === 'detail' && selectedItem && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 mr-2">{selectedItem.category}</span>
                <span className="text-xs text-slate-400">{selectedItem.date} 등록</span>
              </div>
              <button onClick={() => { setViewMode('list'); setSelectedItem(null); }} className="text-xs text-slate-500 hover:text-slate-800 font-bold">📋 목록</button>
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{selectedItem.title}</h2>
              {selectedItem.image && <div className="w-full flex justify-center bg-slate-50 rounded-xl p-2"><img src={selectedItem.image} alt="원본" className="max-h-72 object-contain rounded-lg" /></div>}
              <div className="bg-slate-50 p-4 rounded-xl"><p className="text-sm font-bold">📍 발견 위치: {selectedItem.locationtext}</p></div>
              <div className="bg-slate-50 p-4 rounded-xl"><p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedItem.description || "설명 없음"}</p></div>
              
              <div className="relative border border-slate-200 rounded-xl overflow-hidden max-w-sm mx-auto">
                {schoolMapImage && (
                  <div className="relative w-full h-auto">
                    <img src={schoolMapImage} alt="지도" className="w-full h-auto block" />
                    <div className="absolute w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${selectedItem.mapx}%`, top: `${selectedItem.mapy}%` }} />
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              {isAdmin && <button onClick={() => handleDeleteItem(selectedItem.id)} className="bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg">물품 삭제</button>}
              {selectedItem.status === '보관중' && <button onClick={() => setResolveModalOpen(true)} className="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-lg">물품 수령하기</button>}
            </div>
          </div>
        )}

        {viewMode === 'create' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b pb-3">✍️ 분실물 제보 신청 (공용 DB 전송)</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">학번 *</label>
                  <input type="text" placeholder="예: 10101" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">카테고리</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm text-slate-700">
                    <option value="생활용품">생활용품</option>
                    <option value="전자기기">전자기기</option>
                    <option value="도서">도서</option>
                    <option value="의류">의류</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">물품명 *</label>
                <input type="text" placeholder="예: 무선 이어폰 케이스" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">발견 위치 서술 *</label>
                <input type="text" placeholder="예: 과학실 2분반 교탁 위" value={locationText} onChange={(e) => setLocationText(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">상세 내용</label>
                <textarea rows={3} placeholder="보관 상태를 적어주세요." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">사진 등록</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'item')} className="w-full text-xs" />
                {itemImage && <img src={itemImage} alt="미리보기" className="mt-2 w-24 h-24 object-cover rounded-lg" />}
              </div>
              <div className="space-y-2 pt-2 border-t">
                <label className="block text-[11px] font-bold text-slate-400">🗺️ 지도상에 대략적인 핀 고정</label>
                <div className="relative border rounded-xl overflow-hidden bg-slate-100 max-w-sm mx-auto">
                  <div ref={registerMapRef} onClick={handleRegisterMapClick} className="relative w-full h-auto cursor-crosshair">
                    {schoolMapImage ? (
                      <>
                        <img src={schoolMapImage} alt="지도선택" className="w-full h-auto block pointer-events-none" />
                        <div className="absolute w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${clickX}%`, top: `${clickY}%` }} />
                      </>
                    ) : (
                      <div className="text-center py-16 text-slate-400 text-xs">학교 지도가 아직 등록되지 않았습니다.</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setViewMode('list')} className="w-1/3 bg-slate-100 py-2.5 rounded-lg text-sm">취소</button>
                <button type="submit" className="w-2/3 bg-slate-900 text-white py-2.5 rounded-lg text-sm shadow-sm">실시간 등록 신청</button>
              </div>
            </form>
          </div>
        )}
      </main>

      {resolveModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h3 className="text-sm font-bold text-slate-900">📢 분실물 수령 완료 처리</h3>
            <form onSubmit={handleResolveStatus} className="space-y-3 mt-2">
              <input type="text" placeholder="제보자 학번 입력" value={authStudentId} onChange={(e) => setAuthStudentId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              <div className="flex gap-2 justify-end text-xs">
                <button type="button" onClick={() => setResolveModalOpen(false)} className="px-3 py-2 border rounded-lg">취소</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdminModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h3 className="text-sm font-bold text-slate-900">🔒 관리자 모드 인증</h3>
            <form onSubmit={handleAdminLogin} className="space-y-3 mt-3">
              <input type="password" placeholder="비밀번호 입력" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              <div className="flex gap-2 justify-end text-xs">
                <button type="button" onClick={() => setShowAdminModal(false)} className="px-3 py-2 border rounded-lg">취소</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg">인증</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
