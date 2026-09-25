'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBoards, createBoard, Board } from "../../lib/api";
import Sidebar1 from "../components/Sidebar1";

export default function DashboardPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeBoardMenu, setActiveBoardMenu] = useState<number | null>(null);
  
  // arama kelimesini tutan state
  const [searchQuery, setSearchQuery] = useState("");

  const [currentUser, setCurrentUser] = useState({ 
    fullName: 'Sistem Yöneticisi', 
    username: '', 
    role: 'YÖNETİCİ' 
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = currentUser.role.toUpperCase().includes('YÖNETİCİ') || currentUser.role.toUpperCase().includes('ADMIN');

  // BİLDİRİM STATELERİ
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Okunmamış bildirim sayısını hesaplıyoruz (Kırmızı nokta için)
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const name = localStorage.getItem('fullName') || localStorage.getItem('username') || 'Sistem Yöneticisi';
    const uName = localStorage.getItem('username') || '';
    const role = localStorage.getItem('role') || 'YÖNETİCİ';
    
    setCurrentUser({ fullName: name, username: uName, role: role });

    loadBoards();
    // Sayfa açıldığında bildirimleri önden çek ki okunmamış varsa kırmızı nokta yansın
    loadNotifications();
  }, [router]);

  async function loadBoards() {
    try {
      setLoading(true);
      setError("");
      
      const data = await getBoards();
      const username = localStorage.getItem('username') || 'user';
      const hiddenBoards = JSON.parse(localStorage.getItem(`hidden_boards_${username}`) || '[]');
      const activeBoards = data.filter((board: Board) => !hiddenBoards.includes(String(board.id)));
      
      setBoards(activeBoards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "panolar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteBoard(boardId: number, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveBoardMenu(null);
    if (!confirm("bu panoyu kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5000/api/boards/${boardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadBoards();
    } catch (err) {
      alert("pano silinemedi.");
    }
  }

  function handleArchiveBoard(boardId: number, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveBoardMenu(null);
    if (!confirm("bu panoyu sadece kendi ekranınızdan gizlemek istediğinize emin misiniz?")) return;

    const username = localStorage.getItem('username') || 'user';
    const storageKey = `hidden_boards_${username}`;

    const hiddenBoards = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!hiddenBoards.includes(String(boardId))) {
      hiddenBoards.push(String(boardId));
      localStorage.setItem(storageKey, JSON.stringify(hiddenBoards));
    }

    loadBoards(); 
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const IconDots = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );

  // YENİ: Bildirimleri kendi yeni tablomuzdan çekiyoruz (Loglar yerine)
  async function loadNotifications() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/boards/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.slice(0, 10));
      }
    } catch (err) {
      console.error("bildirimler yüklenemedi", err);
    }
  }

  // YENİ: Zile tıklandığında okunmamışları okundu olarak işaretle
  const handleToggleNotifications = async () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    
    if (!isNotificationsOpen && unreadCount > 0) {
      // Ekranda anında okundu yapıp kırmızı noktayı söndür
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      
      // Backend'e is_read = 1 komutunu yolla
      try {
        const token = localStorage.getItem('token');
        await fetch(`http://localhost:5000/api/boards/notifications/read`, { 
          method: 'PUT', 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
      } catch (err) {}
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Sidebar1 />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ana sayfa &gt; panolar</span>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight">iş panoları</h1>
          </div>

          {/* arama çubuğu */}
          <div className="w-1/3 max-w-md relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none text-xs">
              🔍
            </span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="panolarda veya görevlerde ara..." 
              className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* BİLDİRİM ZİLİ */}
            <div className="relative">
              <button 
                onClick={handleToggleNotifications}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition relative"
              >
                {/* Okunmamış bildirim varsa kırmızı ve yanıp sönen nokta çıkar */}
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                  </span>
                )}
                🔔
              </button>

              {/* BİLDİRİM AÇILIR KUTUSU */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl py-3 z-50">
                  <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">sistem bildirimleri</h4>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">{unreadCount} yeni</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded">son hareketler</span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
{notifications.length > 0 ? (
  notifications.map((notif: any) => (
    <div 
      key={notif.id} 
      onClick={() => {
  if (notif.board_id) {
    // Eğer görevin panosu biliniyorsa direkt o panonun içine uç!
    router.push(`/dashboards/${notif.board_id}`);
  } else {
    // Pano bulunamazsa (örn: görev/pano silindiyse) genel panolar sayfasına git
    router.push('/dashboards');
  }
}}
      className={`px-4 py-3 transition cursor-pointer border-b border-slate-100 ${notif.is_read ? 'bg-white' : 'bg-emerald-50/50'}`}
    >
      <p className="text-xs font-bold text-slate-800 leading-snug">
        {notif.message}
      </p>
      <p className="text-[10px] text-slate-400 mt-1">
        {notif.created_at ? new Date(notif.created_at).toLocaleString('tr-TR') : ''}
      </p>
    </div>
  ))
) : (
  <div className="text-center py-6 text-slate-400 text-xs italic">
    henüz yeni bir bildirim bulunmuyor.
  </div>
)}
                  </div>
                </div>
              )}
            </div>

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

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 bg-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800">aktif iş panoları</h2>
              <p className="text-sm text-slate-500 mt-1"></p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                className="rounded-lg bg-[#063f2d] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#042e20] transition flex items-center gap-2"
              >
                <span className="text-base font-bold">+</span> yeni pano oluştur
              </button>
            )}
          </div>

          {loading && <div className="flex items-center justify-center py-20 text-slate-500 text-sm font-medium animate-pulse">sistem verileri senkronize ediliyor...</div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm font-medium">{error}</div>}

          {/* pano kartları - arama filtresi eklenmiş hali */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {boards
              .filter((board) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const nameMatch = board.board_name?.toLowerCase().includes(query);
                const descMatch = board.description?.toLowerCase().includes(query);
                return nameMatch || descMatch;
              })
              .map((board) => (
                <div
                  key={board.id}
                  onClick={() => router.push(`/dashboards/${board.id}`)} 
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-emerald-600 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-800 transition-colors">
                        {board.board_name}
                      </h3>
                      
                      <div className="relative">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setActiveBoardMenu(activeBoardMenu === board.id ? null : board.id); 
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <IconDots />
                        </button>

                        {activeBoardMenu === board.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveBoardMenu(null); }}></div>
                            <div className="absolute top-8 right-0 w-40 bg-white rounded-lg shadow-2xl border border-slate-200 z-50 py-1.5 text-sm" onClick={e => e.stopPropagation()}>
                              <button onClick={(e) => handleArchiveBoard(board.id, e)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium">arşivle</button>
                              {isAdmin && (
                                <button onClick={(e) => handleDeleteBoard(board.id, e)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 border-t border-slate-100 font-medium">panoyu sil</button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {board.description || "açıklama belirtilmemiş."}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-3 pt-3 border-t border-slate-100"></div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">aktif pano</span>
                      <span className="text-slate-400 text-xs font-semibold group-hover:text-emerald-700 transition-colors">incele &rarr;</span>
                    </div>
                  </div>

                </div>
              ))}
          </div>
        </main>
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] px-4 z-50">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-800">yeni iş panosu tanımla</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl font-light">&times;</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setLoading(true);
              const formData = new FormData(e.currentTarget);
              try {
                await createBoard(formData.get("name") as string, formData.get("description") as string);
                setShowForm(false);
                loadBoards();
              } catch (err) {
                setError(err instanceof Error ? err.message : "sistem hatası: kayıt oluşturulamadı.");
                setLoading(false);
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">pano adı <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  placeholder="örn: bilgi işlem projeleri"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">açıklama</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none"
                  placeholder="panonun amacını kısaca belirtin..."
                />
              </div>

              {error && <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded border border-red-100">{error}</p>}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition rounded-lg"
                >
                  iptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#063f2d] px-5 py-2 text-sm font-medium text-white hover:bg-[#042e20] transition rounded-lg shadow-sm disabled:opacity-60"
                >
                  {loading ? "kaydediliyor..." : "panoyu kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}