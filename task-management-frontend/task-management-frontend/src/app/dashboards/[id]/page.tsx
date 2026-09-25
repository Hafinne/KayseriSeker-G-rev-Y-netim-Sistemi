'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar1 from "../../components/Sidebar1";
{/* typescript arayüzleri */}
interface List { id: number; list_name: string; is_done_list: boolean; list_order: number; }
interface Task { id: number; list_id: number; title: string; description: string; priority: string; task_order: number; status?: string; }
interface User { id: number; full_name: string; role_name: string; }
interface Assignee { task_id: number; user_id: number; full_name: string; }
interface Note { id: number; task_id: number; user_id: number; note_text: string; created_at: string; full_name: string; }
interface Task { 
  id: number; 
  list_id: number; 
  title: string; 
  description: string; 
  priority: string; 
  task_order: number; 
  status?: string; 
  due_date?: string; 
}
export default function BoardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id;

  {/* ana durum yönetimi */}
  const [boardName, setBoardName] = useState('Yükleniyor...');
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [taskAssignees, setTaskAssignees] = useState<Assignee[]>([]);
  const [taskNotes, setTaskNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  {/* 3 nokta menüleri durumları */}
  const [activeBoardMenu, setActiveBoardMenu] = useState(false);
  const [activeTaskMenu, setActiveTaskMenu] = useState<number | null>(null);
  const [activeListMenu, setActiveListMenu] = useState<number | null>(null);

  {/* modal durumları */}
  const [showListModal, setShowListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescText, setEditDescText] = useState('');

  {/* personel ve araç pop-up durumları */}
  const [showAssigneePopover, setShowAssigneePopover] = useState(false); 
  const [showBoardMembersPopover, setShowBoardMembersPopover] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showLabelsPopover, setShowLabelsPopover] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  //  (Bekleme yapmaz ve Türkçe karakter sorunu çıkarmaz)
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        fullName: localStorage.getItem('fullName') || '',
        role: localStorage.getItem('role') || ''
      };
    }
    return { fullName: '', role: '' };
  });
    
  // Büyük harfe çevirip arıyoruz ki YÖNETİCİ yazısıyla kesin eşleşsin
  const isAdmin = currentUser.role.toUpperCase().includes('YÖNETİCİ') || currentUser.role.toUpperCase().includes('ADMIN');
  {/* veri çekme işlemi */}
  const loadBoardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }

      const boardRes = await fetch(`http://localhost:5000/api/boards/${boardId}/details?t=${new Date().getTime()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (boardRes.ok) {
        const boardData = await boardRes.json();
        setBoardName(boardData.boardName);
        setLists(boardData.lists || []);
        setTasks(boardData.tasks || []);
        setTaskAssignees(boardData.assignees || []);
        setTaskNotes(boardData.notes || []);
        
        setSelectedTask(prevTask => {
          if (!prevTask) return null;
          const updatedTask = boardData.tasks.find((t: Task) => t.id === prevTask.id);
          return updatedTask || prevTask;
        });
      }

      const usersRes = await fetch(`http://localhost:5000/api/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (usersRes.ok) setPersonnel(await usersRes.json());
    } catch (err) {} finally { setLoading(false); }
  }, [boardId, router]);

  useEffect(() => { if (boardId) loadBoardData(); }, [boardId, loadBoardData]);

  {/*liste adı değişitrime */}
const [editingListId, setEditingListId] = useState<number | null>(null);
const [editListNameText, setEditListNameText] = useState('');


  {/* işlemler */}
  const handleArchiveBoard = async () => {
    if (!confirm('bu panoyu arşivlemek istediğinize emin misiniz?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/${boardId}/archive`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
      router.push('/dashboards');
    } catch (err) {}
  };

  const handleDeleteBoard = async () => {
    if (!confirm('bu panoyu kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/${boardId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      router.push('/dashboards');
    } catch (err) {}
  };

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/${boardId}/lists`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ list_name: newListName }) });
      setNewListName(''); setShowListModal(false); loadBoardData();
    } catch (err) {}
  };

  const handleDeleteList = async (listId: number) => {
    if (!confirm('bu listeyi silmek istediğinize emin misiniz?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/lists/${listId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      loadBoardData();
    } catch (err) {}
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/${boardId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ list_id: activeListId, title: newTaskTitle }) });
      setNewTaskTitle(''); setShowTaskModal(false); loadBoardData(); 
    } catch (err) {}
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('bu görevi silmek istediğinize emin misiniz?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/tasks/${taskId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setShowDetailModal(false); loadBoardData();
    } catch (err) {}
  };

  const handleMoveTask = async (taskId: number, targetListId: number) => {
    setSelectedTask(prev => prev ? { ...prev, list_id: targetListId } : null);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, list_id: targetListId } : t));
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/tasks/${taskId}/move`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ list_id: targetListId }) });
      loadBoardData();
    } catch (err) {}
  };

  const handleDragStart = (e: React.DragEvent, taskId: number) => { e.dataTransfer.setData('taskId', taskId.toString()); };
  const handleDrop = (e: React.DragEvent, targetListId: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) handleMoveTask(parseInt(taskId), targetListId);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!newNoteText.trim() || !selectedTask) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/tasks/${selectedTask.id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ note_text: newNoteText }) });
      setNewNoteText(''); loadBoardData(); 
    } catch (err) {}
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('bu notu silmek istediğinize emin misiniz?')) return;
    
    //  ÖNCE EKRANDAN ANINDA SİL (Kullanıcı beklemez hemen silindiğini görür)
    setTaskNotes(prev => prev.filter(note => note.id !== noteId));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/boards/notes/${noteId}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      
      //  Eğer backend tarafında hata olursa, ekrandan sildiğimiz notu geri getirmek için 
      // loadBoardData()'yı çağırarak verileri veritabanındaki gerçek haliyle eşitleriz.
      if (!response.ok) {
         loadBoardData(); 
      }
    } catch (err) {
      loadBoardData(); // Hata durumunda eski veriyi geri çek
    }
  };

  const handleToggleAssignee = async (userId: number) => {
    if (!selectedTask) return;
    const isAssigned = taskAssignees.some(a => Number(a.task_id) === Number(selectedTask.id) && Number(a.user_id) === userId);
    
    if (isAssigned) {
      setTaskAssignees(prev => prev.filter(a => !(Number(a.task_id) === Number(selectedTask.id) && Number(a.user_id) === userId)));
    } else {
      const user = personnel.find(p => p.id === userId);
      if (user) setTaskAssignees(prev => [...prev, { task_id: selectedTask.id, user_id: userId, full_name: user.full_name }]);
    }
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/tasks/${selectedTask.id}/assignees`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ user_id: userId }) });
      loadBoardData();
    } catch (err) { loadBoardData(); }
  };

  const handleSaveDescription = async () => {
    if (!selectedTask) return;
    setSelectedTask(prev => prev ? { ...prev, description: editDescText } : null);
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, description: editDescText } : t));
    setIsEditingDesc(false);
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/tasks/${selectedTask.id}/description`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ description: editDescText }) });
      loadBoardData(); 
    } catch (err) {}
  };

  const handleChangePriority = async (taskId: number, newPriority: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/tasks/${taskId}/priority`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ priority: newPriority }) });
      loadBoardData();
    } catch (err) {}
  };

  const handleToggleCompletion = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Active' : 'Completed';
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/boards/tasks/${task.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status: newStatus }) });
      loadBoardData();
    } catch (err) {}
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task); setEditDescText(task.description || ''); setIsEditingDesc(false);
    setShowDetailModal(true);
  };

  const IconDots = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>;
  const IconAlign = () => <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h7" /></svg>;
  const IconChat = () => <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
  const IconTrash = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const handleListDrop = async (draggedId: number, targetId: number) => {
  if (draggedId === targetId) return;
  
  const updatedLists = [...lists];
  const draggedIndex = updatedLists.findIndex(l => l.id === draggedId);
  const targetIndex = updatedLists.findIndex(l => l.id === targetId);
  
  if (draggedIndex === -1 || targetIndex === -1) return;
  
  // Listeleri anlık olarak ekranda yer değiştiriyoruz
  const [movedList] = updatedLists.splice(draggedIndex, 1);
  updatedLists.splice(targetIndex, 0, movedList);
  
  setLists(updatedLists);

  // Yeni sıralanan liste ID'lerini dizi olarak alıyoruz
  const listIds = updatedLists.map(l => l.id);
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000/api/boards/${boardId}/lists/order`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ listIds })
    });
    if (!res.ok) {
      // Hata olursa eski veriyi tekrar yüklüyoruz
      loadBoardData();
    }
  } catch (err) {
    console.error("sıralama kaydedilemedi:", err);
    loadBoardData();
  }
};


async function handlePriorityChange(taskId: number, newPriority: string) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:5000/api/boards/tasks/${taskId}/priority`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ priority: newPriority })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "aciliyet güncellenemedi.");
      return;
    }

  // başarılı olursa sayfayı yeniliyoruz veya veriyi tekrar çekiyoruz
    // (kendi dosyadaki veri çekme fonksiyonunun adını buraya yazabilirsin, örneğin fetchBoardDetails() veya window.location.reload())
    window.location.reload(); // en garantisi sayfayı anlık yenileyip güncel veriyi göstermektir
  } catch (err) {
    alert("bir hata oluştu.");
  }
}
//------------------------------------------------------------------------------- 

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">
      
      {/* menü */}
     <Sidebar1 />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboards')} className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md">&larr; </button>
            <div className="h-6 w-px bg-slate-300 mx-2"></div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{boardName}</h1>
          </div>
          
           <div className="relative">
              <button onClick={() => setActiveBoardMenu(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition"><IconDots /></button>
                   {activeBoardMenu && (
                     <>
                      <div className="fixed inset-0 z-[998]" onClick={() => setActiveBoardMenu(false)}></div>
                      <div className="absolute top-10 right-0 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-[999] py-2 text-sm relative">
        
                      {/* Sadece Yöneticiler Panoyu Silebilir  */}
                       {isAdmin ? (
                        <button onClick={handleDeleteBoard} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-bold">🗑️ Panoyu Sil</button>
                                 ) : (
                          <div className="px-4 py-2 text-xs text-slate-400 italic text-center">Bu panoda yetkiniz bulunmuyor.</div>
                       )}

                     </div>
                 </>
                   )}
                </div>
        </header>
<main className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar bg-slate-100">
  {!loading && (
    <div className="flex gap-5 h-full items-start">
      {lists.map(list => (
        <div 
          key={list.id} 
          draggable
          onDragStart={(e) => {
            // Sadece listenin gri alanından veya başlığından sürüklenmesini sağlıyoruz
            e.dataTransfer.setData("text/plain", `list-${list.id}`);
          }}
          onDragOver={(e) => {
            e.preventDefault(); // Yan yana sıralanabilmesi için şarttır
          }} 
          onDrop={(e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData("text/plain");
            
            if (data.startsWith("list-")) {
              const draggedListId = Number(data.replace("list-", ""));
              handleListDrop(draggedListId, list.id); // Listelerin yerini değiştirir
            } else {
              handleDrop(e, list.id); // Kart bırakma işlemi
            }
          }} 
          className="flex-shrink-0 w-[300px] bg-slate-200/70 rounded-xl flex flex-col max-h-full border border-slate-300/50 cursor-grab active:cursor-grabbing"
        >
          <div className="px-4 py-3.5 font-bold text-slate-700 flex justify-between items-center group relative">
            {editingListId === list.id ? (
              <input 
                type="text" 
                autoFocus
                value={editListNameText}
                onChange={(e) => setEditListNameText(e.target.value)}
                onBlur={async () => {
                  if (editListNameText.trim() && editListNameText !== list.list_name) {
                    try {
                      const token = localStorage.getItem('token');
                      const res = await fetch(`http://localhost:5000/api/boards/lists/${list.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ list_name: editListNameText })
                      });
                      if (res.ok) {
                        loadBoardData();
                      }
                    } catch (err) {
                      console.error("kaydetme hatası:", err);
                    }
                  }
                  setEditingListId(null);
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="text-sm font-bold bg-white border border-emerald-500 rounded px-1.5 py-0.5 outline-none w-full text-slate-800"
              />
            ) : (
              <h3 
                onClick={() => {
                  if (isAdmin) {
                    setEditingListId(list.id);
                    setEditListNameText(list.list_name);
                  }
                }}
                className={`text-sm font-bold truncate ${isAdmin ? 'cursor-pointer hover:text-emerald-700' : ''}`}
                title={isAdmin ? "İsmi değiştirmek için tıklayın" : ""}
              >
                {list.list_name}
              </h3>
            )}

            <button onClick={() => setActiveListMenu(list.id)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-300 transition"><IconDots /></button>
            
            {activeListMenu === list.id && (
              <>
                <div className="fixed inset-0 z-[998]" onClick={() => setActiveListMenu(null)}></div>
                <div className="absolute top-10 right-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-[999] py-2 text-sm">
                  {isAdmin && (
                    <button 
                      onClick={() => { 
                        setEditingListId(list.id); 
                        setEditListNameText(list.list_name); 
                        setActiveListMenu(null); 
                      }} 
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium"
                    >
                      Adını Değiştir
                    </button>
                  )}
                  {isAdmin && (
                    <div className="p-2">
                      <button onClick={() => { setActiveListId(list.id); setShowTaskModal(true); setActiveListMenu(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-300/50 rounded-lg transition-colors flex items-center gap-2">
                        <span className="text-lg leading-none">+</span> Kart Ekle
                      </button>
                    </div>
                  )}
                  {isAdmin && (
                    <button onClick={() => { handleDeleteList(list.id); setActiveListMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 border-t border-slate-100 mt-1 font-medium">Listeyi Sil</button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* KARTLARIN LİSTELENDİĞİ ALAN (Buraya liste içi bırakma özelliği eklendi) */}
          <div 
            className="flex-1 overflow-y-auto px-2 space-y-3 custom-scrollbar min-h-[50px] pb-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const data = e.dataTransfer.getData("text/plain");
              if (data && !data.startsWith("list-")) {
                const taskId = Number(data);
                handleMoveTask(taskId, list.id);
              }
            }}
          >
            {tasks.filter(task => Number(task.list_id) === Number(list.id)).map(task => {
              const uniqueAssignees = Array.from(new Map(taskAssignees.filter(a => Number(a.task_id) === Number(task.id)).map(item => [item.user_id, item])).values());
              const currentUserId = Number(localStorage.getItem('userId') || 0);
              const isAssignedToMe = uniqueAssignees.some(a => Number(a.user_id) === currentUserId);

              return (
                <div 
                  key={task.id} 
                  draggable 
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData("text/plain", task.id.toString());
                  }}
                  onClick={() => openTaskDetail(task)} 
                  className={`p-3.5 rounded-lg shadow-sm border transition-all group relative cursor-pointer ${
                    isAssignedToMe 
                      ? 'bg-emerald-50/90 border-emerald-300 hover:border-emerald-500 shadow-emerald-100' 
                      : 'bg-white border-slate-200 hover:border-emerald-500'
                  } ${activeTaskMenu === task.id ? 'z-50 ring-2 ring-emerald-500' : 'z-10'}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleCompletion(task); }} className={`mt-0.5 shrink-0 h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${task.status === 'Completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'}`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <p className={`text-sm font-medium leading-snug flex-1 ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setActiveTaskMenu(task.id); }} className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition"><IconDots /></button>
                  {activeTaskMenu === task.id && (
                    <>
                      <div className="fixed inset-0 z-[998]" onClick={(e) => { e.stopPropagation(); setActiveTaskMenu(null); }}></div>
                      <div className="absolute top-8 right-2 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-[999] py-2 text-sm">
                        <button onClick={(e) => { e.stopPropagation(); openTaskDetail(task); setActiveTaskMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700">Görüntüle</button>
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); setActiveTaskMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 border-t border-slate-100">Görevi Sil</button>
                        )}
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-end mt-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${task.priority === 'Acil' ? 'bg-red-500 text-white' : task.priority === 'Yüksek' ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-600'}`}>{task.priority || 'Normal'}</span>
                    {uniqueAssignees.length > 0 && (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {uniqueAssignees.map((a, i) => (
                          <div key={i} title={a.full_name} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold uppercase">{a.full_name.charAt(0)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <div className="p-2">
              <button onClick={() => { setActiveListId(list.id); setShowTaskModal(true); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-300/50 rounded-lg transition-colors flex items-center gap-2">
                <span className="text-lg leading-none">+</span> Kart Ekle
              </button>
            </div>
          )}
        </div>
      ))}
      {isAdmin && (
        <div className="flex-shrink-0 w-[300px]">
          <button onClick={() => setShowListModal(true)} className="w-full bg-slate-200/50 hover:bg-slate-300/50 border border-dashed border-slate-300 text-slate-600 font-medium py-3 px-4 rounded-xl text-sm transition-all flex items-center gap-2"><span className="text-lg leading-none">+</span> Başka bir liste ekle</button>
        </div>
      )}
    </div>
  )}
</main>
      </div>

      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start">
              <div className="flex gap-4 items-start w-full">
                <button onClick={() => handleToggleCompletion(selectedTask)} className={`mt-1 shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedTask.status === 'Completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></button>
                <div className="flex-1">
                  <h2 className={`text-xl font-bold leading-tight ${selectedTask.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{selectedTask.title}</h2>
                  <div className="flex items-center gap-6 mt-3 relative z-[999]">
 
 
 
 
  {/* Aşama Seçimi */}
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aşama:</span>
    <select value={selectedTask.list_id} onChange={(e) => handleMoveTask(selectedTask.id, Number(e.target.value))} className="text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-sm hover:border-slate-300 transition-colors">
      {lists.map(l => <option key={l.id} value={l.id}>{l.list_name}</option>)}
    </select>
  </div>

  {/* Öncelik Seçimi */}
  {/* Öncelik Seçimi */}
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Öncelik:</span>
    {isAdmin ? (
      <select 
        value={selectedTask.priority || 'Normal'} 
        onChange={(e) => handleChangePriority(selectedTask.id, e.target.value)} 
        className="text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
      >
        <option value="Düşük">Düşük</option>
        <option value="Normal">Normal</option>
        <option value="Yüksek">Yüksek</option>
        <option value="Acil">Acil</option>
      </select>
    ) : (
      <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded ${
        selectedTask.priority === 'Acil' ? 'bg-red-100 text-red-700' : 
        selectedTask.priority === 'Yüksek' ? 'bg-orange-100 text-orange-700' : 
        'bg-slate-100 text-slate-600'
      }`}>
        {selectedTask.priority || 'Normal'}
      </span>
    )}
  </div>

  {/* YENİ EKLENEN: Görev Durumu (Başlandı, Devam Ediyor, Beklemede, Tamamlandı) */}
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Durum:</span>
    <select 
      value={selectedTask.status || 'Active'} 
      onChange={async (e) => {
        const newStatus = e.target.value;
        setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, status: newStatus } : t));
        try {
          const token = localStorage.getItem('token');
          await fetch(`http://localhost:5000/api/boards/tasks/${selectedTask.id}/status`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify({ status: newStatus }) 
          });
          loadBoardData();
        } catch (err) {}
      }} 
      className="text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
    >
      <option value="Active">Başlanmadı </option>
      <option value="In Progress">Devam Ediyor</option>
      <option value="Waiting">Beklemede</option>
      <option value="Completed">Tamamlandı</option>
    </select>
  </div>
</div>


                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-800 font-bold text-xl h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 transition">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col md:flex-row gap-10 custom-scrollbar bg-slate-50/50">
              <div className="flex-1 space-y-8">
                
                {/* atanan üyeler yuvarlakları */}
                <div className="ml-9 relative">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Atanan Üyeler (Üzerine Tıklayarak Çıkar)</h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    {Array.from(new Map(taskAssignees.filter(a => Number(a.task_id) === Number(selectedTask.id)).map(item => [item.user_id, item])).values()).map(a => (
                      <div key={a.user_id} className="relative group cursor-pointer" onClick={() => handleToggleAssignee(a.user_id)}>
                        <div className="h-8 w-8 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-xs font-bold border border-slate-300" title={a.full_name}>{a.full_name.charAt(0)}</div>
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition shadow-sm">✕</div>
                      </div>
                    ))}
                    {/* + BUTONU */}
                   {/* + BUTONU (Sadece Yönetici Görür ve Tıklayabilir) */}
                {isAdmin && (
                  <button 
                   onClick={() => setShowAssigneePopover(true)} 
                    className="h-8 w-8 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-lg transition border border-slate-300 border-dashed"
                    title="Personel Ata"
                >+</button>
                )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
               <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Açıklama</h3>
           {isAdmin && (
        <button 
          onClick={() => {
        setEditDescText(selectedTask.description || '');
        setIsEditingDesc(true);
          }}
        className="text-xs text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded font-medium transition"
         >
          Düzenle
         </button>
              )}
              </div>
                  <div className="ml-8">
                    {isEditingDesc ? (
                      <div className="space-y-2">
                        <textarea autoFocus rows={4} value={editDescText} onChange={(e) => setEditDescText(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md p-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm resize-none" />
                        <div className="flex gap-2">
                          <button onClick={handleSaveDescription} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-xs font-bold transition">Kaydet</button>
                          <button onClick={() => { setIsEditingDesc(false); setEditDescText(selectedTask.description || ''); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded text-xs font-bold transition">İptal</button>
                        </div>
                      </div>
                    ) : (
                      selectedTask.description ? (
                        <div onClick={() => { setEditDescText(selectedTask.description); setIsEditingDesc(true); }} className="text-sm text-slate-700 leading-relaxed cursor-pointer hover:bg-slate-200/50 p-2 -ml-2 rounded transition">
                          {selectedTask.description.split('\n').map((line, i) => (<p key={i} className="mb-1 min-h-[1rem]">{line}</p>))}
                        </div>
                      ) : (
                        <div onClick={() => { setEditDescText(''); setIsEditingDesc(true); }} className="bg-slate-200/70 hover:bg-slate-300/70 cursor-pointer p-4 rounded-md text-sm text-slate-600 transition font-medium">Daha detaylı bir açıklama ekleyin...</div>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex gap-3 mb-4 items-center">
                    <div className="text-slate-400"><IconChat /></div>
                    <h3 className="text-base font-bold text-slate-800">Aktivite</h3>
                  </div>
                  <div className="ml-8">
                    <form onSubmit={handleAddNote} className="mb-6 relative">
                      <textarea rows={2} value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} placeholder="Bir yorum yazın..." className="w-full bg-white border border-slate-300 rounded-md p-3 pb-10 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-sm resize-none transition-all" />
                      <button type="submit" disabled={!newNoteText.trim()} className="absolute bottom-2 right-2 bg-slate-800 disabled:bg-slate-400 hover:bg-slate-900 text-white px-4 py-1.5 rounded text-xs font-bold transition">Kaydet</button>
                    </form>
                    <div className="space-y-4">
                      {taskNotes.filter(n => Number(n.task_id) === Number(selectedTask.id)).map(n => {
                        // Sisteme giriş yapan kullanıcının ID'sini alıyoruz
                        const currentUserId = Number(localStorage.getItem('userId') || 0);
                        // Bu notu yazan kişi ile giriş yapan kişi aynı mı kontrol ediyoruz
                        const isMyNote = Number(n.user_id) === currentUserId;

                        return (
                          <div key={n.id} className="flex gap-3 items-start group">
                            <div className="h-8 w-8 bg-slate-200 text-slate-700 rounded-full flex shrink-0 items-center justify-center text-xs font-bold uppercase">{n.full_name.charAt(0)}</div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-xs font-bold text-slate-800">{n.full_name} <span className="text-slate-400 font-normal ml-2">{new Date(n.created_at).toLocaleString('tr-TR')}</span></p>
                                
                                {/* YALNIZCA KİŞİNİN KENDİ NOTUYSA ÇÖP KUTUSU İKONU GÖRÜNÜR */}
                                {isMyNote && (
                                  <button onClick={() => handleDeleteNote(n.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-1" title="Notu Sil">
                                    <IconTrash />
                                  </button>
                                )}

                              </div>
                              <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm inline-block min-w-[200px]"><p className="text-sm text-slate-700">{n.note_text}</p></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* sağ kolon */}
              <div className="w-full md:w-48 space-y-6">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Panoya Ekle</h4>
                  <div className="space-y-2 relative">
                    
                    {/* Üyeler Butonu */}
                   
                  {isAdmin && (
                   <button 
                          onClick={() => setShowBoardMembersPopover(true)} 
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition"
                      > Üyeler </button>
                      )}
                    
                    {/* Etiketler Butonu */}
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setShowLabelsPopover(!showLabelsPopover); setShowAssigneePopover(false); setShowBoardMembersPopover(false); setShowDatePicker(false); }} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition"> Etiketler</button>
                      
                      {showLabelsPopover && (
                        <>
                          <div className="fixed inset-0 z-[998]" onClick={(e) => { e.stopPropagation(); setShowLabelsPopover(false); }}></div>
                          {/* absolute ve right-0 diyerek ekranın dışına taşmasını engelledik, temayı açık renge çevirdik */}
                          <div className="absolute top-10 right-0 w-64 bg-white p-4 rounded-lg shadow-2xl border border-slate-200 z-[999] text-slate-700" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Etiketler</span>
                              <button onClick={() => setShowLabelsPopover(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg leading-none">&times;</button>
                            </div>
                            
                            <input type="text" placeholder="Etiketleri ara..." className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mb-4 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-shadow" />
                            
                            <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                              {/* shrink-0 eklenerek checkboxların ezilmesi önlendi, gap-3 ile mesafe açıldı */}
                              <div className="flex items-center gap-3">
                                <input type="checkbox" className="w-4 h-4 cursor-pointer shrink-0 accent-emerald-600" />
                                <div className="flex-1 h-8 bg-green-500 rounded-md hover:bg-green-600 cursor-pointer flex items-center px-3 transition-colors"><span className="text-xs font-bold text-white truncate"></span></div>
                              </div>
                              <div className="flex items-center gap-3">
                                <input type="checkbox" defaultChecked className="w-4 h-4 cursor-pointer shrink-0 accent-emerald-600" />
                                <div className="flex-1 h-8 bg-yellow-500 rounded-md hover:bg-yellow-600 cursor-pointer flex items-center px-3 transition-colors"><span className="text-xs font-bold text-white truncate">Önemli</span></div>
                              </div>
                              <div className="flex items-center gap-3">
                                <input type="checkbox" className="w-4 h-4 cursor-pointer shrink-0 accent-emerald-600" />
                                <div className="flex-1 h-8 bg-orange-500 rounded-md hover:bg-orange-600 cursor-pointer flex items-center px-3 transition-colors"><span className="text-xs font-bold text-white truncate"></span></div>
                              </div>
                              <div className="flex items-center gap-3">
                                <input type="checkbox" className="w-4 h-4 cursor-pointer shrink-0 accent-emerald-600" />
                                <div className="flex-1 h-8 bg-red-500 rounded-md hover:bg-red-600 cursor-pointer flex items-center px-3 transition-colors"><span className="text-xs font-bold text-white truncate"></span></div>
                              </div>
                              <div className="flex items-center gap-3">
                                <input type="checkbox" className="w-4 h-4 cursor-pointer shrink-0 accent-emerald-600" />
                                <div className="flex-1 h-8 bg-purple-500 rounded-md hover:bg-purple-600 cursor-pointer flex items-center px-3 transition-colors"><span className="text-xs font-bold text-white truncate"></span></div>
                              </div>
                              <div className="flex items-center gap-3">
                                <input type="checkbox" defaultChecked className="w-4 h-4 cursor-pointer shrink-0 accent-emerald-600" />
                                <div className="flex-1 h-8 bg-pink-500 rounded-md hover:bg-pink-600 cursor-pointer flex items-center px-3 transition-colors"><span className="text-xs font-bold text-white truncate">NKLNKLN</span></div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>


{/* KALICI TAKVİM (BİTİŞ TARİHİ) BUTONU */}
<div className="relative">
  <button 
    onClick={() => setShowDatePicker(!showDatePicker)} 
    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition"
  >
    📅 {selectedTask.due_date ? selectedTask.due_date.split('T')[0] : 'Takvim'}
  </button>
  
  {showDatePicker && (
    <>
      <div className="fixed inset-0 z-[998]" onClick={() => setShowDatePicker(false)}></div>
      <div className="absolute top-10 right-0 w-56 bg-white p-3 rounded-xl shadow-2xl border border-slate-200 z-[999]">
        <p className="text-xs font-bold text-slate-600 mb-2">Bitiş Tarihi Seçin</p>
        <input 
          type="date" 
          defaultValue={selectedTask.due_date ? selectedTask.due_date.split('T')[0] : ''} 
          onChange={async (e) => {
            const newDate = e.target.value;
            if (!newDate) return;

            setShowDatePicker(false);
            
            // Anlık olarak hem seçili görevi hem genel görev listesini güncelliyoruz
            setSelectedTask(prev => prev ? { ...prev, due_date: newDate } : null);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, due_date: newDate } : t));

            // Backend'e kalıcı olarak kaydediyoruz
            try {
              const token = localStorage.getItem('token');
              const res = await fetch(`http://localhost:5000/api/boards/tasks/${selectedTask.id}/due-date`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ due_date: newDate })
              });
              if (res.ok) {
                loadBoardData(); // Verileri backend'den tazeleyip kalıcı hale getiriyoruz
              }
            } catch (err) {
              console.error("Tarih kaydedilemedi:", err);
            }
          }} 
          className="w-full text-sm border border-slate-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer bg-slate-50" 
        />
      </div>
    </>
  )}
</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">İşlemler</h4>
                  <div className="space-y-2">
               {isAdmin && (
  <div className="mt-6">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">İŞLEMLER</span>
    <button 
      onClick={() => handleDeleteTask(selectedTask.id)}
      className="w-full mt-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2 rounded-lg text-xs font-bold transition"
    >
      Sil
    </button>
  </div>
)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TÜM SİSTEM PERSONELİ EKRANI (+ BUTONU İÇİN) */}
      {showAssigneePopover && selectedTask && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowAssigneePopover(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-80 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800">Sistemdeki Tüm Personeller</h3>
              <button onClick={() => setShowAssigneePopover(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
            </div>
            <div className="p-3 overflow-y-auto custom-scrollbar max-h-[60vh]">
              <div className="space-y-1">
                {/* Sadece aktif olan personelleri filtreleyip listeliyoruz */}
{personnel
  .filter((user: any) => {
    // 1. GİZLEMEK İSTEDİĞİN KİŞİNİN ID NUMARASINI BURAYA YAZABİLİRSİN:
    const blockedIds = [3]; // Örn: Pasif olan kullanıcının ID'si kaçsa buraya ekle (örn: 3)
    
    // 2. VEYA İSMİNİ BURAYA YAZABİLİRSİN:
    const blockedNames = ['çalışan']; // Gizlemek istediğin isim (küçük harfle)
    
    if (blockedIds.includes(Number(user.id))) return false;
    
    const userName = (user.full_name || '').toLowerCase();
    if (blockedNames.some(b => userName.includes(b))) return false;

    return true;
  })
  .map(user => {
    const isAssigned = taskAssignees.some(a => Number(a.task_id) === Number(selectedTask.id) && Number(a.user_id) === user.id);
    if (isAssigned) return null;

    return (
      <div 
        key={user.id} 
        onClick={() => handleToggleAssignee(user.id)} 
        className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-emerald-50 cursor-pointer group transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-[10px] font-bold">
            {user.full_name ? user.full_name.charAt(0) : 'P'}
          </div>
          <span className="text-sm font-medium text-slate-600">{user.full_name}</span>
        </div>
        <span className="text-[11px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 px-2 transition">Ekle +</span>
      </div>
    );
  })
}
             </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SADECE BU GÖREVDEKİ KİŞİLER (SAĞ KOLON "ÜYELER" BUTONU İÇİN) */}
      {showBoardMembersPopover && selectedTask && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowBoardMembersPopover(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-80 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800">Bu Görevdeki Üyeler</h3>
              <button onClick={() => setShowBoardMembersPopover(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
            </div>
            <div className="p-3 overflow-y-auto custom-scrollbar max-h-[60vh]">
              <div className="space-y-1">
                {taskAssignees.filter(a => Number(a.task_id) === Number(selectedTask.id)).map(user => (
                    <div key={user.user_id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg group transition">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold">{user.full_name.charAt(0)}</div>
                        <span className="text-sm font-medium text-slate-600">{user.full_name}</span>
                      </div>
                      <button onClick={() => handleToggleAssignee(user.user_id)} className="text-[10px] font-bold text-red-500 opacity-0 group-hover:opacity-100 px-2 py-1 bg-red-100 hover:bg-red-200 rounded transition">Çıkar -</button>
                    </div>
                ))}
                {taskAssignees.filter(a => Number(a.task_id) === Number(selectedTask.id)).length === 0 && <div className="text-slate-400 italic text-xs py-4 text-center">Bu göreve henüz kimse atanmamış.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* pano raporu modalı */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">📊 Pano Raporu ve Görev Kayıtları (Log)</h2>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-800 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-slate-200 p-4 rounded-lg text-center shadow-sm">
                  <p className="text-3xl font-bold text-slate-700">{tasks.length}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Toplam Görev</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg text-center shadow-sm">
                  <p className="text-3xl font-bold text-emerald-700">{tasks.filter(t => t.status === 'Completed').length}</p>
                  <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider mt-1">Tamamlanan</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-center shadow-sm">
                  <p className="text-3xl font-bold text-blue-700">{Array.from(new Set(taskAssignees.map(a => a.user_id))).length}</p>
                  <p className="text-xs font-bold text-blue-600/70 uppercase tracking-wider mt-1">Aktif Personel</p>
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Tüm Görevlerin Durumu (Log)</h3>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr><th className="px-4 py-3">Görev Başlığı</th><th className="px-4 py-3">Aşama (Liste)</th><th className="px-4 py-3">Öncelik</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3">Atanan Personeller</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                   {tasks.map(task => {
  const listName = lists.find(l => Number(l.id) === Number(task.list_id))?.list_name || '-';
  const assignees = Array.from(new Set(taskAssignees.filter(a => Number(a.task_id) === Number(task.id)).map(a => a.full_name))).join(', ');
  
  return (
    <tr key={task.id} className="hover:bg-slate-50 transition">
      {/* görev başlığı */}
      <td className="px-4 py-3 font-medium text-slate-800">{task.title}</td>
      
      {/* liste adı */}
      <td className="px-4 py-3 text-xs text-slate-600">{listName}</td>
      
      {/* aciliyet alanı: diğer detaylar gibi burası da role göre sabit rozet veya select olur */}
      <td className="px-4 py-3">
        {isAdmin ? (
          <select 
            value={task.priority || 'Normal'}
            onChange={(e) => handlePriorityChange(task.id, e.target.value)}
            className="text-xs border border-slate-300 rounded px-2 py-1 outline-none bg-white text-slate-800 font-semibold focus:border-emerald-600 transition"
          >
            <option value="Normal">Normal</option>
            <option value="Yüksek">Yüksek</option>
            <option value="Acil">Acil</option>
          </select>
        ) : (
          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded ${
            task.priority === 'Acil' ? 'bg-red-100 text-red-700' : 
            task.priority === 'Yüksek' ? 'bg-orange-100 text-orange-700' : 
            'bg-slate-100 text-slate-600'
          }`}>
            {task.priority || 'Normal'}
          </span>
        )}
      </td>

      {/* durum alanı */}
      <td className="px-4 py-3">
        {task.status === 'Completed' ? (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">✅ Tamamlandı</span>
        ) : (
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">⏳ Devam Ediyor</span>
        )}
      </td>

      {/* atanan personel */}
      <td className="px-4 py-3 text-xs">
        {assignees || <span className="text-slate-400 italic">Atanmamış</span>}
      </td>
    </tr>
  );
})}
                    {tasks.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Bu panoda henüz görev bulunmuyor.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* liste ekleme modalı */}
      {showListModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Yeni Liste Ekle</h2>
            <form onSubmit={handleAddList}>
              <input type="text" autoFocus required value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Liste adını girin..." className="w-full border border-slate-300 px-3 py-2 rounded-md mb-4 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowListModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition">İptal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-sm font-medium transition">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* kart ekleme modalı */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Yeni Kart Ekle</h2>
            <form onSubmit={handleAddTask}>
              <input type="text" autoFocus required value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Kart için bir başlık girin..." className="w-full border border-slate-300 px-3 py-2 rounded-md mb-4 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition">İptal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-sm font-medium transition">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}