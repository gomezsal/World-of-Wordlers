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
    
    // Mapping for time values
    const timeMapping = {
        "I don't have a specific time to play": "Any time"
    };
    
    data.forEach(row => {
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
    });
    
    // DEBUG: Log all unique time values found
    console.log('All unique time values found:', Array.from(uniqueTimes));
    console.log('Playing times object:', playingTimes);
    console.log('Go-to words object:', goToWords);
    
    updateVisualizations(goToWords, playingTimes);
}

function updateVisualizations(goToWords, playingTimes) {
    updateGoToWordsDisplay(goToWords);
    updatePlayingTimesChart(playingTimes);
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
            <div class="word-tiles-row">
                ${lettersHTML}
            </div>
        `;
    }).join('');
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