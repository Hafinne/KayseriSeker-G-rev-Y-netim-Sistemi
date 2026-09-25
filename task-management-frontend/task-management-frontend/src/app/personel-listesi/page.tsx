'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from "../components/Sidebar1";

interface User {
  id: number;
  username: string;
  full_name: string;
  status: string;
  role_name: string;
}

export default function PersonelListesiPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('2');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dropdown menü kontrolü için state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Giriş yapan kullanıcının bilgilerini dinamik okuma
  const [currentUser, setCurrentUser] = useState({ 
    fullName: 'Sistem Yöneticisi', 
    username: '', 
    role: 'YÖNETİCİ' 
  });

  // ==========================================
  // BİLDİRİM STATELERİ VE FONKSİYONLARI
  // ==========================================
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`http://localhost:5000/api/boards/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.slice(0, 10)); // Son 10 bildirim
      }
    } catch (err) {
      console.error("Bildirimler yüklenemedi", err);
    }
  };

  const handleToggleNotifications = async () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen && unreadCount > 0) {
      // Ekranda anında okundu yap
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      try {
        const token = localStorage.getItem('token');
        await fetch(`http://localhost:5000/api/boards/notifications/read`, { 
          method: 'PUT', 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
      } catch (err) {}
    }
  };
  // ==========================================

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Personeller yüklenemedi.');

      setUsers(data);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const name = localStorage.getItem('fullName') || localStorage.getItem('username') || 'Sistem Yöneticisi';
    const uName = localStorage.getItem('username') || '';
    const role = localStorage.getItem('role') || 'YÖNETİCİ';
    setCurrentUser({ fullName: name, username: uName, role });

    // Sayfa açıldığında personelleri ve bildirimleri yükle
    fetchUsers();
    loadNotifications();

    // Bildirimleri 10 saniyede bir otomatik yenile
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          full_name: fullName,
          password,
          role_id: parseInt(roleId)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Personel oluşturulamadı.');

      alert('Personel başarıyla sisteme tanımlandı.');
      setShowModal(false);
      setFullName('');
      setUsername('');
      setPassword('');
      fetchUsers();
    } catch (err: unknown) {
      if (err instanceof Error) setFormError(err.message);
      else setFormError('Bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Durum güncellenemedi.');
      }
      fetchUsers();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
      else alert('Durum güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Kullanıcı silindi.");
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Silme işlemi başarısız.");
      }
    } catch (err) {
      alert("Silme sırasında bir hata oluştu.");
    }
  };

  function handleLogout() {
    localStorage.clear();
    router.push("/login");
  }

  const getInitials = (name: string) => {
    if (!name) return 'S';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-body text-slate-800">
      
      {/* SOL MENÜ */}
      <Sidebar/>

      {/* SAĞ İÇERİK ALANI */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* ÜST BAR */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ana Sayfa &gt; Yönetim</span>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight">Personel Yönetimi</h1>
          </div>

          <div className="w-1/3 max-w-md relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none text-xs">🔍</span>
            <input 
              type="text" 
              placeholder="Sistemde ara (Proje, görev veya personel)..." 
              className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:border-emerald-600 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3">
            
            {/* BİLDİRİM ZİLİ BAŞLANGIÇ */}
            <div className="relative">
              <button 
                onClick={handleToggleNotifications}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition relative flex items-center justify-center"
              >
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                  </span>
                )}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-[998]" onClick={() => setIsNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl py-3 z-[999]">
                    <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">sistem bildirimleri</h4>
                      {unreadCount > 0 ? (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">{unreadCount} yeni</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded">son hareketler</span>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 custom-scrollbar relative z-[1000]">
                      {notifications.length > 0 ? (
                        notifications.map((notif: any) => (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              if (notif.board_id) {
                                router.push(`/dashboards/${notif.board_id}`);
                              } else {
                                router.push('/dashboards');
                              }
                            }}
                            className={`px-4 py-3 transition cursor-pointer border-b border-slate-100 ${notif.is_read ? 'bg-white hover:bg-slate-50' : 'bg-emerald-50/50 hover:bg-emerald-50'}`}
                          >
                            <p className="text-xs font-bold text-slate-800 leading-snug">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{notif.created_at ? new Date(notif.created_at).toLocaleString('tr-TR') : ''}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-xs italic">henüz yeni bir bildirim bulunmuyor.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* BİLDİRİM ZİLİ BİTİŞ */}

            <div className="h-5 w-px bg-slate-200"></div>

            <div className="relative">
              <div 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition select-none"
              >
                <div className="h-7 w-7 bg-emerald-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow">
                  {getInitials(currentUser.fullName)}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">{currentUser.fullName}</span>
                  <span className="text-[10px] text-emerald-700 font-medium uppercase">{currentUser.role}</span>
                </div>
              </div>

              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[40]" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</p>
                      <p className="text-[10px] text-slate-500 truncate">@{currentUser.username}</p>
                    </div>

                    <button 
                      onClick={() => router.push('/sifre-belirle')}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium transition"
                    >
                      ⚙️ Şifre Değiştir
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold transition"
                      >
                        🚪 Sistemden Çıkış Yap
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 lg:p-10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Personel Yönetimi</h2>
              <p className="text-sm text-slate-500 mt-1">Sistemdeki tüm çalışanların listesi ve durumları.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 transition flex items-center gap-2"
            >
              <span>+</span> Yeni Personel Tanımla
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-20 text-slate-500 font-medium">Sistem verileri yükleniyor...</div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-slate-200">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-6">ID</th>
                    <th className="py-3 px-6">Ad Soyad</th>
                    <th className="py-3 px-6">Kullanıcı Adı</th>
                    <th className="py-3 px-6">Rol</th>
                    <th className="py-3 px-6">Durum</th>
                    <th className="py-3 px-6 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono text-slate-500">{user.id}</td>
                      <td className="py-4 px-6 font-semibold text-slate-900">{user.full_name}</td>
                      <td className="py-4 px-6 text-slate-600">{user.username}</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold uppercase tracking-wide border border-emerald-200">
                          {user.role_name}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                          user.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleStatus(user.id)}
                          className={`text-xs font-medium px-3 py-1.5 rounded transition border ${
                            user.status === 'Active' 
                              ? 'text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border-red-200' 
                              : 'text-emerald-600 hover:text-emerald-800 bg-emerald-50 bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          {user.status === 'Active' ? 'Pasife Al' : 'Aktif Et'}
                        </button>

                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition border border-red-200 flex items-center gap-1"
                        >
                          🗑️ Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Yeni Personel Tanımla</h2>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-xs border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Ad Soyad</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-slate-800 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-slate-800 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Geçici Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-slate-800 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Rol Yetkisi</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-slate-800 text-sm outline-none bg-white"
                >
                  <option value="1">Sistem Yöneticisi (Admin)</option>
                  <option value="2">Personel / Çalışan</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition">
                  İptal
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-md transition">
                  {submitting ? 'Kaydediliyor...' : 'Kaydı Tamamla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}