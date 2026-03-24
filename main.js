const API_URL = 'https://api.sheetbest.com/sheets/ce0564ef-26d7-408e-9805-d4f94db6853c';
const SHEET_DB_API = 'https://sheetdb.io/api/v1/lswvipyoqoppy';

// Auto-refresh interval (5 minutes)
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;
let autoRefreshTimeout;

// DOM elements
const loading = document.getElementById('loading');
const main = document.querySelector('main');
const navBtns = document.querySelectorAll('.nav-btn');

// Fetch data from SheetBest API
async function fetchTeams(leagueId) {
    loading.style.display = 'block';
    main.innerHTML = '';
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const data = await response.json();
        
        // Filter by league if leagueId is provided
        const filteredData = leagueId 
            ? data.filter(item => item.leagueId === leagueId || item.league === leagueId)
            : data;
        
        displayTeams(filteredData);
    } catch (error) {
        main.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    } finally {
        loading.style.display = 'none';
    }
}

// Display teams in the main element
function displayTeams(teams) {
    if (teams.length === 0) {
        main.innerHTML = '<p>No teams found for this league.</p>';
        return;
    }
    
    main.innerHTML = teams.map(team => `
        <div class="team-card">
            <h3>${team.name || team.teamName || 'Unknown Team'}</h3>
            <p>${team.league || 'Unknown League'}</p>
        </div>
    `).join('');
}

// Navigation handling
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const section = btn.dataset.section;
        if (section === 'home') {
            main.innerHTML = '';
        } else if (section === 'favourites') {
            main.innerHTML = '<p>Favourites feature coming soon...</p>';
        }
    });
});

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
        document.getElementById('strategiesList').innerHTML = 
            `<p class="error">Error loading data: ${error.message}</p>`;
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
    const attempts = [];
    const strategies = [];
    
    data.forEach(row => {
        // Use exact column names from your Google Form
        const word = row['What is your go to word?']; // Note: added question mark
        const hasStrategy = row['Do you have an Strategy?']; // Note: added question mark
        const strategy = row['If you answered yes, what is it?']; // Note: added question mark
        const attemptCount = parseInt(row['How many attempts does it usually take you to get the word on average?']); // Note: added question mark
        
        if (word && word.trim()) {
            goToWords[word.trim()] = (goToWords[word.trim()] || 0) + 1;
        }
        
        if (!isNaN(attemptCount) && attemptCount > 0) {
            attempts.push(attemptCount);
        }
        
        if ((hasStrategy === 'Yes' || hasStrategy === 'yes') && strategy && strategy.trim()) {
            strategies.push(strategy.trim());
        }
    });
    
    updateVisualizations(goToWords, attempts, strategies);
}

function updateVisualizations(goToWords, attempts, strategies) {
    updateGoToWordsChart(goToWords);
    updateAttemptsChart(attempts);
    updateStrategiesList(strategies);
}

function updateGoToWordsChart(goToWords) {
    const sorted = Object.entries(goToWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sorted.map(([word]) => word);
    const counts = sorted.map(([, count]) => count);
    
    const chartContainer = document.getElementById('wordsChart');
    if (!chartContainer) {
        console.error('wordsChart container not found');
        return;
    }
    
    // Clear previous chart instance if exists
    if (chartContainer.chart) {
        chartContainer.chart.destroy();
    }
    
    const ctx = chartContainer.getContext?.('2d');
    if (!ctx) {
        chartContainer.innerHTML = '<canvas></canvas>';
        const canvas = chartContainer.querySelector('canvas');
        chartContainer.chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Frequency',
                    data: counts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)'
                }]
            }
        });
    } else {
        chartContainer.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Frequency',
                    data: counts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)'
                }]
            }
        });
    }
    
    document.getElementById('wordsList').innerHTML = 
        sorted.map(([word, count]) => `<p><strong>${word}</strong>: ${count} uses</p>`).join('');
}

function updateAttemptsChart(attempts) {
    if (attempts.length === 0) return;
    
    const avgAttempts = (attempts.reduce((a, b) => a + b, 0) / attempts.length).toFixed(1);
    
    const chartContainer = document.getElementById('attemptsChart');
    if (!chartContainer) {
        console.error('attemptsChart container not found');
        return;
    }
    
    if (chartContainer.chart) {
        chartContainer.chart.destroy();
    }
    
    chartContainer.innerHTML = '<canvas></canvas>';
    const canvas = chartContainer.querySelector('canvas');
    
    chartContainer.chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Average Attempts', 'Remaining'],
            datasets: [{
                data: [avgAttempts, 6 - avgAttempts],
                backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(200, 200, 200, 0.3)']
            }]
        }
    });
}

function updateStrategiesList(strategies) {
    const container = document.getElementById('strategiesList');
    if (!container) return;
    
    if (strategies.length === 0) {
        container.innerHTML = '<p>No strategies available yet.</p>';
        return;
    }
    
    container.innerHTML = 
        strategies.map(s => `<div class="strategy-card"><p>${s}</p></div>`).join('');
}

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