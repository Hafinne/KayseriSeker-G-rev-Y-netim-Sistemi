import sql from 'mssql/msnodesqlv8';
import { Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const request = new sql.Request();
    const userRole = req.user?.role?.toUpperCase() || '';
    const isAdmin = userRole.includes('YÖNETİCİ') || userRole.includes('ADMIN');
    const userId = req.user?.userId;

    let query = `
      SELECT TOP 50 l.id, l.changed_at, l.table_name, l.record_id, l.action_type, l.old_data, l.new_data, u.full_name
      FROM AUDIT_LOGS l
      LEFT JOIN USERS u ON l.changed_by = u.id
      WHERE l.table_name IN ('TASKS', 'TASK_ASSIGNMENTS', 'TASK_NOTES')
    `;

    if (!isAdmin && userId) {
      request.input('userId', sql.Int, userId);
      query += ` AND (l.changed_by = @userId OR l.new_data LIKE '%"user_id":' + CAST(@userId AS VARCHAR) + '%')`;
    }

    query += ` ORDER BY l.changed_at DESC`;

    const result = await request.query(query);
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: 'loglar getirilemedi.' });
  }
};