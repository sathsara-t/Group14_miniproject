const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// Helper to read DB
const readDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return { allowance: 0, expenses: [] };
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading database:', err);
        return { allowance: 0, expenses: [] };
    }
};

// Helper to write DB
const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing to database:', err);
        return false;
    }
};

// Get Full Data
app.get('/api/data', (req, res) => {
    const data = readDB();
    res.json(data);
});

// Save Full Data (used for quick syncs)
app.post('/api/data', (req, res) => {
    const { allowance, expenses } = req.body;

    if (allowance === undefined || !Array.isArray(expenses)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    const success = writeDB({ allowance, expenses });
    if (success) {
        res.json({ message: 'Data saved successfully' });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Save just allowance
app.post('/api/allowance', (req, res) => {
    const { allowance } = req.body;
    if (allowance === undefined) return res.status(400).json({ error: 'Allowance required' });

    const data = readDB();
    data.allowance = allowance;
    writeDB(data);
    res.json({ message: 'Allowance updated' });
});

// Add single expense
app.post('/api/expenses', (req, res) => {
    const expense = req.body;
    if (!expense.id || !expense.amount) return res.status(400).json({ error: 'Invalid expense' });

    const data = readDB();
    data.expenses.push(expense);
    writeDB(data);
    res.json({ message: 'Expense added' });
});

// Delete single expense
app.delete('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    const data = readDB();

    data.expenses = data.expenses.filter(e => e.id !== id);
    writeDB(data);
    res.json({ message: 'Expense deleted' });
});

// Clear all data
app.post('/api/reset', (req, res) => {
    writeDB({ allowance: 0, expenses: [] });
    res.json({ message: 'Database reset' });
});

app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 FinanceFlow Local Backend Server is running!`);
    console.log(`👉 Server URL: http://localhost:${PORT}`);
    console.log(`👉 Database: ${DB_FILE}`);
    console.log(`=================================================\n`);
});
