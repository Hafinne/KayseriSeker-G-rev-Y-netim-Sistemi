import { Router, Response } from 'express'; // Router = api uç noktalarini gruplamak icin kullanılır
// user.controller dosyasından changePassword'ü de içeri aktarıyoruz
import { register, login, changePassword, getUsers, toggleUserStatus, deleteUser,  } from './user.controller';// user.controller dosyasindan register ve login fonk aliyoruz
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';

// user.controller dosyasından changePassword'ü de içeri aktarıyoruz

//yeni  router nesnesi olustur api uç noktalarini gruplayabiliriz
// örn: /api/users/register /api/users/login gibi
const router = Router();
router.put('/:id/status', authMiddleware, toggleUserStatus);
// Kullanıcı modülüne ait açık uç noktalar tanımlanır
router.post('/register', register);
router.post('/login', login);
 //GET istegi icin uç nokta tanimla
// /me = bu uç noktaya gelen istekler
// Token doğrulamasını testiçin korumalı uç nokta oluşturulur
router.put('/change-password', authMiddleware, changePassword);
router.get('/', authMiddleware, getUsers);
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ message: 'Token başarıyla doğrulandı.', user: req.user });
});
router.delete('/:id', authMiddleware, deleteUser);
export default router;//bu router i disari aç başka dosyalarda import edilebilir





