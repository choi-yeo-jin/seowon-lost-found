'use client';

import { useState, useRef } from 'react';

interface LostItem {
  id: number;
  title: string;
  description: string;
  image: string | null;
  locationText: string; 
  mapX: number; 
  mapY: number; 
  studentId: string;
  date: string;
  status: '보관중' | '찾음';
  category: string;
  isApproved: boolean;
}

export default function Home() {
  const [items, setItems] = useState<LostItem[]>([]);

  // 화면 전환 상태 관리 ('list' = 첫 화면, 'create' = 등록 폼, 'detail' = 상세 보기)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
  // 현재 상세 보기로 선택된 아이템
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);

  // 등록 폼 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState('생활용품');
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [locationText, setLocationText] = useState(''); 
  
  // 등록용 지도 핀 좌표 상태
  const [clickX, setClickX] = useState<number>(50);
  const [clickY, setClickY] = useState<number>(50);

  // 관리자가 등록하는 학교 지도 이미지
  const [schoolMapImage, setSchoolMapImage] = useState<string | null>(null);
  const registerMapRef = useRef<HTMLDivElement>(null);

  // 필터 및 모달 상태
  const [filter, setFilter] = useState<'전체' | '보관중' | '찾음' | '승인대기'>('전체');
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);

  // 학번 인증 모달 상태
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [authStudentId, setAuthStudentId] = useState('');

  // 이미지 업로드 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'item' | 'map') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'item') setItemImage(reader.result as string);
        if (type === 'map') setSchoolMapImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 등록 신청 지도 클릭 시 점(핀) 위치 지정 계산
  const handleRegisterMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!registerMapRef.current) return;
    const rect = registerMapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setClickX(x);
    setClickY(y);
  };

  // 관리자 로그인
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

  // 분실물 등록 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !studentId || !locationText.trim()) {
      return alert('물품명, 학번, 발견 장소를 모두 입력해주세요!');
    }

    const newItem: LostItem = {
      id: Date.now(),
      title,
      description,
      image: itemImage,
      locationText: locationText.trim(),
      mapX: clickX,
      mapY: clickY,
      studentId: studentId.trim(),
      date: new Date().toISOString().split('T')[0],
      status: '보관중',
      category,
      isApproved: false,
    };

    setItems([newItem, ...items]);
    
    // 작성 폼 초기화
    setTitle('');
    setDescription('');
    setStudentId('');
    setLocationText('');
    setItemImage(null);
    setClickX(50);
    setClickY(50);
    setViewMode('list'); 
    alert('등록 신청되었습니다. 관리자 승인 후 목록에 표시됩니다.');
  };

  // 학번 인증 후 해결 처리
  const handleResolveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    if (isAdmin || selectedItem.studentId === authStudentId.trim()) {
      const updatedItems = items.map(item => 
        item.id === selectedItem.id ? { ...item, status: '찾음' as const } : item
      );
      setItems(updatedItems);
      setSelectedItem({ ...selectedItem, status: '찾음' });
      alert('수령 완료 처리되었습니다!');
      setResolveModalOpen(false);
      setAuthStudentId('');
    } else {
      alert('등록된 학번과 일치하지 않습니다.');
    }
  };

  const handleApproveItem = (id: number) => {
    setItems(items.map(item => item.id === id ? { ...item, isApproved: true } : item));
    alert('물품이 승인되어 리스트에 공개됩니다.');
  };

  const filteredItems = items.filter(item => {
    if (filter === '승인대기') return !item.isApproved;
    if (!item.isApproved) return false;
    if (filter === '전체') return true;
    return item.status === filter;
  });

  const activeMapItems = items.filter(item => item.isApproved && item.status === '보관중');

  // 에러가 났던 라인 분리: 관리자 여부에 따른 필터 탭 항목 지정
  const filterOptions: ('전체' | '보관중' | '찾음' | '승인대기')[] = isAdmin 
    ? ['전체', '보관중', '찾음', '승인대기'] 
    : ['전체', '보관중', '찾음'];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="cursor-pointer" onClick={() => setViewMode('list')}>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">서원고 분실물 센터</h1>
            <p className="text-[10px] text-slate-400">Seowon Lost & Found</p>
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
        
        {/* ==================== 1. 메인 리스트 화면 ==================== */}
        {viewMode === 'list' && (
          <div className="space-y-5">
            {/* 상단 필터 및 버튼 바 */}
            <div className="flex justify-between items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                {filterOptions.map((t) => (
                  <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filter === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {t} {t === '승인대기' && `(${items.filter(i => !i.isApproved).length})`}
                  </button>
                ))}
              </div>
              
              <button onClick={() => setViewMode('create')} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1">
                <span>➕</span> 분실물 등록하기
              </button>
            </div>

            {isAdmin && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 mb-2">🗺️ [관리자 전용] 학교 지도 이미지 등록</h3>
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'map')} className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
              </div>
            )}

            {/* 학교 분실물 지도 현황판 */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1">🔍 학교 분실물 현황판</h3>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">현재 보관중: {activeMapItems.length}개</span>
              </div>
              
              <div className="relative border border-slate-100 rounded-xl overflow-hidden bg-slate-50 max-w-sm mx-auto">
                {schoolMapImage ? (
                  <div className="relative w-full h-auto">
                    <img src={schoolMapImage} alt="학교 지도 메인" className="w-full h-auto block select-none pointer-events-none" />
                    
                    {activeMapItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setViewMode('detail');
                        }}
                        className="absolute w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full shadow-md hover:scale-125 hover:bg-slate-950 transition-all z-10 group transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${item.mapX}%`, top: `${item.mapY}%` }}
                      >
                        <span className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity font-sans z-50">
                          {item.title} ({item.locationText})
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 text-xs space-y-1">
                    <p className="font-bold">🗺️ 표시할 지도가 없습니다.</p>
                    <p>관리자 로그인 후 지도를 업로드하면 활성화됩니다.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 분실물 리스트 */}
            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs shadow-sm">
                  등록된 분실물이 없습니다.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isFound = item.status === '찾음';
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        if (item.isApproved || isAdmin) {
                          setSelectedItem(item);
                          setViewMode('detail');
                        }
                      }}
                      className={`bg-white p-5 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition cursor-pointer hover:border-slate-400 ${isFound ? 'opacity-50 bg-slate-50/50 border-slate-100' : 'border-slate-200'}`}
                    >
                      <div className="flex gap-4 items-start">
                        {item.image && (
                          <img src={item.image} alt="물품" className="w-16 h-16 object-cover rounded-lg bg-slate-100 border border-slate-200 shrink-0" />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{item.category}</span>
                            <span className="text-[10px] text-slate-400">{item.date}</span>
                            {!item.isApproved && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">승인 대기</span>}
                          </div>
                          <h3 className={`font-bold text-sm ${isFound ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.title}</h3>
                          <p className="text-xs text-slate-500">📍 발견 장소: <span className="font-semibold text-slate-700">{item.locationText}</span></p>
                        </div>
                      </div>
                      
                      <div className="shrink-0 w-full md:w-auto flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && !item.isApproved ? (
                          <button onClick={() => handleApproveItem(item.id)} className="bg-slate-950 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">승인하기</button>
                        ) : (
                          item.isApproved && (
                            <button
                              onClick={() => { if (isFound) return; setSelectedItem(item); setResolveModalOpen(true); }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isFound ? 'bg-slate-200/60 text-slate-400 border-slate-100' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                            >
                              {item.status === '보관중' ? '보관중 (해결하기)' : '✓ 수령 완료'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================== 2. 상세 정보 화면 ==================== */}
        {viewMode === 'detail' && selectedItem && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 mr-2">{selectedItem.category}</span>
                <span className="text-xs text-slate-400">{selectedItem.date} 등록</span>
              </div>
              <button onClick={() => { setViewMode('list'); setSelectedItem(null); }} className="text-xs text-slate-500 hover:text-slate-800 font-bold">📋 목록으로 돌아가기</button>
            </div>

            <div className="space-y-4">
              <h2 className={`text-xl font-bold ${selectedItem.status === '찾음' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {selectedItem.title} 
                <span className={`ml-3 text-xs px-2 py-1 rounded-full ${selectedItem.status === '보관중' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                  {selectedItem.status}
                </span>
              </h2>

              {selectedItem.image && (
                <div className="w-full flex justify-center bg-slate-50 rounded-xl p-2 border border-slate-100">
                  <img src={selectedItem.image} alt="물품 원본 이미지" className="max-h-72 object-contain rounded-lg" />
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl space-y-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">📍 상세 발견 위치</h4>
                <p className="text-sm font-bold text-slate-800">{selectedItem.locationText}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">물품 상세 설명</h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.description || "등록된 상세 설명이 없습니다."}
                </p>
              </div>

              {/* 상세 페이지 내 지도 */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">🗺️ 지도로 위치 확인</h4>
                <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 max-w-sm mx-auto">
                  {schoolMapImage && (
                    <div className="relative w-full h-auto">
                      <img src={schoolMapImage} alt="학교 지도" className="w-full h-auto block pointer-events-none" />
                      <div 
                        className="absolute w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${selectedItem.mapX}%`, top: `${selectedItem.mapY}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedItem.status === '보관중' && (
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={() => setResolveModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm">
                  본인 물품 수령 및 해결하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. 등록 신청 화면 ==================== */}
        {viewMode === 'create' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">✍️ 새 분실물 등록 신청</h2>
              <button onClick={() => setViewMode('list')} className="text-xs text-slate-400 hover:text-slate-600 font-medium">❌ 취소</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">제보자 학번 *</label>
                  <input type="text" placeholder="예: 10101" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">카테고리 *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 text-slate-700 focus:outline-none">
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
                <input type="text" placeholder="예: 에어팟, 검은색 패딩지갑" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:outline-none" required />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">발견 위치 직접 입력 *</label>
                <input type="text" placeholder="예: 1학년 7반 뒷문 쪽, 미술실 교탁 아래, 본관 2층 계단" value={locationText} onChange={(e) => setLocationText(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:outline-none" required />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">상세 설명 (물품 상태 등)</label>
                <textarea rows={3} placeholder="주인을 쉽게 찾을 수 있도록 구체적인 특징이나 보관 상태를 적어주세요." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">물품 사진 첨부</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'item')} className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                {itemImage && <img src={itemImage} alt="미리보기" className="mt-2 w-24 h-24 object-cover rounded-lg border border-slate-200" />}
              </div>

              {/* 등록 페이지 내 지도 */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">
                  🗺️ (선택) 지도상에 대략적인 핀 고정하기
                </label>
                <p className="text-[10px] text-slate-400">지도를 클릭해 대략적인 장소에 핀을 꽂아줄 수 있습니다.</p>

                <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 max-w-sm mx-auto mt-1">
                  <div ref={registerMapRef} onClick={handleRegisterMapClick} className="relative w-full h-auto cursor-crosshair flex items-center justify-center">
                    {schoolMapImage ? (
                      <div className="relative w-full h-auto">
                        <img src={schoolMapImage} alt="학교 지도 선택용" className="w-full h-auto block pointer-events-none" />
                        <div 
                          className="absolute w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${clickX}%`, top: `${clickY}%` }}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-16 text-slate-400 text-xs my-auto">
                        <p className="font-bold">🗺️ 업로드된 학교 지도가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setViewMode('list')} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-lg text-sm transition">취소</button>
                <button type="submit" className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-sm">승인 요청하기</button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* 학번 인증 팝업 */}
      {resolveModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full border border-slate-200 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">📢 분실물 수령 완료 처리</h3>
            <p className="text-xs text-slate-400 mt-1 mb-3">글 등록 시 입력했던 <span className="font-bold text-slate-700">제보자 학번</span>을 입력해 주세요.</p>
            <form onSubmit={handleResolveStatus} className="space-y-3">
              <input type="text" placeholder="학번 입력 (예: 10101)" value={authStudentId} onChange={(e) => setAuthStudentId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400" autoFocus required />
              <div className="flex gap-2 justify-end text-xs font-medium">
                <button type="button" onClick={() => { setResolveModalOpen(false); setAuthStudentId(''); }} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500">취소</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 관리자 인증 팝업 */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full border border-slate-200 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">🔒 관리자 모드 인증</h3>
            <form onSubmit={handleAdminLogin} className="space-y-3 mt-3">
              <input type="password" placeholder="비밀번호를 입력하세요" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400" autoFocus required />
              <div className="flex gap-2 justify-end text-xs font-medium">
                <button type="button" onClick={() => { setShowAdminModal(false); setPasswordInput(''); }} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500">취소</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg">인증하기</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
