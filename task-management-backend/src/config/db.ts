import sql from 'mssql/msnodesqlv8';

// any tipi  typescript tip kontrolü yapmasın diye
// db baglanmak icin bilgileri tutar
    //ana bilgisayar veya localhost adı yazılır 
    
    // Arkada Win ODBC sürücüsünün tetiklenir
  const dbConfig: any = {
    connectionString: 'Driver={SQL Server};Server=DESKTOP-2QAQQV4\\SQLEXPRESS;Database=GorevYonetimDB;Trusted_Connection=yes;'
};
  

// Veritabanına bağlanma işlemi için asenkron fonk
//baglantı islemi zaman alır beklemek gerekir böylece await kullanabiliriz
const connectDB = async () => {
    try {
        // Bağlantı işlemi başlatılır
        await sql.connect(dbConfig);
        console.log("MSSQL veritabanı bağlantısı başarıyla kuruldu");
    } catch (error) {
        console.error("Veritabanına bağlanırken hata oluştu:", error);
    }
};

// Veritabanı nesnesi ve bağlantı fonksiyonu dışa aktarılır
export { sql, connectDB };


