import { Request, Response, NextFunction } from 'express'; // express tiplerini al
import jwt from 'jsonwebtoken'; // jwt kutuphanesini al

export interface AuthUser { // token icindeki kullanici bilgisi tipi
  userId: number; // kullanici id si
  role: string; // kullanici rolu
  hierarchyLevel: number; // hiyerarsi seviyesi
}

export interface AuthRequest extends Request { // request e user ekle
  user?: AuthUser; // user opsiyonel
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) { // token kontrolu
  const authHeader = req.headers['authorization']; // token basligini al

  if (!authHeader || !authHeader.startsWith('Bearer ')) { // token yoksa veya yanlis formatta
    return res.status(401).json({ error: 'Erisim reddedildi. Token bulunamadi.' }); // 401 hatasi
  }

  const token = authHeader.split(' ')[1]; // bearer kismini ayir tokeni al

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser; // tokeni dogrula
    req.user = decoded; // kullanici bilgisini request e ekle
    next(); // devam et
  } catch (err) {
    return res.status(401).json({ error: 'Gecersiz veya suresi dolmus token.' }); // gecersiz token
  }
}

export function requireRole(...allowedRoles: string[]) { // rol kontrolu
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) { // rol yetkisi yoksa
      return res.status(403).json({ error: 'Bu islem icin yetkiniz bulunmamaktadir.' }); // 403 hatasi
    }
    next(); // devam et
  };
}

export function requireMinHierarchy(minLevel: number) { // hiyerarsi kontrolu
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.hierarchyLevel < minLevel) { // seviye yetmezse
      return res.status(403).json({ error: 'Bu islem icin hiyerarsik yetkiniz yetersizdir.' }); // 403 hatasi
    }
    next(); // devam et
  };
}