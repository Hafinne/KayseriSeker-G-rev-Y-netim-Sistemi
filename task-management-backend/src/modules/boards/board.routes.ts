import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';

// Yeni parçaladığımız controller'ları içe aktarıyoruz
import { listBoards, createBoard, getBoardDetails, deleteBoard, archiveBoard, unarchiveBoard, updateTaskDueDate, markNotificationsAsRead, getNotifications } from './controllers/board.controller';
import { createList, deleteList, updateListName, updateListOrder } from './controllers/list.controller';
import { createTask, deleteTask, moveTask, updateTaskDescription, updateTaskPriority, toggleTaskCompletion } from './controllers/task.controller';
import { toggleTaskAssignee } from './controllers/assignee.controller';
import { addTaskNote, deleteTaskNote } from './controllers/note.controller';
import { getAuditLogs } from './controllers/log.controller';

const router = Router();
router.use(authMiddleware);

// --- PANO (BOARD) ROTALARI ---
router.get('/', listBoards);
router.post('/', createBoard);
// frontend "details" bekliyor
router.get('/:id/details', getBoardDetails); 

// --- LİSTE ROTALARI ---
router.post('/:id/lists', createList);
router.delete('/lists/:listId', deleteList);

// --- GÖREV (TASK) ROTALARI ---
// frontend "/:id/tasks" bekliyor
router.post('/:id/tasks', createTask); 
router.delete('/tasks/:taskId', deleteTask);
router.put('/tasks/:taskId/move', moveTask);
router.put('/tasks/:taskId/description', updateTaskDescription);
router.put('/tasks/:taskId/priority', updateTaskPriority);
router.put('/tasks/:taskId/status', toggleTaskCompletion);

// --- PERSONEL ROTALARI ---
//frontend "assignees" kelimesini bekliyor
router.post('/tasks/:taskId/assignees', toggleTaskAssignee);

// --- NOT ROTALARI ---
router.post('/tasks/:taskId/notes', addTaskNote);
router.delete('/notes/:noteId', deleteTaskNote);
// board arşiv ve silme
router.delete('/:id', deleteBoard);       
router.put('/:id/archive', archiveBoard);
router.put('/:id/unarchive', unarchiveBoard);
router.put('/tasks/:taskId/due-date', updateTaskDueDate);
router.get('/logs', getAuditLogs);

// BİLDİRİM ROTALARI (authMiddleware eklendi)
router.get('/notifications', authMiddleware, getNotifications);
router.put('/notifications/read', authMiddleware, markNotificationsAsRead);

// Diğer rotaların...
router.put('/lists/:listId', authMiddleware, updateListName);
router.put('/boards/:boardId/lists/order', authMiddleware, updateListOrder);

export default router;