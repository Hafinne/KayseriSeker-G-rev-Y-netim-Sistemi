'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar1';

interface Task {
  id: number;
  board_id?: number;
  board_name?: string;
  list_id: number;
  title: string;
  description: string;
  priority: string;
  due_date?: string;
  status?: string;
}

interface Board {
  id: number;
  board_name: string;
}

interface Assignee {
  task_id: number;
  user_id: number;
  full_name: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBoardId, setSelectedBoardId] = useState<string>('all');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadCalendarData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }

      const boardsRes = await fetch('http://localhost:5000/api/boards', { headers: { 'Authorization': `Bearer ${token}` } });
      if (boardsRes.ok) {
        const boardsData = await boardsRes.json();
        setBoards(boardsData);

        let allTasks: Task[] = [];
        let allAssignees: Assignee[] = [];

        for (const board of boardsData) {
          const detailRes = await fetch(`http://localhost:5000/api/boards/${board.id}/details`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const boardTasks = (detailData.tasks || []).map((t: Task) => ({
              ...t,
              board_id: board.id,
              board_name: detailData.boardName
            }));
            allTasks = [...allTasks, ...boardTasks];
            if (detailData.assignees) {
              allAssignees = [...allAssignees, ...detailData.assignees];
            }
          }
        }
        setTasks(allTasks);
        setAssignees(allAssignees);
      }
    } catch (err) {
      console.error('Takvim verileri yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysOfWeek = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  
  const startDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const calendarDays = [];

  for (let i = 0; i < startDayIndex; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(new Date(year, month, i));

  const filteredTasks = tasks.filter(task => {
    if (selectedBoardId !== 'all' && task.board_id !== Number(selectedBoardId)) {
      return false;
    }
    if (onlyMyTasks) {
      const isAssignedToMe = assignees.some(a => Number(a.task_id) === Number(task.id));
      if (!isAssignedToMe) return false;
    }
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Acil': return 'bg-red-500 text-white';
      case 'Yüksek': return 'bg-orange-500 text-white';
      case 'Düşük': return 'bg-slate-200 text-slate-700';
      default: return 'bg-emerald-700 text-white';
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">
      
     <Sidebar/>

      {/* SAĞ İÇERİK ALANI */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">İş Takvimi ve Teslim Tarihleri</h1>

          <div className="flex items-center gap-3">
            <select 
              value={selectedBoardId} 
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer text-slate-700"
            >
              <option value="all">Tüm Panolar</option>
              {boards.map(board => (
                <option key={board.id} value={board.id}>{board.board_name}</option>
              ))}
            </select>

            <button 
              onClick={() => setOnlyMyTasks(!onlyMyTasks)} 
              className={`text-xs font-semibold px-3.5 py-2 rounded-lg border transition ${onlyMyTasks ? 'bg-[#063f2d] text-white border-[#063f2d]' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
            >
              Sadece Benim Görevlerim
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 flex flex-col">
          
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <button onClick={prevMonth} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg text-xs transition text-slate-700">&larr; Önceki Ay</button>
            <h2 className="text-base font-bold text-slate-800">
              {currentDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={nextMonth} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg text-xs transition text-slate-700">Sonraki Ay &rarr;</button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center font-bold text-[11px] text-slate-600 uppercase py-3">
              {daysOfWeek.map((day, i) => <div key={i}>{day}</div>)}
            </div>

            <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-200 gap-px">
              {calendarDays.map((dateObj, index) => {
                if (!dateObj) return <div key={index} className="bg-slate-50/50 p-2 min-h-[100px]"></div>;

                const dateString = dateObj.toISOString().split('T')[0];
                const dayTasks = filteredTasks.filter(t => t.due_date && t.due_date.startsWith(dateString));
                const isToday = new Date().toDateString() === dateObj.toDateString();

                return (
                  <div key={index} className={`bg-white p-2.5 flex flex-col overflow-y-auto ${isToday ? 'bg-emerald-50/40 ring-1 ring-emerald-600 inset-0' : ''}`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center ${isToday ? 'bg-[#063f2d] text-white' : 'text-slate-700'}`}>
                         {dateObj.getDate()}
                      </span>
                    </div>

                    <div className="space-y-1.5 mt-1">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id}
                          onClick={() => router.push(`/dashboards/${task.board_id}`)}
                          className={`text-[11px] font-semibold p-2 rounded-md truncate cursor-pointer shadow-sm transition hover:opacity-85 ${getPriorityColor(task.priority)}`}
                          title={`${task.title} (${task.board_name})`}
                        >
                          <div className="truncate font-bold">{task.title}</div>
                          <div className="text-[9px] opacity-85 truncate">{task.board_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}