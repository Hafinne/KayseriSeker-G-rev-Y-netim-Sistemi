import { Request, Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { sql } from '../../../config/db';
import { logAction } from '../../../utils/logger';

// Kullanıcının sahibi olduğu veya üyesi olduğu tüm board'ları (panoları) getirir
export const listBoards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = (req.user!.role || '').toUpperCase();
    
    // Kullanıcının Yönetici (Admin) olup olmadığını kontrol ediyoruz
    const isAdmin = role.includes('YÖNETİCİ') || role.includes('ADMIN');

    const request = new sql.Request();
    request.input('userId', sql.Int, userId);

    let query = `
      SELECT DISTINCT b.id, b.board_name, b.description, b.owner_id, b.created_at, b.status
      FROM BOARDS b
      WHERE b.is_deleted = 0 AND b.status = 'Active'
    `;

    // Eğer kullanıcı ADMIN değilse, panoları görebilmesi için şu şartlardan birini sağlamalı:
    // 1. Panonun sahibi kendisidir (owner_id)
    // 2. Panoya üye olarak eklenmiştir (BOARD_MEMBERS)
    // 3. Panonun içindeki bir göreve atanmıştır (TASK_ASSIGNMENTS)
    if (!isAdmin) {
      query += `
        AND (
          b.owner_id = @userId 
          OR EXISTS (SELECT 1 FROM BOARD_MEMBERS bm WHERE bm.board_id = b.id AND bm.user_id = @userId)
          OR EXISTS (
              SELECT 1 FROM LISTS l 
              JOIN TASKS t ON t.list_id = l.id 
              JOIN TASK_ASSIGNMENTS ta ON ta.task_id = t.id 
              WHERE l.board_id = b.id AND ta.user_id = @userId
          )
        )
      `;
    }

    query += ` ORDER BY b.created_at DESC`;

    const result = await request.query(query);
    return res.json(result.recordset);
  } catch (err) {
    console.error("Pano getirme hatası:", err);
    return res.status(500).json({ error: 'Panolar listelenirken hata oluştu.' });
  }
};


// Yeni bir pano oluşturur
export const createBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { board_name, description } = req.body;
    const userId = req.user!.userId;
    
    if (!board_name) return res.status(400).json({ error: 'Pano adı zorunludur.' });

    const request = new sql.Request();
    request.input('boardName', sql.NVarChar, board_name);
    request.input('description', sql.NVarChar, description || '');
    request.input('ownerId', sql.Int, userId);

    await request.query(`
      INSERT INTO BOARDS (board_name, description, owner_id, status, is_deleted, created_at)
      VALUES (@boardName, @description, @ownerId, 'Active', 0, GETDATE())
    `);
    return res.status(201).json({ message: 'Pano başarıyla oluşturuldu.' });
  } catch (err) {
    return res.status(500).json({ error: 'Pano oluşturulamadı.' });
  }
};

// Belirli bir panonun içindeki listeleri, görevleri, personelleri ve notları tek seferde getirir
export const getBoardDetails = async (req: Request, res: Response) => {
  try {
    const boardId = req.params.id;
    const request = new sql.Request();
    request.input('boardId', sql.Int, boardId);

    const boardQuery = await request.query(`SELECT board_name FROM BOARDS WHERE id = @boardId`);
    const boardName = boardQuery.recordset.length > 0 ? boardQuery.recordset[0].board_name : 'Bilinmeyen Pano';

    const listsQuery = await request.query(`
      SELECT id, list_name, is_done_list, list_order 
      FROM LISTS WHERE board_id = @boardId AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY list_order ASC
    `);

const tasksQuery = await request.query(`
      SELECT t.id, t.list_id, t.title, t.description, t.priority, t.status, t.task_order, t.created_at, t.due_date
      FROM TASKS t
      INNER JOIN LISTS l ON t.list_id = l.id
      WHERE l.board_id = @boardId AND (t.is_deleted = 0 OR t.is_deleted IS NULL)
      ORDER BY t.task_order ASC
    `);

    const assigneesQuery = await request.query(`
      SELECT ta.task_id, u.id as user_id, u.full_name
      FROM TASK_ASSIGNMENTS ta
      INNER JOIN TASKS t ON ta.task_id = t.id
      INNER JOIN LISTS l ON t.list_id = l.id
      INNER JOIN USERS u ON ta.user_id = u.id 
      WHERE l.board_id = @boardId AND (t.is_deleted = 0 OR t.is_deleted IS NULL)
    `);

    const notesQuery = await request.query(`
      SELECT n.id, n.task_id, n.user_id, n.note_text, n.created_at, u.full_name
      FROM NOTES n
      INNER JOIN TASKS t ON n.task_id = t.id
      INNER JOIN LISTS l ON t.list_id = l.id
      INNER JOIN USERS u ON n.user_id = u.id
      WHERE l.board_id = @boardId AND (n.is_deleted = 0 OR n.is_deleted IS NULL)
      ORDER BY n.created_at ASC
    `);

    return res.json({
      boardName,
      lists: listsQuery.recordset,
      tasks: tasksQuery.recordset,
      assignees: assigneesQuery.recordset,
      notes: notesQuery.recordset
    });
  } catch (err) {
    return res.status(500).json({ error: 'Detaylar yüklenemedi.' });
  }
};





  
export const updateTaskDueDate = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { due_date } = req.body;
    
    const request = new sql.Request();
    request.input('taskId', sql.Int, parseInt(taskId));
    
    if (due_date) {
      // sql.Date yerine sql.VarChar kullanıyoruz, tarihe çevirmeyi
      // SQL Server'ın kendisine CONVERT ile yaptırıyoruz — msnodesqlv8
      // sürücüsü sql.Date tipini düzgün desteklemiyor
      request.input('dueDate', sql.VarChar, due_date);
      await request.query(`UPDATE TASKS SET due_date = CONVERT(DATE, @dueDate, 120) WHERE id = @taskId`);
    } else {
      await request.query(`UPDATE TASKS SET due_date = NULL WHERE id = @taskId`);
    }
    await logAction(null, 'TASKS', parseInt(taskId), 'UPDATE', null, { due_date });
    return res.json({ message: 'Tarih başarıyla güncellendi.' });
  } catch (err) {
    console.error("TARİH GÜNCELLEME HATASI DETAYI:", err);
    return res.status(500).json({ error: 'Tarih güncellenemedi.' });
  }
};

// Panoyu silinmiş olarak işaretler (Soft Delete)
export const deleteBoard = async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.id as string;
    const userId = req.user!.userId; 
    
    const request = new sql.Request();
    request.input('boardId', sql.Int, parseInt(boardId));

    //  panonun adını veritabanından öğren
    const boardQuery = await request.query(`SELECT board_name FROM BOARDS WHERE id = @boardId`);
    const boardName = boardQuery.recordset.length > 0 ? boardQuery.recordset[0].board_name : 'Bilinmeyen Pano';

    // sil
    await request.query(`UPDATE BOARDS SET is_deleted = 1 WHERE id = @boardId`);
    
    // LogAction içine "pano_adi" parametresini de ekliyoruz!
    await logAction(userId, 'BOARDS', parseInt(boardId), 'DELETE', null, { islem: 'Silme (Çöp Kutusu)', pano_adi: boardName });
    
    return res.json({ message: 'Pano başarıyla silindi.' });
  } catch (err) {
    console.error("Silme hatası:", err);
    return res.status(500).json({ error: 'Pano silinemedi.' });
  }
};

// Panoyu arşivler (Status günceller)
export const archiveBoard = async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.id as string;
    const userId = req.user!.userId; 
    
    const request = new sql.Request();
    request.input('boardId', sql.Int, parseInt(boardId));

    // Arşivlemeden önce panonun adını öğreniyoruz
    const boardQuery = await request.query(`SELECT board_name FROM BOARDS WHERE id = @boardId`);
    const boardName = boardQuery.recordset.length > 0 ? boardQuery.recordset[0].board_name : 'Bilinmeyen Pano';

    //Panoyu arşivliyoruz
    await request.query(`UPDATE BOARDS SET status = 'Archived' WHERE id = @boardId`);
    
    //LogAction içine pano adını ve durumu Türkçe yazıyoruz!
    await logAction(userId, 'BOARDS', parseInt(boardId), 'ARCHIVE', null, { durum: 'Arşivlendi', pano_adi: boardName })
    
    return res.json({ message: 'Pano arşivlendi.' });
  } catch (err) {
    console.error("Arşivleme hatası:", err);
    return res.status(500).json({ error: 'Pano arşivlenemedi.' });
  }
};

// Panoyu Arşivden Çıkarır (Aktif hale getirir)
export const unarchiveBoard = async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.id as string;
    const userId = req.user!.userId; 
    
    const request = new sql.Request();
    request.input('boardId', sql.Int, parseInt(boardId));

    // Çıkarmadan önce panonun adı
    const boardQuery = await request.query(`SELECT board_name FROM BOARDS WHERE id = @boardId`);
    const boardName = boardQuery.recordset.length > 0 ? boardQuery.recordset[0].board_name : 'Bilinmeyen Pano';

    //  Panoyu aktif et
    await request.query(`UPDATE BOARDS SET status = 'Active' WHERE id = @boardId`);
    
    //  LogAction'a ekliyoruz
    await logAction(userId, 'BOARDS', parseInt(boardId), 'UNARCHIVE', null, { durum: 'Aktif Edildi (Arşivden Çıkarıldı)', pano_adi: boardName })
    
    return res.json({ message: 'Pano arşivden çıkarıldı.' });
  } catch (err) {
    console.error("Arşivden çıkarma hatası:", err);
    return res.status(500).json({ error: 'Pano arşivden çıkarılamadı.' });
  }
};
// BİLDİRİMLERİ GETİR
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const request = new sql.Request();
    request.input('userId', sql.Int, req.user?.userId);
    
    // YENİ SQL SORGUSU: TASKS ve LISTS tablolarını bağlayarak board_id'yi de çekiyoruz
    const result = await request.query(`
      SELECT TOP 30 
        n.id, 
        n.related_task_id AS task_id, 
        n.message, 
        n.is_read, 
        n.created_at,
        l.board_id
      FROM NOTIFICATIONS n
      LEFT JOIN TASKS t ON n.related_task_id = t.id
      LEFT JOIN LISTS l ON t.list_id = l.id
      WHERE n.user_id = @userId
      ORDER BY n.created_at DESC
    `);
    
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: 'bildirimler getirilemedi.' });
  }
};

// BİLDİRİMLERİ OKUNDU OLARAK İŞARETLE 
export const markNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const request = new sql.Request();
    request.input('userId', sql.Int, userId);
    
    //  Kullanıcının okunmamış (0) olan tüm bildirimlerini okundu (1) yap
    await request.query(`
      UPDATE NOTIFICATIONS 
      SET is_read = 1 
      WHERE user_id = @userId AND is_read = 0
    `);

    // Okunmuş (is_read = 1) ve 3 günden eski olanları SİL
    await request.query(`
      DELETE FROM NOTIFICATIONS 
      WHERE user_id = @userId 
        AND is_read = 1 
        AND created_at < DATEADD(day, -3, GETDATE())
    `);

    return res.json({ message: 'Bildirimler okundu işaretlendi ve eskiler temizlendi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Bildirimler güncellenemedi.' });
  }
};