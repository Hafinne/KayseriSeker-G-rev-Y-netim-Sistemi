export async function loginRequest(username: string, password: string) {
  const response = await fetch("http://localhost:5000/api/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Giriş başarısız.");
  }

  return response.json();
}
// Board veri tipini tanımlıyoruz
export interface Board {
  id: number;
  board_name: string;
  description: string;
}

// Token'ı localStorage'dan alan yardımcı fonksiyon
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}` // Token'ı buraya ekliyoruz
  };
};

export async function getBoards(): Promise<Board[]> {
  const response = await fetch("http://localhost:5000/api/boards", {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error("Board verileri alınamadı.");
  return response.json();
}

export async function createBoard(name: string, description: string) {
  const response = await fetch("http://localhost:5000/api/boards", {
    method: "POST",
    headers: getAuthHeaders(),
    // name değişkenini backendin beklediği 'board_name'
    body: JSON.stringify({ board_name: name, description }), 
  });

  if (!response.ok) {
    // Sabit mesaj yerine backend'den gelen O GERÇEK hatayı ekrana basıyoruz
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Sunucu Hatası: ${response.status}`);
  }
  
  return response.json();
}