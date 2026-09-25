import { Request, Response } from 'express'; // express tipi
import bcrypt from 'bcrypt'; // sifre hashleme 
import jwt from 'jsonwebtoken'; // token olusturma 
import { sql } from '../../config/db'; 

//yeni kullanici kayit islemi (sadece yoneticiler kullanir)
export const register = async (req: Request, res: Response) => { // req: gelen istek, res: gönderilecek cevap
  try { 
        const { username, full_name, password, role_id } = req.body; // gelen veriler

    if (!username || !full_name || !password || !role_id) { // eksik alan kontrolü
      return res.status(400).json({ error: 'Tüm alanların doldurulması zorunludur.' }); 
    }

    // Kullanıcı ad kontrolü pk
    const existingCheck = new sql.Request(); // yeni sorgu 
    existingCheck.input('username', sql.NVarChar, username); 
    const existing = await existingCheck.query( 
      'SELECT id FROM USERS WHERE username = @username AND is_deleted = 0' // silinmemis kullanicilarda ara
    );

    // existing.recordset sorgu sonucunda  kayıtlar
    if (existing.recordset.length > 0) { // kayıt varsa
      return res.status(409).json({ error: 'Bu kullanıcı adı zaten sistemde kayıtlıdır.' }); 
    }

    // şifreyi güvenli şekilde hashliyoruz, 10 = hashleme seviyesi
    const password_hash = await bcrypt.hash(password, 10);

    // yeni kullanıcıyı dbye ekliyoruz
    const insertRequest = new sql.Request(); // yeni sorgu oluşturuyoruz
    insertRequest.input('username', sql.NVarChar, username); // kullanıcu 
    insertRequest.input('full_name', sql.NVarChar, full_name); // tam ad
    insertRequest.input('password_hash', sql.NVarChar, password_hash); // hashlenmis sifre
    insertRequest.input('role_id', sql.Int, role_id); // rol id

   const result = await insertRequest.query(`
INSERT INTO USERS (username, full_name, password_hash, role_id, must_change_password, status, is_deleted)
OUTPUT INSERTED.id
VALUES (@username, @full_name, @password_hash, @role_id, 1, 'Active', 0)
    `);
    // must_change_password = 1 (kullanıcı ilk girişte şifre degiştirmeli)
    // status = 'Active' (aktif)
    // is_deleted = 0 (silinmemiş)

    res.status(201).json({ 
      message: 'Kullanıcı başarıyla oluşturuldu.', 
      userId: result.recordset[0].id, // yeni kullanıcıların id si
    });
  } catch (err) {
    console.error(err); //  konsola yaz
    res.status(500).json({ error: 'Sunucu tarafında bir hata meydana geldi.' }); 
  }
};

// login 
export const login = async (req: Request, res: Response) => { // req: gelen istek, res: gönderilecek cevap
  try { // hata yakalama baslangici
    const { username, password } = req.body; // kullanıcı adı ve şifre

    if (!username || !password) { // eksik alan kontrolü
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' }); 
    }

    const request = new sql.Request(); // yeni sorgu olustur
    request.input('username', sql.NVarChar, username); 

   const result = await request.query(`
      SELECT u.id, u.username, u.full_name, u.password_hash, u.status, u.is_deleted, u.must_change_password,
             r.role_name, r.hierarchy_level
      FROM USERS u
      JOIN ROLES r ON u.role_id = r.id
      WHERE u.username = @username
    `); // kullanıcıyı rolleriyle birlikte getir

    if (result.recordset.length === 0) { // kullanıcı byooksa
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalıdır.' }); 
    }

    const user = result.recordset[0]; // ilk kaydı al zate bi tane oalcak

    //silinme ve aktiflik durumunu kontrol et
    if (user.is_deleted || user.status !== 'Active') { // hesap silinmiş veya pasifse
      return res.status(403).json({ error: 'Hesabınız aktif durumda değildir.' });
    }

    // şifre doğrulaması
    const passwordMatch = await bcrypt.compare(password, user.password_hash); // girilen şifre ile hash karşılaştır
    if (!passwordMatch) {//yanlışsa
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalıdır.' }); 
    }

    // Dogrulama başarili ise  JWT uretiyoruz
    const token = jwt.sign(
      { // token içine gömülecek bilgiler
        userId: user.id, 
        role: user.role_name, 
        hierarchyLevel: user.hierarchy_level, // hiyerarşi seviyesi
      },
      process.env.JWT_SECRET as string, 
      { expiresIn: '24h' } // token 24 saat gecerli
    );

   res.json({ 
      token, 
      mustChangePassword: !!user.must_change_password, 
      role: user.role_name,
      fullName: user.full_name,   // Frontend artık ad soyadı bilecek
      username: user.username,    // Frontend kullanıcı adını bilecek
      userId: user.id             // Frontend ID'yi bilecek
    });
  } catch (err) { 
    console.error(err); 
    res.status(500).json({ error: 'Sunucu tarafında bir hata meydana geldi.' }); 
  }
};

// changePassword = ilk giriş veya şifre değiştirme işlemi
export const changePassword = async (req: Request, res: Response) => { // req: gelen istek, res: gonderilecek cevap
  try { // hata yakalama baslangici
    const userId = (req as any).user?.userId; // token icindeki kullanici id si
    const { oldPassword, newPassword } = req.body; // eski ve yeni sifre

    if (!userId) { // kullanici id yoksa
      return res.status(401).json({ error: 'Yetkilendirme doğrulanamadı.' });
    }

    if (!oldPassword || !newPassword || newPassword.length < 6) { // eksik veya kisa sifre kontrolu
      return res.status(400).json({ error: 'Tüm alanları eksiksiz doldurun ve yeni şifrenin en az 6 karakter olmasına dikkat edin.' }); // 400 hatasi gonder
    }

    // Kullanıcının mevcut şifre hash ini dbden cekiyoruz
    const userRequest = new sql.Request();
    userRequest.input('userId', sql.Int, userId); // parametreyi atiyoruz
    const userResult = await userRequest.query('SELECT password_hash FROM USERS WHERE id = @userId'); // sifre hash ini getir

    if (userResult.recordset.length === 0) { // kullanıcı bulunmadıysa
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' }); 
    }

    const dbPasswordHash = userResult.recordset[0].password_hash; // db hash i aliyoruz

    // Girilen eski sifre dogru mu kontrol
    const isMatch = await bcrypt.compare(oldPassword, dbPasswordHash); // eski sifreyi doğrula
    if (!isMatch) { //  yanlişsa
      return res.status(400).json({ error: 'Mevcut şifreniz hatalı.' }); 
    }

    // Yeni şifreyi hashleyip update et
    const newPasswordHash = await bcrypt.hash(newPassword, 10); // hashle

    const updateRequest = new sql.Request(); 
    updateRequest.input('userId', sql.Int, userId); 
    updateRequest.input('password_hash', sql.NVarChar, newPasswordHash); 

    await updateRequest.query(`
      UPDATE USERS 
      SET password_hash = @password_hash, must_change_password = 0 
      WHERE id = @userId
    `); // sifreyi guncelle ve zorunlu degistirmeyi kapat

    res.json({ message: 'Şifreniz başarıyla değiştirildi.' }); 
  } catch (err) { 
    console.error('şifre değiştirme hatası:', err); 
    res.status(500).json({ error: 'Sunucu tarafında bir hata meydana geldi.' });
  }
};

//  tum personelleri listele
export const getUsers = async (req: Request, res: Response) => { // req: gelen istek, res: gonderilecek cevap
  try { 
    const request = new sql.Request(); 
    
    const result = await request.query(`
      SELECT u.id, u.username, u.full_name, u.status, u.must_change_password, r.role_name
      FROM USERS u
      JOIN ROLES r ON u.role_id = r.id
      WHERE u.is_deleted = 0
    `); // silinmemis kullanicilari rolleriyle birlikte listele

    res.json(result.recordset); // sonuçlari json olarak gönder
  } catch (err) { // 
    console.error('personelleri getirme hatası:', err); 
    res.status(500).json({ error: 'Sunucu tarafinda bir hata meydana geldi.' });
  }
};

// toggleUserStatus = kullanici durumu (aktif/pasif yap)
export const toggleUserStatus = async (req: Request, res: Response) => { // req: gelen istek, res: gönderilecek cevap
  try { 
    const userId = req.params.id; // url den kullanıcıid sini aliyoruz

    // önce kullanicinin mevcut durumuna bakz
    const checkReq = new sql.Request();
    checkReq.input('id', sql.Int, userId); 
    const userResult = await checkReq.query('SELECT status FROM USERS WHERE id = @id'); 

    if (userResult.recordset.length === 0) { 
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' }); 
    }

    const currentStatus = userResult.recordset[0].status; // mevcut durumu 
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'; // durumu tersine çevir

    //update
    const updateReq = new sql.Request(); 
    updateReq.input('id', sql.Int, userId); 
    updateReq.input('status', sql.NVarChar, newStatus); 
    await updateReq.query('UPDATE USERS SET status = @status WHERE id = @id'); 

    res.json({ message: `Kullanıcı durumu ${newStatus} olarak güncellendi.`, status: newStatus }); 
  } catch (err) { // hata olursa
    console.error('durum değiştirme hatası:', err); 
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};


// Kullanıcıyı tamamen veya soft-delete (silinmiş işaretleme) yapma
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const request = new sql.Request();
    request.input('id', sql.Int, userId);

    // Güvenlik: Kullanıcıyı tamamen silmek yerine is_deleted = 1 yapıyoruz (Veri bütünlüğü için en iyisi)
    await request.query('UPDATE USERS SET is_deleted = 1, status = \'Inactive\' WHERE id = @id');

    res.json({ message: 'Kullanıcı sistemden başarıyla kaldırıldı.' });
  } catch (err) {
    console.error('Kullanıcı silme hatası:', err);
    res.status(500).json({ error: 'Kullanıcı silinirken sunucu hatası oluştu.' });
  }
};