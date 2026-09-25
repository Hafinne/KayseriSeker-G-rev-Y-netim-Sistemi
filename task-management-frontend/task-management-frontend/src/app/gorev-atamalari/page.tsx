'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar1 from "../components/Sidebar1";

// görev ve atama veri tipleri
interface TaskAssignee { user_id: number; full_name: string; }
interface Task {
  id: number; title: string; status: string; priority: string;
  due_date?: string; created_at?: string; board_name: string;
  list_name: string; assignees: TaskAssignee[];
}

export default function GorevAtamalariPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterStatus, setFilterStatus] = useState("tümü");

  // profil menüsü için açma/kapama state'i
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState({ 
    fullName: 'Sistem Yöneticisi', 
    username: '', 
    role: 'YÖNETİCİ',
    userId: 0
  });

  // sayfa yüklendiğinde kullanıcı bilgilerini al ve görevleri çek
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const name = localStorage.getItem('fullName') || localStorage.getItem('username') || 'Sistem Yöneticisi';
    const uName = localStorage.getItem('username') || '';
    const role = localStorage.getItem('role') || 'YÖNETİCİ';
    const uId = parseInt(localStorage.getItem('userId') || '0');

    setCurrentUser({ fullName: name, username: uName, role: role, userId: uId });

    loadMyTasks(uId);
  }, [router]);

  // kullanıcıya atanan görevleri backend üzerinden derleyip çeken fonksiyon
  async function loadMyTasks(userId: number) {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const headers = { 'Authorization': `Bearer ${token}` };

      // önce tüm panoları alıyoruz
      const boardsRes = await fetch(`http://localhost:5000/api/boards`, { headers });
      if (!boardsRes.ok) throw new Error("panolar yüklenemedi.");
      const boardsData = await boardsRes.json();

      let myCollectedTasks: Task[] = [];

      // her panonun detayına girip görevleri ve atananları süzüyoruz
      for (const board of boardsData) {
        const detailRes = await fetch(`http://localhost:5000/api/boards/${board.id}/details`, { headers });
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          const lists = detailData.lists || [];

          const boardTasks = (detailData.tasks || []).map((t: any) => {
            const listObj = lists.find((l: any) => Number(l.id) === Number(t.list_id));
            const assignees = (detailData.assignees || []).filter((a: any) => Number(a.task_id) === Number(t.id)).map((a: any) => ({
              user_id: Number(a.user_id),
              full_name: a.full_name
            }));

            return {
              ...t,
              board_name: board.board_name,
              list_name: listObj ? listObj.list_name : 'bilinmeyen liste',
              assignees: assignees,
              notes: []
            };
          });

          // sadece giriş yapan kullanıcının üstüne atanan görevleri filtreliyoruz
          const assignedToMe = boardTasks.filter((t: Task) => t.assignees.some(a => a.user_id === userId));
          myCollectedTasks = [...myCollectedTasks, ...assignedToMe];
        }
      }

      setTasks(myCollectedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "görevler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  // duruma göre görevleri filtreleme
  const filteredTasks = tasks.filter(task => {
    const isDone = task.status === 'Completed' || task.status === 'Tamamlandı' || task.status === 'Done';
    if (filterStatus === 'tamamlanan') return isDone;
    if (filterStatus === 'devameden') return !isDone;
    return true;
  });

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Sidebar1 />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* üst bilgi çubuğu */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ana sayfa &gt; görev atamaları</span>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight">bana atanan görevler</h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition relative">
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              🔔
            </button>

            <div className="h-5 w-px bg-slate-200"></div>

            <div className="relative">
              <div 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition select-none"
              >
                <div className="h-7 w-7 bg-emerald-700 text-white rounded-full flex items-center justify-center text-[11px] font-bold shadow">
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'S'}
                </div>
                
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium uppercase">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">@{currentUser.username}</p>
                  </div>

                  <button 
                    onClick={() => router.push('/sifre-belirle')}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium transition"
                  >
                    ⚙️ şifre değiştir
                  </button>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button 
                      onClick={() => {
                        localStorage.clear();
                        router.push('/login');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold transition"
                    >
                      🚪 sistemden çıkış yap
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ana içerik alanı */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10 bg-slate-50">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">görev listem</h2>
              <p className="text-xs text-slate-500 mt-1">üzerinize atanmış olan tüm işleri buradan takip edebilirsiniz.</p>
            </div>

            {/* durum filtreleme butonları */}
            <div className="flex bg-slate-200 p-1 rounded-lg gap-1">
              <button 
                onClick={() => setFilterStatus('tümü')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filterStatus === 'tümü' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                tümü ({tasks.length})
              </button>
              <button 
                onClick={() => setFilterStatus('devameden')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filterStatus === 'devameden' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                devam eden
              </button>
              <button 
                onClick={() => setFilterStatus('tamamlanan')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filterStatus === 'tamamlanan' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                tamamlanan
              </button>
            </div>
          </div>

          {loading && <div className="flex items-center justify-center py-20 text-slate-500 text-sm font-medium animate-pulse">görevleriniz senkronize ediliyor...</div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm font-medium">{error}</div>}

          {/* görev listesi tablosu */}
          {!loading && !error && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">pano</th>
                    <th className="px-6 py-4">aşama (liste)</th>
                    <th className="px-6 py-4">görev başlığı</th>
                    <th className="px-6 py-4">durum</th>
                    <th className="px-6 py-4">vade tarihi</th>
                    <th className="px-6 py-4 text-right">işlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length > 0 ? filteredTasks.map(task => {
                    const isDone = task.status === 'Completed' || task.status === 'Done' || task.status === 'Tamamlandı';
                    return (
                      <tr key={task.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-semibold text-slate-500 text-xs">{task.board_name}</td>
                        <td className="px-6 py-4 font-semibold text-blue-600 text-xs">{task.list_name}</td>
                        <td className={`px-6 py-4 font-bold ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isDone ? 'tamamlandı' : 'devam ediyor'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : 'belirtilmemiş'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => router.push('/dashboards')}
                            className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded transition"
                          >
                            panoya git &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                        üzerinize atanmış herhangi bir görev bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}