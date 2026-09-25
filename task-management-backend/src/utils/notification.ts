import sql from 'mssql/msnodesqlv8';

export async function notifyTaskWatchers(
  taskId: number,
  actorId: number,
  type: string,
  message: string
) {
  try {
    const request = new sql.Request();
    request.input('taskId', sql.Int, taskId);
    request.input('actorId', sql.Int, actorId);
    request.input('type', sql.VarChar, type);
    request.input('message', sql.VarChar, message);

    // Tablondaki gerçek sütun adlarına (related_task_id) göre uyarlandı
    await request.query(`
      INSERT INTO NOTIFICATIONS (user_id, related_task_id, message, is_read, created_at)
      SELECT ta.user_id, @taskId, @message, 0, GETDATE()
      FROM TASK_ASSIGNMENTS ta
      WHERE ta.task_id = @taskId
        AND ta.user_id != @actorId
    `);
  } catch (err) {
    console.error("bildirim oluşturulamadı:", err);
  }
}