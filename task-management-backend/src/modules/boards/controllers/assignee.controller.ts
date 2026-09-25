import { Response } from 'express';
import { sql } from '../../../config/db';
import { AuthRequest } from '../../../middlewares/auth.middleware';

import { notifyTaskWatchers } from '../../../utils/notification';
// göreve personel atar, eğer personel zaten atanmışsa görevden çıkarır (toggle)
export const toggleTaskAssignee = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { user_id } = req.body;
    
    const request = new sql.Request();
    request.input('taskId', sql.Int, parseInt(taskId));
    request.input('userId', sql.Int, parseInt(user_id));

    // personel zaten bu görevde var mı kontrolü
    const check = await request.query(`SELECT * FROM TASK_ASSIGNMENTS WHERE task_id = @taskId AND user_id = @userId`);
    
   if (check.recordset.length > 0) {
      // zaten varsa görevden çıkarıyoruz
      await request.query(`DELETE FROM TASK_ASSIGNMENTS WHERE task_id = @taskId AND user_id = @userId`);
      
      // Çıkarılan kişiye direkt bildirim at (Çünkü notifyTaskWatchers onu artık bulamaz)
      const notifReq = new sql.Request();
      notifReq.input('targetUserId', sql.Int, parseInt(user_id));
      notifReq.input('taskId', sql.Int, parseInt(taskId));
      notifReq.input('msg', sql.NVarChar, 'Bir görevden çıkarıldınız.');
      
      await notifReq.query(`
        INSERT INTO NOTIFICATIONS (user_id, related_task_id, message, is_read, created_at)
        VALUES (@targetUserId, @taskId, @msg, 0, GETDATE())
      `);

      return res.json({ message: 'personel çıkarıldı.' });
    } else {
      // göreve yeni personel eklenirken aktif mi bakıyoruz
      const userCheck = new sql.Request();
      userCheck.input('userId', sql.Int, parseInt(user_id));
      const userResult = await userCheck.query(`
        SELECT status, is_deleted FROM USERS WHERE id = @userId
      `);

      if (userResult.recordset.length === 0 || userResult.recordset[0].is_deleted === 1 || userResult.recordset[0].status !== 'Active') {
        return res.status(400).json({ error: 'pasif veya silinmiş bir kullanıcıya yeni görev atayamazsınız!' });
      }

      // personeli tabloya ekliyoruz
      await request.query(`INSERT INTO TASK_ASSIGNMENTS (task_id, user_id) VALUES (@taskId, @userId)`);

      // bildirim gönderme (işlemi yapan kişi dışında atanan kişiye bildirim düşer)
      // veri tabanından ya da token'dan güvenli alıyoruz
const actorId = req.user?.userId || 1;
const actorName = 'bir yönetici'; // veya token içinde varsa fullName
      
const notifReq = new sql.Request();
notifReq.input('targetUserId', sql.Int, parseInt(user_id));
notifReq.input('taskId', sql.Int, parseInt(taskId));
notifReq.input('msg', sql.NVarChar, `yeni bir göreve atandınız.`);
      
await notifReq.query(`
  INSERT INTO NOTIFICATIONS (user_id, related_task_id, message, is_read, created_at) 
  VALUES (@targetUserId, @taskId, @msg, 0, GETDATE())
`);

      return res.json({ message: 'personel eklendi.' });
    }
  } catch (err) {
    console.error("personel güncelleme hatası:", err);
    return res.status(500).json({ error: 'personel güncellenemedi.' });
  }
}; 