const API_URL = 'https://api.sheetbest.com/sheets/ce0564ef-26d7-408e-9805-d4f94db6853c';

// Auto-refresh interval (5 minutes)
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;
let autoRefreshTimeout;

// DOM elements
const loading = document.getElementById('loading');
const main = document.querySelector('main');
const navBtns = document.querySelectorAll('.nav-btn');

// Fetch data from API
async function fetchFormResponses() {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = 'block';
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        console.log('Form data fetched:', data);
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No data received from sheet');
        }
        
        processFormData(data);
        scheduleNextRefresh();
    } catch (error) {
        console.error('Error fetching data:', error);
        main.innerHTML = `<p class="error">Error loading data: ${error.message}</p>`;
        scheduleNextRefresh();
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function scheduleNextRefresh() {
    clearTimeout(autoRefreshTimeout);
    autoRefreshTimeout = setTimeout(() => {
        console.log('Auto-refreshing data...');
        fetchFormResponses();
    }, AUTO_REFRESH_INTERVAL);
}

function processFormData(data) {
    const goToWords = {};
    const playingTimes = {};
    const uniqueTimes = new Set();
    const strategiesByAttempts = {
        '1-2': [],
        '3-4': [],
        '5-6': [],
        'never': []
    };
    
    // Mapping for time values
    const timeMapping = {
        "I don't have a specific time to play": "Any time"
    };
    
    // DEBUG: Show all available column names from first row
    if (data.length > 0) {
        console.log('Available columns in Google Sheet:', Object.keys(data[0]));
    }
    
    data.forEach((row, index) => {
        // DEBUG: Log first row completely to see all values
        if (index === 0) {
            console.log('First row data:', row);
        }
        // Extract go-to words
        const word = row['What is your go to word (the first word you put into Wordle)?'];
        if (word && word.trim()) {
            const cleanWord = word.trim().toUpperCase();
            goToWords[cleanWord] = (goToWords[cleanWord] || 0) + 1;
        }
        
        // Extract playing times
        let time = row['Do you play at a specific time of the day?'];
        if (time && time.trim()) {
            let cleanTime = time.trim();
            
            // Apply mapping if the time value exists in our mapping
            if (timeMapping[cleanTime]) {
                cleanTime = timeMapping[cleanTime];
            }
            
            playingTimes[cleanTime] = (playingTimes[cleanTime] || 0) + 1;
            uniqueTimes.add(cleanTime);
        }
        
        // Extract strategy information
        const attemptsInput = row['How many attempts does it usually take you to get the word on average?'];
        const hasStrategy = row['Do you have an Strategy?'];
        const strategy = row['If you answered yes, what is it?'];
        
        if (word && word.trim()) {
            let attemptKey = 'never';
            let displayAttempts = 'I don\'t usually get the word';
            
            // Check if it's the "I don't usually get the word" answer
            if (attemptsInput && attemptsInput.toLowerCase().includes('don\'t') && attemptsInput.toLowerCase().includes('usually')) {
                attemptKey = 'never';
                displayAttempts = 'I don\'t usually get the word';
            } else {
                const attempts = parseInt(attemptsInput);
                if (!isNaN(attempts)) {
                    if (attempts >= 1 && attempts <= 2) {
                        attemptKey = '1-2';
                        displayAttempts = '1 - 2';
                    } else if (attempts >= 3 && attempts <= 4) {
                        attemptKey = '3-4';
                        displayAttempts = '3 - 4';
                    } else if (attempts >= 5 && attempts <= 6) {
                        attemptKey = '5-6';
                        displayAttempts = '5 - 6';
                    } else if (attempts > 6) {
                        attemptKey = 'never';
                        displayAttempts = 'I don\'t usually get the word';
                    }
                }
            }
            
            // Capture strategy if it exists (with or without "yes" answer to the strategy question)
            const strategyText = (strategy && strategy.trim() !== '') 
                ? strategy.trim() 
                : '';
            
            strategiesByAttempts[attemptKey].push({
                word: word.trim().toUpperCase(),
                attempts: displayAttempts,
                attemptKey: attemptKey,
                strategy: strategyText
            });
        }
    });
    
    // DEBUG: Log all unique time values found
    console.log('All unique time values found:', Array.from(uniqueTimes));
    console.log('Playing times object:', playingTimes);
    console.log('Go-to words object:', goToWords);
    console.log('Strategies by attempts:', strategiesByAttempts);
    console.log('Total strategies collected:', 
        strategiesByAttempts['1-2'].length + 
        strategiesByAttempts['3-4'].length + 
        strategiesByAttempts['5-6'].length + 
        strategiesByAttempts['never'].length
    );
    
    updateVisualizations(goToWords, playingTimes, strategiesByAttempts);
}

function updateVisualizations(goToWords, playingTimes, strategiesByAttempts) {
    updateGoToWordsDisplay(goToWords);
    updatePlayingTimesChart(playingTimes);
    initializeStrategiesSection(strategiesByAttempts);
}

// Display top 3 go-to words as letter tiles
function updateGoToWordsDisplay(goToWords) {
    const container = document.getElementById('goToWordsContainer');
    if (!container) return;
    
    // Get top 3 words
    const top3 = Object.entries(goToWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    if (top3.length === 0) {
        container.innerHTML = '<p>No words found yet.</p>';
        return;
    }
    
    // Create letter tiles for each top word
    container.innerHTML = top3.map(([word, count]) => {
        const letters = word.split('');
        const lettersHTML = letters.map(letter => 
            `<div class="letter-tile">${letter}</div>`
        ).join('');
        
        return `
            <div class="word-tiles-row" data-count="${count}" data-word="${word}" title="${count} person${count !== 1 ? 's' : ''} use this word">
                ${lettersHTML}
            </div>
        `;
    }).join('');
    
    // Add hover event listeners to show tooltip
    const wordRows = container.querySelectorAll('.word-tiles-row');
    wordRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            const count = this.getAttribute('data-count');
            const word = this.getAttribute('data-word');
            this.setAttribute('title', `${count} person${count !== 1 ? 's' : ''} use${count !== 1 ? '' : 's'} this word`);
        });
    });
}

// Get color based on frequency (green > yellow > grey > white)
function getBarColor(count, maxCount, minCount) {
    if (maxCount === minCount) {
        // All same value
        return 'rgba(76, 175, 80, 0.8)'; // Green
    }
    
    const range = maxCount - minCount;
    const position = (count - minCount) / range;
    
    if (position >= 0.67) {
        return 'rgba(76, 175, 80, 0.8)'; // Green - most people
    } else if (position >= 0.34) {
        return 'rgba(255, 193, 7, 0.8)'; // Yellow - mid people
    } else if (position > 0) {
        return 'rgba(158, 158, 158, 0.8)'; // Grey - low people
    } else {
        return 'rgba(255, 255, 255, 1)'; // White with grey stroke - lowest
    }
}

// Create time bar chart with dynamic colors
function updatePlayingTimesChart(playingTimes) {
    const chartContainer = document.getElementById('timesChart');
    if (!chartContainer) {
        console.error('timesChart container not found');
        return;
    }
    
    // Ensure consistent order (Morning, Afternoon, Evening, Night, Any time)
    const timeOrder = ['Mornings', 'Afternoons', 'Evenings', 'Night', 'Any time'];
    const counts = timeOrder.map(time => playingTimes[time] || 0);
    
    // Get min and max for color calculation
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts.filter(c => c > 0), maxCount);
    
    // Clear previous chart if exists
    if (chartContainer.chart) {
        chartContainer.chart.destroy();
    }
    
    // Create new chart container
    chartContainer.innerHTML = '<canvas></canvas>';
    const canvas = chartContainer.querySelector('canvas');
    
    // Generate colors for each bar
    const colors = counts.map(count => 
        count === 0 
            ? 'rgba(255, 255, 255, 1)' 
            : getBarColor(count, maxCount, minCount)
    );
    
    const borderColors = counts.map(count => 
        count === 0 
            ? 'rgba(158, 158, 158, 1)' 
            : 'rgba(100, 100, 100, 0.3)'
    );
    
    chartContainer.chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: timeOrder,
            datasets: [{
                label: 'Number of People',
                data: counts,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: maxCount,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Initialize strategies section with filters
function initializeStrategiesSection(strategiesByAttempts) {
    const strategiesSection = document.getElementById('strategies');
    if (!strategiesSection) return;
    
    // Create filter buttons
    const filterContainer = document.createElement('div');
    filterContainer.className = 'attempt-filters';
    
    const attemptRanges = ['1-2', '3-4', '5-6', 'never'];
    const attemptLabels = {
        '1-2': '1-2',
        '3-4': '3-4',
        '5-6': '5-6',
        'never': 'I don\'t usually get the word'
    };
    
    let defaultSelected = '1-2';
    
    // Find first non-empty category
    for (let range of attemptRanges) {
        if (strategiesByAttempts[range].length > 0) {
            defaultSelected = range;
            break;
        }
    }
    
    attemptRanges.forEach(range => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${range === defaultSelected ? 'active' : ''}`;
        btn.textContent = attemptLabels[range];
        btn.dataset.attempts = range;
        
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayStrategies(strategiesByAttempts[range]);
        });
        
        filterContainer.appendChild(btn);
    });
    
    // Insert filters before the strategies list container
    const strategiesListContainer = strategiesSection.querySelector('#strategiesList');
    if (strategiesListContainer) {
        strategiesSection.insertBefore(filterContainer, strategiesListContainer);
    }
    
    // Display default strategies
    displayStrategies(strategiesByAttempts[defaultSelected]);
}

// Display strategy cards in a grid
function displayStrategies(strategies) {
    const container = document.getElementById('strategiesList');
    if (!container) return;
    
    if (strategies.length === 0) {
        container.innerHTML = '<p class="no-strategies">No strategies found for this attempt range.</p>';
        return;
    }
    
    container.innerHTML = strategies.map(item => {
        const gridHTML = createWordleGrid(item.attemptKey);
        
        return `
            <div class="strategy-card">
                <div class="card-header">
                    <span class="attempts-label">Takes them ${item.attempts} tries to get the word right</span>
                </div>
                <div class="card-content">
                    <div class="word-display">
                        ${item.word.split('').map(letter => `<div class="word-letter">${letter}</div>`).join('')}
                    </div>
                    ${item.strategy ? `<div class="strategy-text">"${item.strategy}"</div>` : ''}
                    <div class="wordle-grid">
                        ${gridHTML}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Create a Wordle grid showing the correct pattern based on attempts
function createWordleGrid(attemptKey) {
    const rows = 6;
    const cols = 5;
    let gridHTML = '';
    
    // Define which rows are green, gray, or white based on attempt range
    let greenRows = [];
    let grayRows = [];
    let whiteRows = [];
    
    switch(attemptKey) {
        case '1-2':
            // Only bottom 2 rows green, rest white
            whiteRows = [0, 1, 2, 3];
            greenRows = [4, 5];
            break;
        case '3-4':
            // Top 2 rows gray, next 2 rows green, last 2 white
            grayRows = [0, 1];
            greenRows = [2, 3];
            whiteRows = [4, 5];
            break;
        case '5-6':
            // Top 4 rows gray, bottom 2 rows green
            grayRows = [0, 1, 2, 3];
            greenRows = [4, 5];
            break;
        case 'never':
            // All rows gray
            grayRows = [0, 1, 2, 3, 4, 5];
            break;
    }
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let cellClass = 'grid-cell';
            
            if (greenRows.includes(row)) {
                cellClass += ' green';
            } else if (grayRows.includes(row)) {
                cellClass += ' gray';
            } else if (whiteRows.includes(row)) {
                cellClass += ' empty';
            }
            
            gridHTML += `<div class="${cellClass}"></div>`;
        }
    }
    
    return gridHTML;
}

// Navigation handling
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const section = btn.dataset.section;
        if (section === 'home') {
            fetchFormResponses();
        } else if (section === 'favourites') {
            main.innerHTML = '<p>Favourites feature coming soon...</p>';
        }
    });
});

// Event listeners
const refreshDataBtn = document.getElementById('refreshDataBtn');
if (refreshDataBtn) {
    refreshDataBtn.addEventListener('click', fetchFormResponses);
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchFormResponses();
    scheduleNextRefresh();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    clearTimeout(autoRefreshTimeout);
});