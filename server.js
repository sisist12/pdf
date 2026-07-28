const express = require('express');
const cors = require('cors');
const { evaluate } = require('mathjs');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post('/calculate', (req, res) => {
    try {
        const { expression } = req.body;
        if (!expression) {
            return res.status(400).json({ error: 'Expression is required' });
        }

        // Evaluate the expression using mathjs
        const result = evaluate(expression);

        // Convert to string to avoid issues with extremely large/small numbers or complex types
        res.json({ result: String(result) });
    } catch (error) {
        console.error('Calculation error:', error.message);
        res.status(400).json({ error: 'Invalid mathematical expression' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
