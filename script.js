const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');

let currentExpression = '';

// Handle button clicks
buttons.forEach(button => {
    button.addEventListener('click', async () => {
        const value = button.textContent;

        if (button.id === 'clear') {
            currentExpression = '';
            display.value = '0';
        } else if (button.id === 'equals') {
            if (currentExpression === '') return;

            try {
                // Send expression to backend for evaluation
                const response = await fetch('http://localhost:3000/calculate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ expression: currentExpression })
                });

                const data = await response.json();

                if (response.ok) {
                    display.value = data.result;
                    // Keep result as current expression for chaining operations
                    currentExpression = data.result;
                } else {
                    display.value = 'Error';
                    currentExpression = '';
                }
            } catch (error) {
                console.error('Fetch error:', error);
                display.value = 'Error';
                currentExpression = '';
            }
        } else {
            // Append value to expression

            // Format functions slightly if needed for mathjs, typically sin() needs parentheses,
            // but for a simple calculator string building we just append text.
            // If they click 'sin', we append 'sin('.
            let appendValue = value;
            if (['sin', 'cos', 'tan', 'log', 'sqrt'].includes(value)) {
                appendValue = value + '(';
            }

            currentExpression += appendValue;
            display.value = currentExpression;
        }
    });
});
