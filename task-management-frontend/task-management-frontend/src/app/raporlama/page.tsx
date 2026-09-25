'use client';

import React, { useEffect, useState, useCallback, useRef } from "react";
import Sidebar1 from "../components/Sidebar1";

// --- VERİ TİPLERİ ---
interface AuditLog {
  id: number;
  changed_at: string;
  table_name: string;
  action_type: string;
  full_name: string;
  record_id: number; 
  new_data?: string; 
}

interface Board { id: number; board_name: string; created_at: string; }
interface TaskAssignee { user_id: number; full_name: string; }
interface TaskNote { id: number; note_text: string; full_name: string; created_at: string; }
interface Task {
  id: number; title: string; status: string; priority: string;
  due_date?: string; created_at?: string; board_name: string;
  list_name: string; assignees: TaskAssignee[]; notes: TaskNote[];
}

export default function RaporlamaPage() {
  // --- KULLANICI BİLGİLERİ VE PROFİL MENÜSÜ STATE'İ ---
  const [userProfile, setUserProfile] = useState({ username: '', fullName: '', email: '', role: '', userId: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Profil menüsü aç/kapat
  const profileMenuRef = useRef<HTMLDivElement>(null); // Boşluğa tıklayınca menüyü kapatmak için
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  const [selectedBoard, setSelectedBoard] = useState("Tümü");
  const [selectedReportType, setSelectedReportType] = useState("Genel Özet (Detaylı)");

  const loadData = useCallback(async (adminStatus: boolean, userId: number) => {
    setRefreshing(true); setError("");
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError("Oturum bulunamadı."); return; }
      const headers = { 'Authorization': `Bearer ${token}` };

      if (adminStatus) {
        const logsRes = await fetch(`http://localhost:5000/api/boards/logs`, { headers });
        if (logsRes.ok) setLogs(await logsRes.json());
      }

      const boardsRes = await fetch(`http://localhost:5000/api/boards`, { headers });
      if (boardsRes.ok) {
        const boardsData: Board[] = await boardsRes.json();
        setBoards(boardsData);
        let collectedTasks: Task[] = [];

        for (const board of boardsData) {
          const detailRes = await fetch(`http://localhost:5000/api/boards/${board.id}/details`, { headers });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const lists = detailData.lists || [];

            const tasksWithInfo = (detailData.tasks || []).map((t: any) => {
                const listObj = lists.find((l: any) => Number(l.id) === Number(t.list_id));
                return {
                    ...t, board_name: board.board_name,
                    list_name: listObj ? listObj.list_name : 'Bilinmeyen Liste',
                    assignees: (detailData.assignees || []).filter((a: any) => Number(a.task_id) === Number(t.id)).map((a: any) => ({ user_id: Number(a.user_id), full_name: a.full_name })),
                    notes: (detailData.notes || []).filter((n: any) => Number(n.task_id) === Number(t.id))
                };
            });
            const tasksToProcess = adminStatus ? tasksWithInfo : tasksWithInfo.filter((t: Task) => t.assignees.some((a) => a.user_id === userId));
            collectedTasks = [...collectedTasks, ...tasksToProcess];
          }
        }
        setAllTasks(collectedTasks);
      }
    } catch (err) {
      setError("Veriler yüklenirken sorun oluştu.");
    } finally {
      setLoading(false); setTimeout(() => setRefreshing(false), 500);
    }
  }, []);

useEffect(() => {
    // 1. Veritabanından kesin gelen verileri al
    const fName = localStorage.getItem('fullName') || 'Kullanıcı';
    const role = localStorage.getItem('role') || 'Personel';
    const id = parseInt(localStorage.getItem('userId') || '0');

    // 2. Eksik verileri Ad Soyad üzerinden türet (Akıllı Dönüşüm)
    const safeName = fName.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .trim().replace(/\s+/g, '.'); // Boşlukları noktaya çevir

    // Eğer localStorage'da username/email varsa onu kullan, yoksa bizim ürettiğimizi kullan
    const uName = localStorage.getItem('username') || safeName;
    const mail = localStorage.getItem('email') || `${safeName}`;
    
    setUserProfile({ username: uName, fullName: fName, email: mail, role: role, userId: id });
    
    const adminCheck = role.toUpperCase().includes('YÖNETİCİ') || role.toUpperCase().includes('ADMIN');
    setIsAdmin(adminCheck);

    loadData(adminCheck, id);

    // Ekranda boş bir yere tıklanırsa profil menüsünü kapat
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [loadData]);

  const filteredTasks = selectedBoard === "Tümü" ? allTasks : allTasks.filter(t => t.board_name === selectedBoard);
  const totalFilteredTasks = filteredTasks.length;
  const completedFilteredTasks = filteredTasks.filter(t => t.status === 'Completed' || t.status === 'Tamamlandı' || t.status === 'Done').length;
  const activeFilteredTasks = totalFilteredTasks - completedFilteredTasks;
  const successRate = totalFilteredTasks === 0 ? 0 : Math.round((completedFilteredTasks / totalFilteredTasks) * 100);

  const uniquePersonnel = new Set();
  filteredTasks.forEach(t => t.assignees.forEach(a => uniquePersonnel.add(a.user_id)));
  const activePersonnelCount = uniquePersonnel.size;

  const userStats: Record<string, { name: string, total: number, completed: number }> = {};
  filteredTasks.forEach(t => {
      const isDone = t.status === 'Completed' || t.status === 'Tamamlandı' || t.status === 'Done';
      t.assignees.forEach(a => {
          if (!userStats[a.user_id]) userStats[a.user_id] = { name: a.full_name, total: 0, completed: 0 };
          userStats[a.user_id].total++;
          if (isDone) userStats[a.user_id].completed++;
      });
  });
  const userPerformanceList = Object.values(userStats).sort((a, b) => b.completed - a.completed);

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'KS';

  const formatAction = (action: string) => {
    const safeAction = action?.toUpperCase() || '';
    if (safeAction.includes('INSERT')) return { text: 'Oluşturdu', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (safeAction.includes('UPDATE')) return { text: 'Güncelledi', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (safeAction.includes('DELETE')) return { text: 'Sildi', color: 'text-red-600 bg-red-50 border-red-200' };
    if (safeAction.includes('UNARCHIVE')) return { text: 'Arşivden Çıkardı', color: 'text-purple-600 bg-purple-50 border-purple-200' };
    if (safeAction.includes('ARCHIVE')) return { text: 'Arşivledi', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    return { text: action, color: 'text-slate-600 bg-slate-50 border-slate-200' };
  };

  const formatTable = (table: string) => {
    switch (table) {
      case 'BOARDS': return 'Pano'; case 'TASKS': return 'Görev'; case 'LISTS': return 'Liste'; default: return table;
    }
  };

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " yıl önce";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " ay önce";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " gün önce";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " saat önce";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " dk önce";
    return "Az önce";
  };

  const confirmDownloadCSV = () => {
    const headers = ["Pano", "Liste (Asama)", "Gorev Basligi", "Durum", "Olusturulma Tarihi", "Atanan Kisiler"];
    const rows = filteredTasks.map(t => [
        `"${t.board_name}"`, `"${t.list_name}"`, `"${t.title}"`, `"${t.status}"`, 
        `"${t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '-'}"`, 
        `"${t.assignees.map(a => a.full_name).join(", ") || 'Atanmamis'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
    const boardStr = selectedBoard === 'Tümü' ? 'Tum_Panolar' : selectedBoard.replace(/\s+/g, '_');
    
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Kayseri_Seker_${boardStr}_Raporu_${dateStr}.csv`;
    link.click();
    setIsCsvModalOpen(false); 
  };

  const handleUnarchive = async (boardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bu panoyu arşivden çıkarmak istediğinize emin misiniz?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/boards/${boardId}/unarchive`, {
          method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
          alert("Pano arşivden çıkarıldı.");
          loadData(isAdmin, userProfile.userId); 
      } else alert("Bir sorun oluştu.");
    } catch (err) { console.error(err); }
  };

  // YENİ: JSON Verisini Hem Eski Hem Yeni Loglar İçin Şık Türkçeye Çeviren Mantık
  const renderLogDetails = (dataStr?: string, recordId?: number, actionType?: string) => {
      if (!dataStr) return <span className="text-slate-400 italic">Bu işlem için ek detay kaydedilmemiş.</span>;
      try {
          const parsed = JSON.parse(dataStr);
          return (
              <ul className="space-y-2 mt-2">
                  {Object.entries(parsed).map(([key, value]) => {
                      // Eski Logları Toparlama ve Türkçeleştirme
                      let niceKey = key.replace('_', ' ');
                      let niceValue = String(value);

                      if (key === 'action') niceKey = 'İşlem Detayı';
                      if (key === 'pano_adi') niceKey = 'İlgili Pano Adı';
                      if (key === 'islem') niceKey = 'Yapılan İşlem';
                      if (key === 'durum' || key === 'status') niceKey = 'Son Durum';

                      if (niceValue === 'Soft Delete') niceValue = 'Sistemden Silindi (Çöp Kutusuna Taşındı)';
                      if (niceValue === 'Archived') niceValue = 'Arşive Kaldırıldı';
                      if (niceValue === 'Active') niceValue = 'Aktif Hale Getirildi';

                      return (
                          <li key={key} className="flex items-center gap-3">
                              <span className="font-semibold text-slate-500 capitalize min-w-[120px]">{niceKey}:</span>
                              <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded shadow-sm">
                                  {niceValue}
                              </span>
                          </li>
                      )
                  })}
                  {/* Eski loglarda pano adı yoksa, kullanıcıya bilgi vermek için ekliyoruz */}
                  {!parsed.pano_adi && (
                       <li className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                          <span className="font-semibold text-slate-500 min-w-[120px]">Kayıt ID Numarası:</span>
                          <span className="text-slate-600 font-bold bg-slate-100 border border-slate-200 px-3 py-1 rounded">
                              {recordId} (Eski kayıt olduğu için pano adı bulunamadı)
                          </span>
                      </li>
                  )}
              </ul>
          );
      } catch (e) {
          return <span className="text-slate-700 font-medium">{dataStr}</span>;
      }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  if (loading) return (
      <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800">
          <Sidebar1 />
          <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium">Sistem Verileri Derleniyor...</p>
          </div>
      </div>
  );

  if (error) return (
      <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800">
          <Sidebar1 />
          <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-red-500 font-bold mb-4">{error}</p>
              <button onClick={() => loadData(isAdmin, userProfile.userId)} className="bg-emerald-600 text-white px-4 py-2 rounded">Tekrar Dene</button>
          </div>
      </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Sidebar1 />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ana Sayfa &gt; Raporlama</span>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight">Detaylı Sistem Analizi</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button onClick={() => setIsCsvModalOpen(true)} className="px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-white hover:shadow-sm rounded transition flex items-center gap-1"><span className="text-sm"></span> CSV İndir</button>
                <button onClick={() => window.print()} className="px-3 py-1 text-xs font-bold text-blue-700 hover:bg-white hover:shadow-sm rounded transition flex items-center gap-1"><span className="text-sm"></span> Yazdır</button>
             </div>
             
             {/* YENİ NESİL KULLANICI PROFİLİ MENÜSÜ */}
            <div className="relative" ref={profileMenuRef}>
              <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)} 
                  className="flex items-center gap-3 bg-slate-50 border border-slate-200 pl-3 pr-1.5 py-1.5 rounded-xl shadow-sm hover:bg-slate-100 transition focus:outline-none"
              >
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 leading-tight">{userProfile.username}</span>
                  <span className="text-[10px] text-emerald-700 font-bold">{userProfile.role}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-inner">
                  {getInitials(userProfile.fullName)}
                </div>
              </button>

              {/* AÇILIR PROFİL KUTUSU (DROPDOWN) */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                     <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-lg">
                        {getInitials(userProfile.fullName)}
                     </div>
                     <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-slate-800 truncate">{userProfile.fullName}</span>
                        <span className="text-[11px] text-slate-500 truncate">{userProfile.email}</span>
                     </div>
                  </div>
                  <div className="p-2">
                    <button className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-2">
                      ⚙️ Hesap Ayarları
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-2 mt-1">
                      🚪 Sistemden Çıkış Yap
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 custom-scrollbar print:p-0 print:bg-white">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between print:hidden">
              <div className="flex gap-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rapor Türü</label>
                    <select 
                     className="bg-slate-50 border border-slate-200 text-sm rounded px-3 py-1.5 outline-none focus:border-emerald-500 min-w-[170px]" 
                     value={selectedReportType} 
                      onChange={(e) => setSelectedReportType(e.target.value)}
                      >
                     <option>Genel Özet (Detaylı)</option>
                     {isAdmin && <option>Kullanıcı Performansı</option>}
                     {isAdmin && <option>Aktivite Logu</option>}
                     {/* HERKESİN GÖREBİLMESİ İÇİN isAdmin ŞARTINI KALDIRDIK */}
                     <option>Arşiv ve Silinenler</option>
                    </select>
                </div>
                {selectedReportType === "Genel Özet (Detaylı)" && (
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pano Seç</label>
                        <select className="bg-slate-50 border border-slate-200 text-sm rounded px-3 py-1.5 outline-none focus:border-emerald-500 min-w-[150px]" value={selectedBoard} onChange={(e) => setSelectedBoard(e.target.value)}>
                            <option value="Tümü">Tüm Panolar</option>
                            {boards.map(b => <option key={b.id} value={b.board_name}>{b.board_name}</option>)}
                        </select>
                    </div>
                )}
              </div>
              <button onClick={() => loadData(isAdmin, userProfile.userId)} disabled={refreshing} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition disabled:opacity-50">
                  <span className={`text-lg ${refreshing ? 'animate-spin' : ''}`}>🔄</span> {refreshing ? 'Yükleniyor...' : 'Verileri Yenile'}
              </button>
          </div>

          {/* GENEL ÖZET */}
          {selectedReportType === "Genel Özet (Detaylı)" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm border-l-4 border-l-blue-500">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">📋 Toplam Görev</p>
                      <p className="text-3xl font-black text-slate-700">{totalFilteredTasks}</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm border-l-4 border-l-emerald-500">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">✅ Tamamlanan</p>
                      <p className="text-3xl font-black text-emerald-600">{completedFilteredTasks} <span className="text-sm font-bold text-emerald-500">%{(successRate)}</span></p>
                    </div>
                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm border-l-4 border-l-amber-500">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">⏳ Devam Eden</p>
                      <p className="text-3xl font-black text-amber-600">{activeFilteredTasks}</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm border-l-4 border-l-purple-500">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">👥 Görevli Personel</p>
                      <p className="text-3xl font-black text-purple-600">{activePersonnelCount}</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
                   <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between">
                     <h3 className="text-base font-bold text-slate-800">Görev Dağılımı ve Atamalar</h3>
                   </div>
                   <div className="p-0">
                     <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-white text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                         <tr>
                           <th className="px-6 py-4">Pano</th>
                           <th className="px-6 py-4">Liste (Aşama)</th>
                           <th className="px-6 py-4">Görev Başlığı</th>
                           <th className="px-6 py-4">Durum</th>
                           <th className="px-6 py-4">Atanan Kişiler</th>
                           <th className="px-6 py-4 text-right">Detaylar</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {filteredTasks.length > 0 ? filteredTasks.map(task => {
                             const isDone = task.status === 'Completed' || task.status === 'Done' || task.status === 'Tamamlandı';
                             const isExpanded = expandedTaskId === task.id;
                             return (
                               <React.Fragment key={task.id}>
                                 <tr className={`hover:bg-slate-50 transition cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`} onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                   <td className="px-6 py-4 font-semibold text-slate-500 text-xs">{task.board_name}</td>
                                   <td className="px-6 py-4 font-semibold text-blue-600 text-xs">{task.list_name}</td>
                                   <td className={`px-6 py-4 font-bold ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</td>
                                   <td className="px-6 py-4"><span className={`text-[10px] font-bold px-2 py-1 rounded ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{isDone ? 'Tamamlandı' : 'Devam Ediyor'}</span></td>
                                   <td className="px-6 py-4">
                                       {task.assignees.length > 0 ? (
                                           <div className="flex flex-wrap gap-1">
                                               {task.assignees.map(a => (
                                                   <span key={a.user_id} className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-semibold">{a.full_name}</span>
                                               ))}
                                           </div>
                                       ) : <span className="text-xs text-slate-400 italic">Atanmamış</span>}
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      <button className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded transition">{isExpanded ? 'Kapat ⯅' : 'İncele ⯆'}</button>
                                   </td>
                                 </tr>
                                 {isExpanded && (
                                     <tr className="bg-slate-50/50">
                                         <td colSpan={6} className="px-6 py-6 border-b border-slate-200">
                                             <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                                 <div>
                                                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Görev Künyesi</h4>
                                                     <div className="space-y-2 text-sm">
                                                         <div className="flex justify-between border-b border-slate-100 pb-2">
                                                             <span className="text-slate-500">Oluşturulma:</span><span className="font-semibold text-slate-700">{task.created_at ? new Date(task.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'}</span>
                                                         </div>
                                                         <div className="flex justify-between border-b border-slate-100 pb-2">
                                                             <span className="text-slate-500">Vade Tarihi:</span><span className={`font-semibold ${task.due_date && new Date(task.due_date) < new Date() && !isDone ? 'text-red-600' : 'text-slate-700'}`}>{task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : 'Tarih belirlenmemiş'}</span>
                                                         </div>
                                                         <div className="flex justify-between pb-2">
                                                             <span className="text-slate-500">Öncelik Seviyesi:</span><span className="font-semibold text-slate-700">{task.priority || 'Normal'}</span>
                                                         </div>
                                                     </div>
                                                 </div>
                                                 <div>
                                                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Görev İçi Notlar ve Yorumlar</h4>
                                                     {task.notes && task.notes.length > 0 ? (
                                                         <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                             {task.notes.map(note => (
                                                                 <div key={note.id} className="bg-slate-50 p-3 rounded border border-slate-100 text-sm">
                                                                     <div className="flex justify-between items-center mb-1"><span className="font-bold text-slate-700 text-xs">{note.full_name}</span><span className="text-[9px] text-slate-400">{new Date(note.created_at).toLocaleDateString('tr-TR')}</span></div>
                                                                     <p className="text-slate-600 text-xs">{note.note_text}</p>
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     ) : <div className="bg-slate-50 p-4 rounded border border-slate-100 flex items-center justify-center text-slate-400 text-xs italic">Bu göreve henüz hiç not düşülmemiş.</div>}
                                                 </div>
                                             </div>
                                         </td>
                                     </tr>
                                 )}
                               </React.Fragment>
                             )
                         }) : <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Görüntülenecek görev bulunamadı.</td></tr>}
                       </tbody>
                     </table>
                   </div>
                </div>
              </>
          )}

          {/* KULLANICI PERFORMANSI */}
          {(isAdmin && selectedReportType === "Kullanıcı Performansı") && (
             <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                 <h3 className="text-base font-bold text-slate-800">Personel Performans ve Başarı Sıralaması</h3>
               </div>
               <div className="p-0 overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-white text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                     <tr>
                       <th className="px-6 py-3">Personel</th><th className="px-6 py-3 text-center">Toplam Görev</th><th className="px-6 py-3 text-center">Biten</th><th className="px-6 py-3 text-center">Devam Eden</th><th className="px-6 py-3 w-48">Başarı Oranı</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {userPerformanceList.length > 0 ? userPerformanceList.map((user, idx) => {
                         const rate = Math.round((user.completed / user.total) * 100);
                         return (
                         <tr key={idx} className="hover:bg-slate-50">
                           <td className="px-6 py-4 flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-[#063f2d] text-white flex items-center justify-center text-xs font-bold">{getInitials(user.name)}</div>
                               <span className="font-bold text-slate-700">{user.name}</span>
                           </td>
                           <td className="px-6 py-4 text-center font-bold text-slate-600">{user.total}</td>
                           <td className="px-6 py-4 text-center font-bold text-emerald-600">{user.completed}</td>
                           <td className="px-6 py-4 text-center font-bold text-amber-600">{user.total - user.completed}</td>
                           <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-600 w-8">%{rate}</span>
                                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className={`h-full ${rate > 80 ? 'bg-emerald-500' : rate > 40 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${rate}%` }}></div>
                                    </div>
                                </div>
                           </td>
                         </tr>
                       )}) : <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Performans verisi bulunamadı.</td></tr>}
                   </tbody>
                 </table>
               </div>
             </div>
          )}

          {/* AKTİVİTE LOGU */}
          {(isAdmin && selectedReportType === "Aktivite Logu") && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-10">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-800">Sistem Aktivite Akışı</h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <tbody className="divide-y divide-slate-100">
                    {logs.length > 0 ? logs.map(log => {
                      const actionFormat = formatAction(log.action_type);
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <React.Fragment key={log.id}>
                          <tr className={`hover:bg-slate-50 transition cursor-pointer ${isExpanded ? 'bg-slate-50/50' : ''}`} onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
                            <td className="px-6 py-4 w-48">
                              <div className="text-xs font-bold text-slate-700">{timeAgo(log.changed_at)}</div>
                              <div className="text-[10px] text-slate-400">{new Date(log.changed_at).toLocaleString('tr-TR')}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">{getInitials(log.full_name)}</div>
                                    <div>
                                        <span className="font-bold text-slate-800">{log.full_name || 'Sistem'}</span> 
                                        <span className="text-slate-500 ml-1"><span className="font-semibold text-slate-700">{formatTable(log.table_name)}</span> tablosunda işlem yaptı.</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${actionFormat.color} mr-2`}>{actionFormat.text}</span>
                              <button className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">{isExpanded ? 'Kapat ⯅' : 'İncele ⯆'}</button>
                            </td>
                          </tr>
                          
                          {/* Log Detay İçeriği - YENİ TASARIM */}
                          {isExpanded && (
                             <tr className="bg-slate-50 border-b border-slate-200">
                                <td colSpan={3} className="px-6 py-4">
                                   <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm text-xs">
                                      <p className="font-bold text-slate-500 mb-2 border-b border-slate-100 pb-2">Veritabanına İşlenen Yeni Değerler:</p>
                                      {/* Eski ve Yeni logları Türkçeleştiren fonksiyon */}
                                      {renderLogDetails(log.new_data, log.record_id, log.action_type)}
                                   </div>
                                </td>
                             </tr>
                          )}
                        </React.Fragment>
                      );
                    }) : <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Aktivite yok.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
{/* ARŞİV VE SİLİNENLER (Yönetici için sistem logları, Personel için kişisel arşiv) */}
{selectedReportType === "Arşiv ve Silinenler" && (
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-10">
    <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 flex justify-between items-center">
      <h3 className="text-base font-bold text-red-800">
        {isAdmin ? "Geçmiş Arşiv ve Çöp Kutusu Kayıtları" : "Kişisel Arşivlenen Panolarım"}
      </h3>
    </div>
    
    <div className="p-0 overflow-x-auto">
      {isAdmin ? (
        /* --- YÖNETİCİ İSE: TÜM SİSTEMİN ARŞİV/SİLİNME LOGLARI --- */
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-white text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr><th className="px-6 py-3">İşlem Tarihi</th><th className="px-6 py-3">Silen / Arşivleyen</th><th className="px-6 py-3">Kayıt Yeri (ID)</th><th className="px-6 py-3">Durum</th><th className="px-6 py-3 text-right">İşlem</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.filter(l => (l.action_type || '').toUpperCase() === 'DELETE' || (l.action_type || '').toUpperCase() === 'ARCHIVE').length > 0 ? 
             logs.filter(l => (l.action_type || '').toUpperCase() === 'DELETE' || (l.action_type || '').toUpperCase() === 'ARCHIVE').map(log => {
              const actionFormat = formatAction(log.action_type);
              const isExpanded = expandedLogId === log.id;
              return (
                <React.Fragment key={log.id}>
                  <tr className={`hover:bg-red-50/30 transition cursor-pointer ${isExpanded ? 'bg-red-50/20' : ''}`} onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
                    <td className="px-6 py-3 whitespace-nowrap text-xs font-medium text-slate-500">{new Date(log.changed_at).toLocaleString('tr-TR')}</td>
                    <td className="px-6 py-3 font-bold text-slate-700">{log.full_name || 'Sistem'}</td>
                    <td className="px-6 py-3 font-semibold text-slate-700">{formatTable(log.table_name)} <span className="text-xs text-slate-400">(Kayıt No: {log.record_id})</span></td>
                    <td className="px-6 py-3"><span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${actionFormat.color}`}>{actionFormat.text}</span></td>
                    <td className="px-6 py-3 text-right flex justify-end gap-2">
                        {(log.action_type || '').toUpperCase() === 'ARCHIVE' && log.table_name === 'BOARDS' && (
                            <button onClick={(e) => handleUnarchive(log.record_id, e)} className="text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded">Geri Al</button>
                        )}
                        <button className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">{isExpanded ? 'Kapat ⯅' : 'İncele ⯆'}</button>
                    </td>
                  </tr>
                  {isExpanded && (
                     <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={5} className="px-6 py-4">
                           <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm text-xs">
                              <p className="font-bold text-slate-500 mb-3 border-b border-slate-100 pb-2">Arşivlenen/Silinen İçerik Detayı:</p>
                              {renderLogDetails(log.new_data, log.record_id, log.action_type)}
                           </div>
                        </td>
                     </tr>
                  )}
                </React.Fragment>
              );
            }) : <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Kayıt bulunmuyor.</td></tr>}
          </tbody>
        </table>
      ) : (
        /* --- PERSONEL / ÇALIŞAN İSE: KENDİ LOCALSTORAGE ARŞİVÜ --- */
        <div className="p-6">
          {(() => {
            const username = localStorage.getItem('username') || 'user';
            const hiddenBoards = JSON.parse(localStorage.getItem(`hidden_boards_${username}`) || '[]');
            const myArchivedBoards = boards.filter(b => hiddenBoards.includes(String(b.id)));

            if (myArchivedBoards.length === 0) {
              return <div className="text-center py-10 text-slate-400 italic text-sm">Arşivinizde hiç pano bulunmuyor.</div>;
            }

            return (
              <div className="space-y-3">
                {myArchivedBoards.map(board => (
                  <div key={board.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 transition">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{board.board_name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Oluşturulma: {new Date(board.created_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <button
                      onClick={() => {
                        let hidden = JSON.parse(localStorage.getItem(`hidden_boards_${username}`) || '[]');
                        hidden = hidden.filter((id: string) => id !== String(board.id));
                        localStorage.setItem(`hidden_boards_${username}`, JSON.stringify(hidden));
                        loadData(isAdmin, userProfile.userId); // Sayfayı yenilemek için
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-sm shrink-0"
                    >
                      Geri Yükle ↺
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  </div>
)}

        </main>
      </div>

      {isCsvModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden border border-slate-100">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">📊</span> Raporu İndir (CSV)</h3>
                <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                  <strong className="text-slate-800">{selectedBoard === 'Tümü' ? 'Tüm panoların' : `"${selectedBoard}" panosunun`}</strong> detaylı görev ve personel verilerini indireceksiniz. Onaylıyor musunuz?
                </p>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setIsCsvModalOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition">İptal</button>
                  <button onClick={confirmDownloadCSV} className="px-4 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition">Evet, İndir</button>
                </div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}