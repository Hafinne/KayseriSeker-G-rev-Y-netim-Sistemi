import sql from 'mssql/msnodesqlv8';

export const logAction = async (
  userId: number | null, 
  tableName: string, 
  recordId: number, 
  actionType: 'INSERT' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'UNARCHIVE', 
  oldData: any = null, 
  newData: any = null
) => {
  try {
    const request = new sql.Request();
    request.input('changedBy', sql.Int, userId || 1);
    request.input('tableName', sql.VarChar, tableName);
    request.input('recordId', sql.Int, recordId);
    request.input('actionType', sql.VarChar, actionType);
request.input('oldData', sql.VarChar, oldData ? JSON.stringify(oldData) : ''); //Eski veriyi JSON metnine cevir, yoksa bos gonder
request.input('newData', sql.VarChar, newData ? JSON.stringify(newData) : '');

    await request.query(`
      INSERT INTO AUDIT_LOGS (changed_by, changed_at, table_name, record_id, action_type, old_data, new_data)
      VALUES (@changedBy, GETDATE(), @tableName, @recordId, @actionType, @oldData, @newData)
    `);
  } catch (err) {
    console.error("Log kaydedilemedi:", err);
  }
};