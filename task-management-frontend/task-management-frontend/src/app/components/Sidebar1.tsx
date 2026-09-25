'use client';

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link"; // Next.js'in meşhur sayfa geçiş aracı!

interface SidebarProps {
  onReportClick?: () => void; 
}

export default function Sidebar1({ onReportClick }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role') || 'YÖNETİCİ';
    setIsAdmin(role.toUpperCase().includes('YÖNETİCİ') || role.toUpperCase().includes('ADMIN'));
  }, []);

  const getButtonClass = (path: string) => {
    const isActive = pathname === path || pathname.startsWith(path + '/');
    return isActive
      ? "w-full flex items-center px-4 py-2.5 bg-white/10 text-white rounded-md text-sm font-medium transition text-left"
      : "w-full flex items-center px-4 py-2.5 text-white/60 hover:bg-white/5 hover:text-white rounded-md text-sm font-medium transition text-left";
  };

  return (
   <aside className="w-64 bg-evergreen-dark flex flex-col shadow-lg z-20 hidden md:flex border-r border-evergreen/20">
      
      <div className="h-16 flex items-center px-6 bg-black/10 border-b border-white/5">
        <div className="bg-white p-1 rounded h-8 w-8 flex items-center justify-center mr-3">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <span className="font-bold text-lg text-white tracking-wide">Kayseri Şeker</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-bold text-emerald-400/60 uppercase tracking-widest mb-3">İş Alanı</p>
        
        {/* BUTTON YERİNE LINK KULLANIYORUZ */}
        <Link href="/dashboards" className={getButtonClass('/dashboards')}>
          Panolar
        </Link>
        
        <Link href="/gorev-atamalari" className={getButtonClass('/gorev-atamalari')}>
          Görev Atamaları
        </Link>
        
        <Link href="/takvim" className={getButtonClass('/takvim')}>
          Takvim
        </Link>

        <p className="px-3 text-[11px] font-bold text-emerald-400/60 uppercase tracking-widest mt-8 mb-3">Sistem Yönetimi</p>
        
        {isAdmin && (
          <Link href="/personel-listesi" className={getButtonClass('/personel-listesi')}>
            Tüm Personel Listesi
          </Link>
        )}
        
        {/* Raporlama modal (pop-up) açtığı için o buton olarak kalıyor */}
        {onReportClick ? (
          <button onClick={onReportClick} className={getButtonClass('/raporlama')}>
            Raporlama
          </button>
        ) : (
          <Link href="/raporlama" className={getButtonClass('/raporlama')}>
            Raporlama
          </Link>
        )}
        
        
      </nav>
    </aside>
  );
}
   