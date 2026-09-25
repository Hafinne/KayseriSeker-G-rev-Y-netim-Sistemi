'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SifreBelirlePage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState(''); // Eski şifre state'i
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler birbiriyle uyuşmuyor.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch('http://localhost:5000/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword }) // Eski şifreyi de yolluyoruz
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Şifre değiştirilemedi.');
      }

      alert('Şifreniz başarıyla değiştirildi! Lütfen yeni şifrenizle tekrar giriş yapın.');
      
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      router.push('/login');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Şifre Belirleme</h2>
        <p className="text-sm text-gray-600 mb-6">
          Güvenliğiniz için mevcut şifrenizi doğrulayıp yeni şifrenizi belirleyin.
        </p>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* MEVCUT ŞİFRE */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Mevcut Şifre</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black"
              placeholder="••••••••"
            />
          </div>

          {/* YENİ ŞİFRE */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Yeni Şifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black"
              placeholder="••••••••"
            />
          </div>

          {/* YENİ ŞİFRE TEKRAR */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg transition duration-200"
          >
            {loading ? 'Kaydediliyor...' : 'Şifreyi Kaydet ve Devam Et'}
          </button>
        </form>
      </div>
    </div>
  );
}