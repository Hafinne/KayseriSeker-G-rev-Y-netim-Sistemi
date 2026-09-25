# 🏢 Kayseri Şeker Görev Yönetim Sistemi

Bu proje, kurum içi departmanların iş süreçlerini takip edebilmesi için geliştirilmiş, modüler mimariye sahip full-stack bir görev yönetim sistemidir. Trello benzeri bir pano (board) mantığıyla çalışır.

<img width="1919" height="873" alt="Ekran görüntüsü 2026-09-25 142214" src="https://github.com/user-attachments/assets/5b0acc94-6167-4071-aa10-fb81e2be92e7" />

## 🚀 Kullanılan Teknolojiler

**Frontend (Kullanıcı Arayüzü):**
* Next.js (React)
* TypeScript
* Kurumsal Tema (Tailwind CSS / Custom CSS)

**Backend (Sunucu & API):**
* Node.js & Express.js
* TypeScript
* Modüler Router/Controller Mimarisi

**Veritabanı:**
* Microsoft SQL Server (MSSQL)
* `msnodesqlv8` Sürücüsü

## ⚡ Temel Özellikler

* **Rol Bazlı Yetkilendirme:** JWT tabanlı güvenli giriş (`/login`) ve rol kontrolü.
* **Pano (Board) Yönetimi:** Kullanıcıya özel panolar oluşturma, listeleme ve arşivleme.
* **Dinamik Sütunlar:** Panolar içerisinde "Yapılacaklar", "Devam Edenler" gibi listeler (Lists) oluşturma.
* **Görev Kartları (Tasks):** Görev oluşturma, açıklama ekleme, öncelik belirleme ve personelleri göreve atama.
* **Hareketlilik:** Görevleri farklı listeler (sütunlar) arasında taşıyabilme.
* **Soft Delete:** Veri kaybını önlemek için silinen öğelerin veritabanında "silindi" olarak işaretlenmesi (is_deleted = 1).

## 📂 Backend Modüler Mimari Yapısı

Sistem performansı ve kod okunabilirliği için "God Object" kullanılmamış, tüm sorumluluklar (Separation of Concerns) kendi alanlarına bölünmüştür:
* `board.controller.ts` (Pano işlemleri)
* `list.controller.ts` (Sütun işlemleri)
* `task.controller.ts` (Görev işlemleri)
* `assignee.controller.ts` (Personel atamaları)
* `note.controller.ts` (Görev içi yorumlar)

