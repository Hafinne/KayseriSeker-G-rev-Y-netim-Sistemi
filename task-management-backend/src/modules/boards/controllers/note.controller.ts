import { Request, Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { sql } from '../../../config/db';

// ÖNEMLİ: notifyTaskWatchers fonksiyonunu import etmeyi unutma! 
// (Kendi dosya yoluna göre '../' kısımlarını ayarlarsın)
import { notifyTaskWatchers } from  '../../../utils/notification'; 

// Görev kartının içerisine yeni bir not/yorum ekler
export const addTaskNote = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = Number(req.params.taskId);
    const { note_text } = req.body;
    const userId = req.user!.userId;

    if (!note_text) return res.status(400).json({ error: 'Not metni boş olamaz.' });

    const request = new sql.Request();
    request.input('taskId', sql.Int, taskId);
    request.input('userId', sql.Int, userId);
    request.input('noteText', sql.NVarChar, note_text);

    // 1. Notu normal bir şekilde veritabanına ekliyoruz
    await request.query(`
      INSERT INTO NOTES (task_id, user_id, note_text, created_at, is_deleted)
      VALUES (@taskId, @userId, @noteText, GETDATE(), 0)
    `);

    // -------------------------------------------------------------
    // 2. YENİ EKLENEN KISIM: BİLDİRİM GÖNDERME
    // -------------------------------------------------------------
    
    // İşlemi yapan kişinin adını buluyoruz ki bildirimde ismi yazsın
    const userRes = await request.query(`SELECT full_name FROM USERS WHERE id = @userId`);
    const fullName = userRes.recordset[0]?.full_name || 'Bir kullanıcı';

    // Uzun notların sadece ilk 20 harfini bildirimde gösterelim
    const shortNote = note_text.length > 20 ? note_text.substring(0, 20) + '...' : note_text;

    // Bildirim fonksiyonunu tetikliyoruz!
    await notifyTaskWatchers(
      taskId,
      userId,
      'NOTE_ADDED', // Bildirimin tipi
      `${fullName} bir göreve not yazdı: "${shortNote}"` // Zil ikonunda görünecek asıl mesaj
    );
    // -------------------------------------------------------------

    return res.status(201).json({ message: 'Not başarıyla eklendi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Not eklenirken hata oluştu.' });
  }
};

// İlgili notu silinmiş olarak işaretler
export const deleteTaskNote = async (req: Request, res: Response) => {
  // ... (Burası aynı kalabilir, not silindiğinde bildirim gitmesine gerek yoksa ellemeyebilirsin)
};