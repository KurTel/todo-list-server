import express from 'express';
import { Low } from 'lowdb';
import cors from 'cors';
import { JSONFile } from 'lowdb/node';

const app = express();
const PORT = 3000;
const DATA_FILE = './todo_data.json';

// Настройка базы данных
const adapter = new JSONFile(DATA_FILE);
const defaultData = { lists: [] };
const db = new Low(adapter, defaultData);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Инициализация данных
async function initData() {
    await db.read();
    // Убедимся, что данные инициализированы правильно
    db.data ||= { lists: [] };
    db.data.lists ||= [];
    await db.write();
}

// Работа со списками
app.get('/lists', async (req, res) => {
    await db.read();
    res.json(db.data.lists.map((list) => ({ id: list.id, name: list.name })));
});

app.post('/lists', async (req, res) => {
    await db.read();
    
    const newList = {
        id: Date.now().toString(),
        name: req.body.name,
        todos: []
    };
    
    db.data.lists.push(newList);
    await db.write();
    res.json(newList.map((list) => ({ id: list.id, name: list.name })));
});

app.get('/lists/:id', async (req, res) => {
    await db.read();
    
    const list = db.data.lists.find(l => l.id === req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    await db.write();
    res.json(list);
});

app.put('/lists/:id', async (req, res) => {
    await db.read();
    
    const list = db.data.lists.find(l => l.id === req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    list.name = req.body.name;
    await db.write();
    res.json(list);
});

app.delete('/lists/:id', async (req, res) => {
    await db.read();
    
    const initialLength = db.data.lists.length;
    db.data.lists = db.data.lists.filter(l => l.id !== req.params.id);
    
    if (db.data.lists.length === initialLength) {
        return res.status(404).json({ error: 'List not found' });
    }
    
    await db.write();
    res.json({ success: true });
});

// Работа с todo элементами
app.post('/lists/:listId/todos', async (req, res) => {
    await db.read();
    
    const list = db.data.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    // Инициализируем todos если их нет
    list.todos ||= [];
    
    const newTodo = {
        id: Date.now().toString(),
        text: req.body.text,
        completed: req.body.completed || false
    };
    
    list.todos.push(newTodo);
    await db.write();
    res.json(newTodo);
});

app.put('/lists/:listId/todos/:todoId', async (req, res) => {
    await db.read();
    
    const list = db.data.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    const todo = list.todos.find(t => t.id === req.params.todoId);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    
    Object.assign(todo, req.body);
    await db.write();
    res.json(todo);
});

app.delete('/lists/:listId/todos/:todoId', async (req, res) => {
    await db.read();
    
    const list = db.data.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    const initialLength = list.todos.length;
    list.todos = list.todos.filter(t => t.id !== req.params.todoId);
    
    if (list.todos.length === initialLength) {
        return res.status(404).json({ error: 'Todo not found' });
    }
    
    await db.write();
    res.json({ success: true });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Запуск сервера
initData().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to start server:', error);
});