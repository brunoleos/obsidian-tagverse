// Example: Real-Time Clock
// Displays current date and time, updating every second

async function render(context) {
    const container = context.element.createEl('div');
    const timeSpan = container.createEl('span');

    const updateTime = () => {
        timeSpan.textContent = new Date().toLocaleString();
    };

    updateTime();
    setInterval(updateTime, 1000);

    return container;
}
