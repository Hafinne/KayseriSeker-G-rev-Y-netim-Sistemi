import cors from 'cors';// cors = farkli alan adlarindan gelen isteklere izin verir cors olmadan fr bacende istek atamaz
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';// dotenv  .env dosyasindaki gizli bilgileri oku
import { connectDB } from './config/db'; 
//kullanıcı rotaları sisteme dahil edilir
import userRoutes from './modules/users/user.routes'; 
import boardRoutes from './modules/boards/board.routes';
// gizli ortam değişkenleri sisteme dahil edilir
dotenv.config();

// express sunucu uygulaması başlatılır
const app = express();

// farklı alan adlarından gelecek isteklere erişim izni verilir
app.use(cors());

// gelen JSON formatındaki verileri işlemek için middleware eklenir
app.use(express.json());

// api yönlendirmeleri tanımlanır
app.use('/api/users', userRoutes);

app.use('/api/boards', boardRoutes);
//sistemin çalıştığını test etmek için temel bir ana rota oluşturulur
app.get('/', (req: Request, res: Response) => {
    res.send("Modüler mimariye sahip TypeScript sunucusu başarıyla çalışmaktadır");
});

//sunucunun çalışacağı port numarası
const PORT = process.env.PORT || 5000;

//sunucu belirlenen port üzerinden yayına alınır
app.listen(PORT, async () => {
    console.log(`Sunucu ${PORT} portu üzerinde aktif hale gelmiştir`);
    await connectDB();
});