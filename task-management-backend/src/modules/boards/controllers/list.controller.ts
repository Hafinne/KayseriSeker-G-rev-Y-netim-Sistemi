import { Request, Response } from 'express';
import { sql } from '../../../config/db';
import { AuthRequest } from '../../../middlewares/auth.middleware';

// Pano içerisine yeni bir liste (sütun) ekler
export const createList = async (req: Request, res: Response) => {
  try {
    const boardId = req.params.id;
    const { list_name } = req.body;
    
    if (!list_name) return res.status(400).json({ error: 'Liste adı zorunludur.' });

    const request = new sql.Request();
    request.input('boardId', sql.Int, boardId);
    request.input('listName', sql.NVarChar, list_name);

    await request.query(`
      INSERT INTO LISTS (board_id, list_name, list_order, is_done_list, is_deleted, status, created_at)
      VALUES (@boardId, @listName, 0, 0, 0, 'Active', GETDATE())
    `);
    return res.status(201).json({ message: 'Liste oluşturuldu.' });
  } catch (err) {
    return res.status(500).json({ error: 'Liste oluşturulamadı.' });
  }
};

// Belirtilen listeyi (sütunu) silinmiş olarak işaretler (Soft Delete)
export const deleteList = async (req: Request, res: Response) => {
  try {
    const listId = req.params.listId as string;
    const request = new sql.Request();
    
    request.input('listId', sql.Int, parseInt(listId));
    await request.query(`UPDATE LISTS SET is_deleted = 1 WHERE id = @listId`);
    
    return res.json({ message: 'Liste silindi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Liste silinemedi.' });
  }
};
export const updateListName = async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.listId);
    const { list_name } = req.body;

    if (!list_name) {
      return res.status(400).json({ error: 'liste adı boş olamaz.' });
    }

    const request = new sql.Request();
    request.input('listId', sql.Int, listId);
    request.input('listName', sql.NVarChar, list_name);

    await request.query(`
      UPDATE LISTS 
      SET list_name = @listName 
      WHERE id = @listId
    `);

    return res.json({ message: 'liste adı başarıyla güncellendi.' });
  } catch (err) {
    console.error("liste adı güncellenemedi:", err);
    return res.status(500).json({ error: 'liste adı güncellenirken hata oluştu.' });
  }
};

export const updateListOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { listIds } = req.body; // Sıralanmış liste ID'leri dizisi gelir örn: [3, 1, 2]

    if (!Array.isArray(listIds)) {
      return res.status(400).json({ error: 'geçersiz liste formatı.' });
    }

    // Gelen dizideki sıraya göre her bir listenin order değerini güncelliyoruz
    for (let i = 0; i < listIds.length; i++) {
      const request = new sql.Request();
      request.input('order', sql.Int, i);
      request.input('listId', sql.Int, listIds[i]);
      await request.query(`UPDATE LISTS SET list_order = @order WHERE id = @listId`);
    }

    return res.json({ message: 'liste sıralaması güncellendi.' });
  } catch (err) {
    console.error("liste sıralama hatası:", err);
    return res.status(500).json({ error: 'liste sıralaması güncellenemedi.' });
  }
};