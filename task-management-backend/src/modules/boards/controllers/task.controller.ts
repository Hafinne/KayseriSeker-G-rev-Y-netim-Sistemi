import { Request, Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { sql } from '../../../config/db';
import { logAction } from '../../../utils/logger';
import { notifyTaskWatchers } from '../../../utils/notification';
// İlgili liste içerisine yeni bir görev kartı oluşturur
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { list_id, title, description, priority, assigned_users } = req.body;
    const userId = req.user!.userId;

    if (!list_id || !title) return res.status(400).json({ error: 'Başlık zorunludur.' });

    const request = new sql.Request();
    request.input('listId', sql.Int, parseInt(list_id));
    request.input('title', sql.NVarChar, title);
    request.input('description', sql.NVarChar(sql.MAX), description || '');
    request.input('priority', sql.NVarChar, priority || 'Normal');
    request.input('createdBy', sql.Int, userId);

    const result = await request.query(`
      INSERT INTO TASKS (list_id, title, description, priority, task_order, created_by, created_at, is_deleted, status)
      OUTPUT INSERTED.id
      VALUES (@listId, @title, @description, @priority, 0, @createdBy, GETDATE(), 0, 'Active')
    `);

    const newTaskId = result.recordset[0].id;

    // Görev oluşturulurken seçilen personeller varsa onları göreve atar
    if (assigned_users && Array.isArray(assigned_users)) {
      for (const uid of assigned_users) {
        const assignReq = new sql.Request();
        assignReq.input('taskId', sql.Int, newTaskId);
        assignReq.input('userId', sql.Int, parseInt(uid));
        await assignReq.query(`INSERT INTO TASK_ASSIGNMENTS (task_id, user_id) VALUES (@taskId, @userId)`);
      }
    }
    await logAction(userId, 'TASKS', newTaskId, 'INSERT', null, { list_id, title, priority });
    const userRes = await request.query(`SELECT full_name FROM USERS WHERE id = ${userId}`);
    const actorName = userRes.recordset[0]?.full_name || 'Bir kullanıcı';
    
    await notifyTaskWatchers(
      newTaskId,
      userId,
      'TASK_CREATED',
      `${actorName}, yeni bir görev oluşturdu: "${title}"`
    );
    return res.status(201).json({ message: 'Görev eklendi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Görev eklenemedi.' });
  }
};

// Görevi silinmiş olarak işaretler (Soft Delete)
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    // req.user tip hatası vermemesi için güvenli kontrol ekledik
    const userId = (req as any).user ? (req as any).user.userId : 1; 

    const request = new sql.Request();
    request.input('taskId', sql.Int, parseInt(taskId));
    await request.query(`UPDATE TASKS SET is_deleted = 1 WHERE id = @taskId`);

    // Log kaydı (parseInt güvenli hale getirildi)
    await logAction(userId, 'TASKS', parseInt(taskId), 'DELETE', null, { action: 'Soft Delete' });

    return res.json({ message: 'Görev başarıyla silindi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Silme işlemi başarısız.' });
  }
};

// Görevi sürükle-bırak ile başka bir listeye taşıma işlemini yapar
export const moveTask = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId;
    const { list_id } = req.body;

    const request = new sql.Request();
    request.input('taskId', sql.Int, taskId);
    request.input('listId', sql.Int, list_id);

    await request.query(`UPDATE TASKS SET list_id = @listId WHERE id = @taskId`);
    const reqAny = req as any;
    const actorId = reqAny.user ? reqAny.user.userId : 1;
    const userRes = await request.query(`SELECT full_name FROM USERS WHERE id = ${actorId}`);
    const actorName = userRes.recordset[0]?.full_name || 'Bir kullanıcı';

    await notifyTaskWatchers(
  Number(taskId),
  actorId,
  'TASK_MOVED',
  `${actorName}, görevin aşamasını güncelledi.`
);
  
    return res.json({ message: 'Görev başarıyla taşındı.' });
  } catch (err) {
    return res.status(500).json({ error: 'Görev taşınamadı.' });
  }
};

// Görevin içerisindeki açıklamayı günceller
export const updateTaskDescription = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { description } = req.body;
    
    const request = new sql.Request();
    request.input('taskId', sql.Int, parseInt(taskId)); 
    request.input('description', sql.NVarChar(sql.MAX), description || '');

    await request.query(`UPDATE TASKS SET description = @description WHERE id = @taskId`);
    return res.json({ message: 'Açıklama başarıyla güncellendi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Açıklama güncellenemedi.' });
  }
};

// Görevin öncelik durumunu (Düşük, Normal, Yüksek vb.) günceller

export const updateTaskPriority = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = Number(req.params.taskId);
    const { priority } = req.body;
    const userRole = req.user?.role?.toUpperCase() || '';
    const isAdmin = userRole.includes('YÖNETİCİ') || userRole.includes('ADMIN');

    // çalışan ise aciliyet değiştirmesini engelliyoruz
    if (!isAdmin) {
      return res.status(403).json({ error: 'görev aciliyetini yalnızca yöneticiler belirleyebilir!' });
    }
    const request = new sql.Request();
    request.input('taskId', sql.Int, taskId);
    request.input('priority', sql.VarChar, priority);

    await request.query(`UPDATE TASKS SET priority = @priority WHERE id = @taskId`);
    return res.json({ message: 'görev önceliği güncellendi.' });
  } catch (err) {
    return res.status(500).json({ error: 'öncelik güncellenemedi.' });
  }
};

// Görevin aktif/pasif veya tamamlandı durumunu değiştirir
export const toggleTaskCompletion = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { status } = req.body;
    
    const request = new sql.Request();
    request.input('taskId', sql.Int, parseInt(taskId));
    request.input('status', sql.NVarChar, status);

    await request.query(`UPDATE TASKS SET status = @status WHERE id = @taskId`);
    const reqAny = req as any;
    const actorId = reqAny.user ? reqAny.user.userId : 1;
    const userRes = await request.query(`SELECT full_name FROM USERS WHERE id = ${actorId}`);
    const actorName = userRes.recordset[0]?.full_name || 'Bir kullanıcı';

    const statusText = status === 'Completed' ? 'Tamamlandı' : 'Aktif';

    await notifyTaskWatchers(
      parseInt(taskId),
      actorId,
      'TASK_STATUS',
      `${actorName}, görevin durumunu "${statusText}" olarak işaretledi.`
    );
    return res.json({ message: 'Görev durumu güncellendi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Durum güncellenemedi.' });
  }
};