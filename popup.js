document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll("[data-tab]");
  const tabContents = document.querySelectorAll(".tab");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      tabContents.forEach(tc => tc.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.tab;
      document.getElementById(target).classList.add("active");
    });
  });

  // Show Events Tab by default
  document.getElementById("events-tab").classList.add("active");
  document.querySelector('[data-tab="events-tab"]').classList.add("active");

  // Load tracked events
  const eventsList = document.getElementById("events-list");
  chrome.storage.local.get("events", (data) => {
    const events = data.events || [];
    if(events.length === 0){
      eventsList.innerHTML = "<li>No events tracked yet.</li>";
    } else {
      events.forEach(ev => {
        const li = document.createElement("li");
        li.textContent = `${ev.event} at ${ev.time}s`;
        eventsList.appendChild(li);
      });
    }
  });

  // Revision Suggestions Tab
document.querySelector('[data-tab="revision-tab"]').addEventListener("click", () => {
  loadRevisionSuggestionsFromEvents();
});

function loadRevisionSuggestionsFromEvents() {
  chrome.storage.local.get("events", (data) => {
    const events = data.events || [];
    const revisionList = document.getElementById("revision-list");
    
    if (!revisionList) return;
    
    revisionList.innerHTML = "";

    if (events.length === 0) {
      revisionList.innerHTML = `
        <li class="list-group-item">
          <i class="fas fa-info-circle me-2 text-info"></i>
          No learning events tracked yet. Watch some educational videos!
        </li>
      `;
      return;
    }

    // Aggregate events by type and time
    const eventTypes = {};
    const timeClusters = {};
    
    events.forEach(ev => {
      // Group by event type
      if (!eventTypes[ev.event]) eventTypes[ev.event] = 0;
      eventTypes[ev.event]++;
      
      // Group by time clusters (every 30 seconds)
      const timeCluster = Math.floor(ev.time / 30) * 30;
      if (!timeClusters[timeCluster]) timeClusters[timeCluster] = 0;
      timeClusters[timeCluster]++;
    });

    // Sort clusters by frequency
    const sortedClusters = Object.entries(timeClusters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Display revision suggestions
    sortedClusters.forEach(([time, count], index) => {
      const startTime = parseInt(time);
      const endTime = startTime + 30;
      
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <div>
          <span class="badge bg-primary me-2">${index + 1}</span>
          <strong>Review content at ${startTime}-${endTime}s</strong>
          <div class="small text-muted">
            ${count} interactions suggest confusion in this section
          </div>
        </div>
        <span class="badge bg-danger rounded-pill">${count} events</span>
      `;
      revisionList.appendChild(li);
    });

    // Add event type summary
    const summaryLi = document.createElement("li");
    summaryLi.className = "list-group-item bg-light";
    summaryLi.innerHTML = `
      <div class="small">
        <i class="fas fa-chart-bar me-1"></i>
        <strong>Event Summary:</strong>
        ${Object.entries(eventTypes).map(([type, count]) => 
          `${type}: ${count}`).join(', ')}
      </div>
    `;
    revisionList.appendChild(summaryLi);
  });
}

  // ✅ Heatmap Tab Handler
document.querySelector('[data-tab="heatmap-tab"]').addEventListener("click", () => {
  const canvas = document.getElementById("heatmap-chart");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");

  // Fetch events from storage
  chrome.storage.local.get("events", (data) => {
    const events = data.events || [];
    
    if (events.length === 0) {
      ctx.font = "14px Arial";
      ctx.fillText("No events tracked yet. Watch some YouTube videos first!", 10, 30);
      return;
    }

    // 1️⃣ Find maximum event time to scale graph
    const maxTime = Math.ceil(Math.max(...events.map(e => e.time)));
    const interval = 10; // seconds per bin
    const binCount = Math.ceil(maxTime / interval);

    // 2️⃣ Create bins dynamically
    const bins = new Array(binCount).fill(0);
    const labels = [];

    for (let i = 0; i < binCount; i++) {
      const start = i * interval;
      const end = start + interval;
      labels.push(`${start}-${end}s`);
    }

    // 3️⃣ Fill bins with events
    events.forEach(ev => {
      const idx = Math.floor(ev.time / interval);
      if (idx < bins.length) bins[idx]++;
    });

    // 4️⃣ Draw chart with dynamic bins
    if (window.heatmapChart) {
      window.heatmapChart.destroy();
    }
    
    window.heatmapChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Confusion Level",
          data: bins,
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: { 
          legend: { display: false },
          title: {
            display: true,
            text: 'Confusion Heatmap - Video Timeline',
            font: { size: 14 }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: "Video Timeline (seconds)",
              font: { weight: 'bold' }
            } 
          },
          y: { 
            title: { 
              display: true, 
              text: "Interactions Count", 
              font: { weight: 'bold' }
            }, 
            beginAtZero: true 
          }
        }
      }
    });
  });
});

// ====================== LEARNING ANALYTICS DASHBOARD ======================

// Add analytics CSS styles
const analyticsStyle = document.createElement('style');
analyticsStyle.textContent = `
  .analytics-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .stat-card {
    background: linear-gradient(135deg, #4361ee, #3a0ca3);
    color: white;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    transition: all 0.3s ease;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border: none;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }
  
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }
  
  .stat-number {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 4px;
    line-height: 1.2;
  }
  
  .stat-label {
    font-size: 11px;
    opacity: 0.9;
    font-weight: 500;
  }
  
  .stat-card.total-time {
    background: linear-gradient(135deg, #4cc9f0, #4361ee);
  }
  
  .stat-card.videos-watched {
    background: linear-gradient(135deg, #f72585, #7209b7);
  }
  
  .stat-card.confusion-score {
    background: linear-gradient(135deg, #ff9e00, #ff5400);
  }
  
  .stat-card.quiz-performance {
    background: linear-gradient(135deg, #38b000, #2d9d0b);
  }
  
  .insight-card {
    background: #f8f9fa;
    border-left: 4px solid #4361ee;
    padding: 10px 12px;
    margin-bottom: 8px;
    border-radius: 6px;
    font-size: 13px;
    display: flex;
    align-items: flex-start;
  }
  
  .insight-card.good {
    border-left-color: #4CAF50;
    background: #e8f5e9;
  }
  
  .insight-card.warning {
    border-left-color: #ff9800;
    background: #fff3e0;
  }
  
  .insight-card.info {
    border-left-color: #2196F3;
    background: #e3f2fd;
  }
  
  .insight-icon {
    margin-right: 8px;
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
  }
  
  .analytics-charts {
    background: white;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    margin-top: 15px;
  }
  
  #analytics-tab .card {
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    overflow: hidden;
  }
  
  #analytics-tab .card-header {
    background: linear-gradient(135deg, #4361ee, #3a0ca3);
    border-bottom: none;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
  }
  
  #analytics-tab h5 {
    color: #2c3e50;
    font-weight: 700;
    margin-bottom: 15px;
    font-size: 16px;
    padding: 0 5px;
  }
`;
document.head.appendChild(analyticsStyle);

// Analytics Tab Handler
document.querySelector('[data-tab="analytics-tab"]')?.addEventListener("click", function() {
  loadLearningAnalytics();
});

function loadLearningAnalytics() {
  const statsContainer = document.getElementById("analytics-stats");
  const insightsContainer = document.getElementById("analytics-insights");
  
  if (!statsContainer) return;
  
  // Show loading state
  statsContainer.innerHTML = `
    <div class="text-center py-3 col-span-2">
      <div class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted small">Loading your learning analytics...</p>
    </div>
  `;
  
  if (insightsContainer) {
    insightsContainer.innerHTML = '';
  }
  
  // Load data after a brief delay to ensure tab is visible
  setTimeout(() => {
    chrome.storage.local.get(["events", "quizHistory", "videoHistory"], (data) => {
      const events = data.events || [];
      const quizHistory = data.quizHistory || [];
      const videoHistory = data.videoHistory || [];
      
      // Calculate stats
      const stats = calculateLearningStats(events, quizHistory, videoHistory);
      
      // Update dashboard
      updateAnalyticsDashboard(stats, events, quizHistory);
      
      // Generate insights
      generateLearningInsights(stats, events, quizHistory);
    });
  }, 100);
}

// ====================== STUDY TIMER FEATURE ======================

// Add CSS for study timer
const timerStyle = document.createElement('style');
timerStyle.textContent = `
  .timer-display {
    font-family: 'Roboto Mono', monospace;
    font-size: 32px;
    font-weight: 700;
    color: #2c3e50;
    margin: 15px 0;
    padding: 10px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border-radius: 10px;
    border: 2px solid #e0e0e0;
    letter-spacing: 2px;
  }
  
  .timer-display.running {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    border-color: #28a745;
    color: #155724;
    animation: pulse 2s infinite;
  }
  
  .timer-display.paused {
    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
    border-color: #ffc107;
    color: #856404;
  }
  
  .timer-display.break {
    background: linear-gradient(135deg, #d1ecf1, #bee5eb);
    border-color: #17a2b8;
    color: #0c5460;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.9; }
    100% { opacity: 1; }
  }
  
  .timer-mode .btn-group {
    width: 100%;
  }
  
  .timer-mode .btn {
    flex: 1;
  }
  
  .timer-settings {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 15px;
    margin: 15px 0;
  }
  
  .timer-controls {
    margin: 20px 0;
  }
  
  .timer-controls .btn {
    min-width: 80px;
    font-weight: 600;
  }
  
  .timer-stats {
    background: linear-gradient(135deg, #4361ee, #3a0ca3);
    color: white;
    padding: 15px;
    border-radius: 10px;
    margin-top: 15px;
  }
  
  .timer-stats .stat-number {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 5px;
  }
  
  .timer-stats .stat-label {
    font-size: 11px;
    opacity: 0.9;
  }
  
  .pomodoro-progress {
    margin-top: 15px;
  }
  
  .session-indicator {
    display: flex;
    justify-content: center;
    gap: 5px;
    margin-top: 10px;
  }
  
  .session-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #e0e0e0;
    transition: all 0.3s;
  }
  
  .session-dot.completed {
    background: #28a745;
  }
  
  .session-dot.current {
    background: #ffc107;
    transform: scale(1.2);
  }
  
  .timer-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 15px;
    z-index: 10000;
    max-width: 300px;
    border-left: 5px solid #4361ee;
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .timer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }
  
  .overlay-timer {
    background: white;
    border-radius: 20px;
    padding: 30px;
    text-align: center;
    max-width: 400px;
    animation: popIn 0.3s ease-out;
  }
  
  @keyframes popIn {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  .form-control-sm {
    font-size: 12px;
    padding: 4px 8px;
  }
  
  .timer-alert {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    margin: 10px 0;
  }
`;
document.head.appendChild(timerStyle);

// Timer Variables
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;
let isBreakTime = false;
let currentSession = 1;
let completedSessions = 0;
let totalStudyTime = 0;
let todayStudyTime = 0;
let weekStudyTime = 0;
let timerMode = 'pomodoro'; // 'pomodoro' or 'custom'
let lastActiveTime = null;
let tabSwitchPause = false;

// Timer Settings
const DEFAULT_SETTINGS = {
  focusTime: 25 * 60, // 25 minutes in seconds
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60, // 15 minutes
  sessions: 4,
  autoStartBreak: true,
  autoStartFocus: true,
  tabSwitchPause: true
};

// Initialize timer when analytics tab is loaded
document.querySelector('[data-tab="analytics-tab"]')?.addEventListener("click", function() {
  loadTimer();
  loadStudyStats();
});

// Load timer from storage
function loadTimer() {
  chrome.storage.local.get([
    'timerSettings', 
    'timerState', 
    'studyStats',
    'todayStudy',
    'weekStudy'
  ], (data) => {
    // Load settings
    const settings = data.timerSettings || DEFAULT_SETTINGS;
    
    // Update UI with settings
    document.getElementById('focus-time').value = Math.floor(settings.focusTime / 60);
    document.getElementById('short-break').value = Math.floor(settings.shortBreak / 60);
    document.getElementById('long-break').value = Math.floor(settings.longBreak / 60);
    document.getElementById('pomodoro-sessions').value = settings.sessions;
    
    // Load timer state if exists
    if (data.timerState) {
      const state = data.timerState;
      timerSeconds = state.seconds || 0;
      timerRunning = state.running || false;
      isBreakTime = state.isBreakTime || false;
      currentSession = state.currentSession || 1;
      completedSessions = state.completedSessions || 0;
      timerMode = state.mode || 'pomodoro';
      
      // Update UI based on mode
      if (timerMode === 'pomodoro') {
        document.getElementById('pomodoro-mode').checked = true;
        document.getElementById('pomodoro-settings').style.display = 'block';
        document.getElementById('custom-settings').style.display = 'none';
      } else {
        document.getElementById('custom-mode').checked = true;
        document.getElementById('pomodoro-settings').style.display = 'none';
        document.getElementById('custom-settings').style.display = 'block';
      }
      
      updateTimerDisplay();
      updateTimerControls();
      
      // Continue timer if it was running
      if (timerRunning) {
        startTimerInterval();
      }
    }
    
    // Load study stats
    if (data.studyStats) {
      totalStudyTime = data.studyStats.total || 0;
    }
    if (data.todayStudy) {
      todayStudyTime = data.todayStudy;
    }
    if (data.weekStudy) {
      weekStudyTime = data.weekStudy;
    }
    
    updateStudyStatsDisplay();
  });
}

// Timer mode switcher
document.getElementById('pomodoro-mode')?.addEventListener('change', function() {
  if (this.checked) {
    timerMode = 'pomodoro';
    document.getElementById('pomodoro-settings').style.display = 'block';
    document.getElementById('custom-settings').style.display = 'none';
    resetTimer();
    saveTimerState();
  }
});

document.getElementById('custom-mode')?.addEventListener('change', function() {
  if (this.checked) {
    timerMode = 'custom';
    document.getElementById('pomodoro-settings').style.display = 'none';
    document.getElementById('custom-settings').style.display = 'block';
    resetTimer();
    saveTimerState();
  }
});

// Timer controls
document.getElementById('start-timer')?.addEventListener('click', startTimer);
document.getElementById('pause-timer')?.addEventListener('click', pauseTimer);
document.getElementById('reset-timer')?.addEventListener('click', resetTimer);

// Start timer
function startTimer() {
  if (!timerRunning) {
    // If timer is at 0, set it based on mode
    if (timerSeconds === 0) {
      if (timerMode === 'pomodoro') {
        timerSeconds = isBreakTime ? getBreakTime() : getFocusTime();
      } else {
        const hours = parseInt(document.getElementById('custom-hours').value) || 0;
        const minutes = parseInt(document.getElementById('custom-minutes').value) || 0;
        const seconds = parseInt(document.getElementById('custom-seconds').value) || 0;
        timerSeconds = (hours * 3600) + (minutes * 60) + seconds;
      }
    }
    
    timerRunning = true;
    lastActiveTime = Date.now();
    startTimerInterval();
    updateTimerControls();
    updateTimerDisplay();
    saveTimerState();
    
    // Start monitoring tab switches
    if (DEFAULT_SETTINGS.tabSwitchPause) {
      startTabSwitchMonitoring();
    }
  }
}

// Pause timer
function pauseTimer() {
  if (timerRunning) {
    timerRunning = false;
    clearInterval(timerInterval);
    timerInterval = null;
    updateTimerControls();
    updateTimerDisplay();
    saveTimerState();
  }
}

// Reset timer
function resetTimer() {
  timerRunning = false;
  isBreakTime = false;
  currentSession = 1;
  completedSessions = 0;
  clearInterval(timerInterval);
  timerInterval = null;
  
  if (timerMode === 'pomodoro') {
    timerSeconds = getFocusTime();
  } else {
    timerSeconds = 0;
  }
  
  updateTimerControls();
  updateTimerDisplay();
  updateSessionProgress();
  saveTimerState();
}

// Start timer interval
function startTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
      
      // Track study time
      if (!isBreakTime && timerRunning) {
        totalStudyTime++;
        todayStudyTime++;
        weekStudyTime++;
        updateStudyStats();
      }
      
      // Check if timer finished
      if (timerSeconds === 0) {
        timerFinished();
      }
    }
  }, 1000);
}

// Timer finished handler
function timerFinished() {
  clearInterval(timerInterval);
  timerRunning = false;
  
  if (timerMode === 'pomodoro') {
    if (isBreakTime) {
      // Break finished, start next focus session
      isBreakTime = false;
      currentSession++;
      if (currentSession > DEFAULT_SETTINGS.sessions) {
        // All sessions completed
        showNotification("🎉 Pomodoro Complete!", "You've completed all sessions! Take a long break.");
        resetTimer();
        return;
      }
      timerSeconds = getFocusTime();
      showNotification("⏰ Break Over!", "Time to focus! Starting session " + currentSession);
    } else {
      // Focus session finished, start break
      isBreakTime = true;
      completedSessions++;
      timerSeconds = getBreakTime();
      showNotification("✅ Session Complete!", "Great work! Take a " + (completedSessions === DEFAULT_SETTINGS.sessions ? "long" : "short") + " break.");
    }
    
    updateSessionProgress();
    
    // Auto-start next session if enabled
    if ((isBreakTime && DEFAULT_SETTINGS.autoStartBreak) || (!isBreakTime && DEFAULT_SETTINGS.autoStartFocus)) {
      setTimeout(() => {
        startTimer();
      }, 1000);
    }
  } else {
    // Custom timer finished
    showNotification("⏰ Timer Complete!", "Your study session has finished!");
  }
  
  updateTimerControls();
  updateTimerDisplay();
  saveTimerState();
  
  // Play notification sound (optional)
  playNotificationSound();
}

// Get focus time in seconds
function getFocusTime() {
  const minutes = parseInt(document.getElementById('focus-time').value) || 25;
  return minutes * 60;
}

// Get break time in seconds
function getBreakTime() {
  if (completedSessions === DEFAULT_SETTINGS.sessions) {
    const minutes = parseInt(document.getElementById('long-break').value) || 15;
    return minutes * 60;
  } else {
    const minutes = parseInt(document.getElementById('short-break').value) || 5;
    return minutes * 60;
  }
}

// Update timer display
function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;
  
  document.getElementById('timer-hours').textContent = hours.toString().padStart(2, '0');
  document.getElementById('timer-minutes').textContent = minutes.toString().padStart(2, '0');
  document.getElementById('timer-seconds').textContent = seconds.toString().padStart(2, '0');
  
  // Update status
  const statusElement = document.getElementById('timer-status');
  if (timerRunning) {
    display.className = 'timer-display running';
    statusElement.textContent = isBreakTime ? 'Break' : 'Focus';
    statusElement.className = 'float-end badge bg-success';
  } else if (timerSeconds > 0) {
    display.className = 'timer-display paused';
    statusElement.textContent = 'Paused';
    statusElement.className = 'float-end badge bg-warning text-dark';
  } else {
    display.className = 'timer-display';
    statusElement.textContent = 'Stopped';
    statusElement.className = 'float-end badge bg-secondary';
  }
  
  if (isBreakTime && timerSeconds > 0) {
    display.classList.add('break');
  }
}

// Update timer controls
function updateTimerControls() {
  const startBtn = document.getElementById('start-timer');
  const pauseBtn = document.getElementById('pause-timer');
  const resetBtn = document.getElementById('reset-timer');
  
  if (timerRunning) {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
  } else if (timerSeconds > 0) {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = false;
  } else {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = false;
  }
}

// Update session progress
function updateSessionProgress() {
  // Create session indicators if not exists
  let sessionContainer = document.querySelector('.session-indicator');
  if (!sessionContainer) {
    sessionContainer = document.createElement('div');
    sessionContainer.className = 'session-indicator';
    document.querySelector('.pomodoro-progress')?.appendChild(sessionContainer);
  }
  
  sessionContainer.innerHTML = '';
  const totalSessions = DEFAULT_SETTINGS.sessions;
  
  for (let i = 1; i <= totalSessions; i++) {
    const dot = document.createElement('div');
    dot.className = 'session-dot';
    
    if (i < currentSession || (i === currentSession && isBreakTime)) {
      dot.classList.add('completed');
    } else if (i === currentSession) {
      dot.classList.add('current');
    }
    
    sessionContainer.appendChild(dot);
  }
}

// Update study stats
function updateStudyStats() {
  // Save stats every 30 seconds to avoid excessive storage writes
  if (totalStudyTime % 30 === 0) {
    chrome.storage.local.set({
      studyStats: { total: totalStudyTime },
      todayStudy: todayStudyTime,
      weekStudy: weekStudyTime,
      lastStudyUpdate: Date.now()
    });
  }
}

// Load study stats
function loadStudyStats() {
  chrome.storage.local.get(['studyStats', 'todayStudy', 'weekStudy'], (data) => {
    if (data.studyStats) {
      totalStudyTime = data.studyStats.total || 0;
    }
    if (data.todayStudy) {
      todayStudyTime = data.todayStudy;
    }
    if (data.weekStudy) {
      weekStudyTime = data.weekStudy;
    }
    updateStudyStatsDisplay();
  });
}

// Update study stats display
function updateStudyStatsDisplay() {
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
  document.getElementById('today-study').textContent = formatTime(todayStudyTime);
  document.getElementById('week-study').textContent = formatTime(weekStudyTime);
  document.getElementById('total-study').textContent = formatTime(totalStudyTime);
}

// Save timer state
function saveTimerState() {
  const timerState = {
    seconds: timerSeconds,
    running: timerRunning,
    isBreakTime: isBreakTime,
    currentSession: currentSession,
    completedSessions: completedSessions,
    mode: timerMode,
    lastUpdate: Date.now()
  };
  
  chrome.storage.local.set({
    timerState: timerState,
    timerSettings: {
      focusTime: getFocusTime(),
      shortBreak: parseInt(document.getElementById('short-break').value) * 60,
      longBreak: parseInt(document.getElementById('long-break').value) * 60,
      sessions: parseInt(document.getElementById('pomodoro-sessions').value),
      tabSwitchPause: DEFAULT_SETTINGS.tabSwitchPause
    }
  });
}

// Show notification
function showNotification(title, message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'timer-notification';
  notification.innerHTML = `
    <div class="d-flex align-items-start">
      <div class="flex-grow-1">
        <strong>${title}</strong>
        <div class="small">${message}</div>
      </div>
      <button class="btn-close btn-sm" onclick="this.parentElement.parentElement.remove()"></button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Play notification sound
function playNotificationSound() {
  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Audio notification not available');
  }
}

// Tab switch monitoring for auto-pause
function startTabSwitchMonitoring() {
  chrome.tabs.onActivated.addListener(handleTabSwitch);
  chrome.windows.onFocusChanged.addListener(handleWindowFocusChange);
}

function handleTabSwitch(activeInfo) {
  if (timerRunning && !tabSwitchPause) {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (!tab.url.includes('youtube.com/watch')) {
        pauseTimer();
        tabSwitchPause = true;
        showNotification("⏸️ Timer Paused", "Timer paused because you switched away from YouTube");
      }
    });
  }
}

function handleWindowFocusChange(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus
    if (timerRunning && !tabSwitchPause) {
      pauseTimer();
      tabSwitchPause = true;
      showNotification("⏸️ Timer Paused", "Timer paused because you switched windows");
    }
  } else {
    // Window gained focus
    tabSwitchPause = false;
  }
}

// Clean up event listeners when popup closes
window.addEventListener('unload', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  chrome.tabs.onActivated.removeListener(handleTabSwitch);
  chrome.windows.onFocusChanged.removeListener(handleWindowFocusChange);
});

// Initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.local.get(['timerSettings'], (data) => {
    if (data.timerSettings) {
      Object.assign(DEFAULT_SETTINGS, data.timerSettings);
    }
  });
});

// ====================== END STUDY TIMER ======================


function calculateLearningStats(events, quizHistory, videoHistory) {
  // Total study time (estimated)
  let totalStudyTime = 0;
  if (events.length > 0) {
    const timeEvents = events.filter(e => e.time).map(e => e.time);
    const maxTime = Math.max(...timeEvents);
    totalStudyTime = Math.floor(maxTime / 60); // Convert seconds to minutes
  }
  
  // Unique videos watched
  const uniqueVideos = new Set();
  events.forEach(e => {
    if (e.videoId) uniqueVideos.add(e.videoId);
  });
  const videosWatched = Math.max(uniqueVideos.size, videoHistory.length);
  
  // Confusion score
  const confusionEvents = events.filter(e => 
    e.event === "Rewind" || e.event === "Pause" || e.event === "Forward"
  ).length;
  const confusionScore = events.length > 0 ? 
    Math.min(100, Math.round((confusionEvents / events.length) * 100)) : 0;
  
  // Quiz performance
  let quizPerformance = 0;
  if (quizHistory.length > 0) {
    const totalScore = quizHistory.reduce((sum, quiz) => sum + (quiz.score || 0), 0);
    quizPerformance = Math.round(totalScore / quizHistory.length);
  }
  
  // Learning streak
  const today = new Date().toDateString();
  const activityDates = events
    .map(e => new Date(e.timestamp || Date.now()).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index);
  
  const streak = calculateStreak(activityDates, today);
  
  // Most active hour
  const hourCounts = {};
  events.forEach(e => {
    const hour = new Date(e.timestamp || Date.now()).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  let mostActiveHour = "Not enough data";
  if (Object.keys(hourCounts).length > 0) {
    const [maxHour] = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    mostActiveHour = `${maxHour}:00`;
  }
  
  return {
    totalStudyTime: Math.max(totalStudyTime, 0),
    videosWatched: Math.max(videosWatched, 0),
    confusionScore,
    quizPerformance,
    streak: Math.max(streak, 0),
    mostActiveHour,
    totalEvents: events.length,
    totalQuizzes: quizHistory.length
  };
}

function calculateStreak(activityDates, today) {
  if (activityDates.length === 0) return 0;
  
  // Sort dates descending
  const sortedDates = [...new Set(activityDates)].sort((a, b) => 
    new Date(b) - new Date(a)
  );
  
  // If today is in the dates, start from today
  let currentDate = new Date(today);
  let streak = 0;
  
  // Check consecutive days
  for (const dateStr of sortedDates) {
    const date = new Date(dateStr);
    const diffTime = currentDate - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function updateAnalyticsDashboard(stats, events, quizHistory) {
  const statsContainer = document.getElementById("analytics-stats");
  if (!statsContainer) return;
  
  statsContainer.innerHTML = `
    <div class="stat-card total-time">
      <div class="stat-number">${stats.totalStudyTime}<small>m</small></div>
      <div class="stat-label">Study Time</div>
    </div>
    
    <div class="stat-card videos-watched">
      <div class="stat-number">${stats.videosWatched}</div>
      <div class="stat-label">Videos Watched</div>
    </div>
    
    <div class="stat-card confusion-score">
      <div class="stat-number">${stats.confusionScore}%</div>
      <div class="stat-label">Confusion Score</div>
    </div>
    
    <div class="stat-card quiz-performance">
      <div class="stat-number">${stats.quizPerformance}%</div>
      <div class="stat-label">Quiz Performance</div>
    </div>
    
    <div class="stat-card" style="background: linear-gradient(135deg, #9d4edd, #5a189a);">
      <div class="stat-number">${stats.streak}</div>
      <div class="stat-label">Day Streak</div>
    </div>
    
    <div class="stat-card" style="background: linear-gradient(135deg, #00b4d8, #0077b6);">
      <div class="stat-number">${stats.totalQuizzes}</div>
      <div class="stat-label">Quizzes Taken</div>
    </div>
  `;
  
  // Create trend chart
  createLearningTrendChart(events, quizHistory);
}

function createLearningTrendChart(events, quizHistory) {
  const canvas = document.getElementById("learning-trend-chart");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  
  // Destroy existing chart
  if (window.learningTrendChart) {
    window.learningTrendChart.destroy();
  }
  
  // Prepare data for last 7 days
  const dates = [];
  const activityData = [];
  const quizData = [];
  
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dates.push(dateStr);
    
    // Count events for this date
    const dayEvents = events.filter(e => {
      const eventDate = new Date(e.timestamp || Date.now()).toDateString();
      return eventDate === date.toDateString();
    });
    activityData.push(dayEvents.length);
    
    // Average quiz score for this date
    const dayQuizzes = quizHistory.filter(q => {
      if (!q.date) return false;
      const quizDate = new Date(q.date).toDateString();
      return quizDate === date.toDateString();
    });
    
    if (dayQuizzes.length > 0) {
      const avgScore = dayQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / dayQuizzes.length;
      quizData.push(Math.round(avgScore));
    } else {
      quizData.push(0);
    }
  }
  
  // Create chart
  window.learningTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Learning Activity',
          data: activityData,
          borderColor: '#4361ee',
          backgroundColor: 'rgba(67, 97, 238, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#4361ee',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        },
        {
          label: 'Quiz Score %',
          data: quizData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#4CAF50',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              size: 11
            },
            boxWidth: 12,
            padding: 10
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          titleFont: { size: 12 },
          bodyFont: { size: 11 },
          padding: 10
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 10
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 10
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        }
      }
    }
  });
}

function generateLearningInsights(stats, events, quizHistory) {
  const insightsContainer = document.getElementById("analytics-insights");
  if (!insightsContainer) return;
  
  insightsContainer.innerHTML = '<h6 class="mb-3" style="font-size: 14px; color: #2c3e50;">📈 Learning Insights</h6>';
  
  const insights = [];
  
  // Check for activity
  if (events.length === 0) {
    insights.push({
      type: 'info',
      text: 'Start watching educational videos to track your learning journey!',
      icon: '🚀'
    });
  } else {
    // Study time insight
    if (stats.totalStudyTime >= 30) {
      insights.push({
        type: 'good',
        text: `Great dedication! You've studied for ${stats.totalStudyTime} minutes.`,
        icon: '⏰'
      });
    } else if (stats.totalStudyTime > 0) {
      insights.push({
        type: 'info',
        text: `You've started with ${stats.totalStudyTime} minutes of learning. Keep going!`,
        icon: '🎯'
      });
    }
    
    // Videos watched insight
    if (stats.videosWatched >= 3) {
      insights.push({
        type: 'good',
        text: `You've watched ${stats.videosWatched} educational videos!`,
        icon: '🎬'
      });
    }
    
    // Confusion insight
    if (stats.confusionScore > 40) {
      insights.push({
        type: 'warning',
        text: `High confusion detected (${stats.confusionScore}%). Review confusing sections for better retention.`,
        icon: '🤔'
      });
    } else if (stats.confusionScore > 20) {
      insights.push({
        type: 'info',
        text: `You're challenging yourself! Moderate confusion (${stats.confusionScore}%) indicates active learning.`,
        icon: '💡'
      });
    }
    
    // Quiz performance insight
    if (stats.quizPerformance >= 80 && stats.totalQuizzes > 0) {
      insights.push({
        type: 'good',
        text: `Excellent! Average quiz score: ${stats.quizPerformance}%`,
        icon: '🎉'
      });
    } else if (stats.quizPerformance >= 60 && stats.totalQuizzes > 0) {
      insights.push({
        type: 'info',
        text: `Good progress! Quiz average: ${stats.quizPerformance}%`,
        icon: '📚'
      });
    } else if (stats.totalQuizzes === 0) {
      insights.push({
        type: 'info',
        text: 'Try taking quizzes to test your understanding!',
        icon: '❓'
      });
    }
    
    // Streak insight
    if (stats.streak >= 3) {
      insights.push({
        type: 'good',
        text: `🔥 ${stats.streak}-day learning streak! Consistency leads to mastery.`,
        icon: '🔥'
      });
    } else if (stats.streak > 0) {
      insights.push({
        type: 'info',
        text: `You're on a ${stats.streak}-day streak. Come back tomorrow to keep it going!`,
        icon: '📅'
      });
    }
  }
  
  // Limit to 3 insights
  const displayInsights = insights.slice(0, 3);
  
  if (displayInsights.length === 0) {
    const emptyInsight = document.createElement('div');
    emptyInsight.className = 'insight-card info';
    emptyInsight.innerHTML = `
      <span class="insight-icon">📊</span>
      Start learning to see personalized insights here!
    `;
    insightsContainer.appendChild(emptyInsight);
  } else {
    displayInsights.forEach(insight => {
      const insightElement = document.createElement('div');
      insightElement.className = `insight-card ${insight.type}`;
      insightElement.innerHTML = `
        <span class="insight-icon">${insight.icon}</span>
        ${insight.text}
      `;
      insightsContainer.appendChild(insightElement);
    });
  }
}

// Initialize analytics data storage if needed
chrome.storage.local.get(["quizHistory", "videoHistory"], (data) => {
  if (!data.quizHistory) {
    chrome.storage.local.set({ quizHistory: [] });
  }
  if (!data.videoHistory) {
    chrome.storage.local.set({ videoHistory: [] });
  }
});

// ====================== AI SUMMARY GENERATOR ======================

// Add CSS for summary tab
const summaryStyle = document.createElement('style');
summaryStyle.textContent = `
  .summary-content {
    font-size: 14px;
    line-height: 1.6;
    color: #333;
  }
  
  .takeaway-item {
    background: #f0f9ff;
    border-left: 4px solid #2196F3;
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 6px;
    display: flex;
    align-items: flex-start;
  }
  
  .takeaway-number {
    background: #2196F3;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    margin-right: 12px;
    flex-shrink: 0;
  }
  
  .takeaway-text {
    flex: 1;
  }
  
  .concept-item {
    display: inline-block;
    background: #e8f5e9;
    color: #2e7d32;
    padding: 6px 12px;
    margin: 4px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .concept-item:hover {
    background: #c8e6c9;
    transform: translateY(-1px);
  }
  
  .tldr-content {
    background: #fffde7;
    border: 1px solid #ffecb3;
    border-radius: 8px;
    padding: 15px;
    font-style: italic;
  }
  
  .detailed-summary {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
  }
  
  .summary-section {
    margin-bottom: 15px;
  }
  
  .summary-section h6 {
    color: #4361ee;
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 13px;
  }
  
  .summary-bullet {
    color: #4361ee;
    margin-right: 8px;
  }
  
  .saved-summary-item {
    padding: 12px 15px;
    border-bottom: 1px solid #f0f0f0;
    transition: all 0.2s;
    cursor: pointer;
  }
  
  .saved-summary-item:hover {
    background: #f8f9fa;
  }
  
  .saved-summary-title {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 4px;
    font-size: 13px;
  }
  
  .saved-summary-date {
    font-size: 11px;
    color: #6c757d;
  }
  
  .saved-summary-actions {
    margin-top: 8px;
  }
  
  #summary-tab .card {
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
  }
  
  #summary-tab .card-header {
    font-weight: 600;
    font-size: 14px;
  }
  
  #generate-summary {
    background: linear-gradient(135deg, #00bcd4, #0097a7);
    border: none;
    font-weight: 600;
    transition: all 0.3s;
  }
  
  #generate-summary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
  }
  
  #generate-summary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .summary-loading {
    text-align: center;
    padding: 30px;
  }
  
  .summary-loading .spinner-border {
    width: 2rem;
    height: 2rem;
  }
`;
document.head.appendChild(summaryStyle);

// Summary Generator Variables
const generateSummaryBtn = document.getElementById("generate-summary");
const summaryTypeSelect = document.getElementById("summary-type");
const summaryStatus = document.getElementById("summary-status");
const summaryResults = document.getElementById("summary-results");
const summaryContent = document.getElementById("summary-content");
const summaryTitle = document.getElementById("summary-title");
const copySummaryBtn = document.getElementById("copy-summary");
const saveSummaryBtn = document.getElementById("save-summary");
const savedSummariesContainer = document.getElementById("saved-summaries");
const savedSummariesList = document.getElementById("saved-summaries-list");

// Summary Tab Handler
document.querySelector('[data-tab="summary-tab"]')?.addEventListener("click", () => {
  loadSavedSummaries();
});

// Load saved summaries from storage
async function loadSavedSummaries() {
  try {
    const data = await chrome.storage.local.get(["savedSummaries"]);
    const savedSummaries = data.savedSummaries || [];
    
    if (savedSummaries.length === 0) {
      savedSummariesContainer.style.display = 'none';
      return;
    }
    
    // Sort by date (newest first)
    savedSummaries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    savedSummariesList.innerHTML = '';
    
    // Display up to 5 recent summaries
    savedSummaries.slice(0, 5).forEach((summary, index) => {
      const item = document.createElement('li');
      item.className = 'saved-summary-item';
      
      const date = new Date(summary.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      item.innerHTML = `
        <div class="saved-summary-title">
          <i class="fas fa-video me-1"></i>
          ${summary.videoTitle || 'YouTube Video'} - ${summary.typeName}
        </div>
        <div class="saved-summary-date">
          <i class="far fa-clock me-1"></i>${date}
        </div>
        <div class="saved-summary-actions">
          <button class="btn btn-sm btn-outline-primary btn-view-summary" data-index="${index}">
            <i class="fas fa-eye me-1"></i>View
          </button>
          <button class="btn btn-sm btn-outline-danger btn-delete-summary ms-2" data-index="${index}">
            <i class="fas fa-trash me-1"></i>Delete
          </button>
        </div>
      `;
      
      savedSummariesList.appendChild(item);
    });
    
    savedSummariesContainer.style.display = 'block';
    
    // Add event listeners to buttons
    document.querySelectorAll('.btn-view-summary').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = e.target.closest('.btn-view-summary').dataset.index;
        viewSavedSummary(savedSummaries[index]);
      });
    });
    
    document.querySelectorAll('.btn-delete-summary').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = e.target.closest('.btn-delete-summary').dataset.index;
        deleteSavedSummary(index);
      });
    });
    
  } catch (error) {
    console.error('Error loading saved summaries:', error);
    savedSummariesContainer.style.display = 'none';
  }
}

// View saved summary
function viewSavedSummary(summary) {
  summaryResults.style.display = 'block';
  summaryTitle.textContent = `${summary.videoTitle || 'Video'} - ${summary.typeName}`;
  
  // Display the summary content
  displaySummaryContent(summary.type, summary.content);
  
  // Scroll to results
  summaryResults.scrollIntoView({ behavior: 'smooth' });
}

// Delete saved summary
async function deleteSavedSummary(index) {
  try {
    const data = await chrome.storage.local.get(["savedSummaries"]);
    let savedSummaries = data.savedSummaries || [];
    
    savedSummaries.splice(index, 1);
    
    await chrome.storage.local.set({ savedSummaries });
    
    // Reload the list
    loadSavedSummaries();
    
    // Show success message
    summaryStatus.innerHTML = `
      <span class="text-success">
        <i class="fas fa-check-circle me-1"></i>
        Summary deleted successfully
      </span>
    `;
    
    setTimeout(() => {
      summaryStatus.textContent = 'Ready to summarize the current video';
    }, 3000);
    
  } catch (error) {
    console.error('Error deleting summary:', error);
    summaryStatus.innerHTML = `
      <span class="text-danger">
        <i class="fas fa-exclamation-circle me-1"></i>
        Failed to delete summary
      </span>
    `;
  }
}

// Generate AI Summary
generateSummaryBtn.addEventListener("click", async () => {
  try {
    // Check if API key is set
    if (!geminiApiKey) {
      summaryStatus.innerHTML = `
        <span class="text-danger">
          <i class="fas fa-exclamation-circle me-1"></i>
          Please save your Gemini API key in the Quiz tab first
        </span>
      `;
      return;
    }

    generateSummaryBtn.disabled = true;
    summaryResults.style.display = 'none';
    summaryStatus.innerHTML = `
      <div class="summary-loading">
        <div class="spinner-border text-info" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">AI is analyzing the transcript...</p>
      </div>
    `;

    // Extract transcript
    const transcript = await extractYouTubeTranscript();
    
    if (!transcript || transcript.length < 200) {
      throw new Error('Transcript too short or not found');
    }

    const summaryType = summaryTypeSelect.value;
    const summary = await generateAISummary(transcript, summaryType, geminiApiKey);
    
    // Display the summary
    displaySummaryContent(summaryType, summary.content);
    summaryTitle.textContent = `Video Summary - ${summary.typeName}`;
    summaryResults.style.display = 'block';
    
    // Store video info for saving
    const videoInfo = await getCurrentVideoInfo();
    
    // Enable save button with data
    saveSummaryBtn.dataset.summaryData = JSON.stringify({
      type: summaryType,
      typeName: summary.typeName,
      content: summary.content,
      videoId: videoInfo.videoId,
      videoTitle: videoInfo.videoTitle,
      transcriptLength: transcript.length,
      date: new Date().toISOString()
    });
    
    summaryStatus.innerHTML = `
      <span class="text-success">
        <i class="fas fa-check-circle me-1"></i>
        Summary generated successfully!
      </span>
    `;
    
    // Scroll to results
    summaryResults.scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    console.error('Summary generation error:', error);
    summaryStatus.innerHTML = `
      <span class="text-danger">
        <i class="fas fa-exclamation-circle me-1"></i>
        ${error.message}
      </span>
    `;
  } finally {
    generateSummaryBtn.disabled = false;
  }
});

// Generate AI Summary using Gemini
async function generateAISummary(transcript, summaryType, apiKey) {
  console.log('🤖 Generating AI summary type:', summaryType);
  
  // Limit transcript length to avoid token limits
  const limitedTranscript = transcript.substring(0, 6000);
  console.log(`📊 Using ${limitedTranscript.length} chars of transcript for summary`);
  
  // Define improved prompts
  const prompts = {
    'key-takeaways': `Analyze this YouTube video transcript and extract the 3 most important key takeaways.

TRANSCRIPT:
${limitedTranscript}

INSTRUCTIONS:
1. Read the transcript carefully
2. Identify the 3 most important points
3. Each takeaway should be:
   - Clear and concise (1-2 sentences max)
   - Actionable or insightful
   - Based on core content, not minor details
   - Useful for someone who wants to remember the video

FORMAT:
1. [First key takeaway]
2. [Second key takeaway] 
3. [Third key takeaway]

Make sure takeaways are actually from the transcript content.

Return only the 3 numbered takeaways.`,
    
    'tldr': `Create a concise TL;DR summary of this YouTube video transcript.

TRANSCRIPT:
${limitedTranscript}

INSTRUCTIONS:
1. Read the transcript
2. Create a single paragraph summary
3. Maximum 150 words
4. Capture the main message and key points
5. Make it engaging and easy to understand
6. Start with "TL;DR:"

EXAMPLE:
TL;DR: [Brief summary of main points]

Return only the TL;DR summary.`,
    
    'concepts': `Extract the key concepts from this YouTube video transcript.

TRANSCRIPT:
${limitedTranscript}

INSTRUCTIONS:
1. Read the transcript
2. Identify 8-12 key concepts mentioned
3. Concepts should be:
   - Single words or short phrases
   - Important to understanding the content
   - Actually mentioned in the transcript
4. Format as bullet points
5. Order by importance/frequency

FORMAT:
• [Concept 1]
• [Concept 2]
• [Concept 3]
...

Return only the bullet list of concepts.`,
    
    'detailed': `Create a structured summary of this YouTube video transcript.

TRANSCRIPT:
${limitedTranscript}

INSTRUCTIONS:
1. Create a comprehensive but concise summary with these sections:
   - MAIN TOPIC: What is the video primarily about?
   - KEY POINTS: 3-5 main arguments or findings
   - EVIDENCE/EXAMPLES: Important examples mentioned
   - CONCLUSION: Main conclusion or takeaway
2. Use clear headings
3. Use bullet points under each section
4. Keep it informative but not too long

FORMAT:
MAIN TOPIC: [Brief description]

KEY POINTS:
• [Point 1]
• [Point 2]

EVIDENCE/EXAMPLES:
• [Example 1]

CONCLUSION:
[Final takeaway]

Return only the structured summary.`
  };

  const typeNames = {
    'key-takeaways': '3 Key Takeaways',
    'tldr': 'TL;DR Version',
    'concepts': 'Key Concepts',
    'detailed': 'Detailed Summary'
  };

  const prompt = prompts[summaryType];
  
  if (!prompt) {
    throw new Error('Invalid summary type');
  }

  try {
    console.log('📤 Sending request to Gemini API...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
            topP: 0.95,
            topK: 40
          }
        })
      }
    );

    console.log(`📥 API Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      
      // Try alternative endpoint
      console.log('🔄 Trying alternative endpoint...');
      const altResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1500
            }
          })
        }
      );
      
      if (!altResponse.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const altData = await altResponse.json();
      const responseText = altData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return formatSummaryResponse(summaryType, responseText, typeNames);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return formatSummaryResponse(summaryType, responseText, typeNames);
    
  } catch (error) {
    console.error('AI Summary API error:', error);
    // Fallback to basic summary
    return generateFallbackSummary(transcript, summaryType, typeNames);
  }
}

function formatSummaryResponse(summaryType, responseText, typeNames) {
  if (!responseText.trim()) {
    throw new Error('Empty response from AI');
  }
  
  console.log(`✅ Received ${responseText.length} char response for ${summaryType}`);
  
  return {
    type: summaryType,
    typeName: typeNames[summaryType],
    content: responseText.trim()
  };
}

// IMPROVED FALLBACK SUMMARY GENERATOR
function generateFallbackSummary(transcript, summaryType, typeNames) {
  console.log('🔄 Using enhanced fallback summary generator');
  
  // Clean and split transcript
  const sentences = transcript
    .replace(/\s+/g, ' ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.split(' ').length > 4)
    .filter(s => !s.toLowerCase().match(/subscribe|like|comment|share|channel/));
  
  console.log(`📊 Found ${sentences.length} meaningful sentences`);
  
  if (sentences.length < 3) {
    throw new Error(`Insufficient transcript content (only ${sentences.length} meaningful sentences)`);
  }
  
  let content = '';
  
  switch(summaryType) {
    case 'key-takeaways':
      const importantSentences = sentences.filter(s => 
        s.length > 40 && 
        !s.startsWith('and ') && 
        !s.startsWith('but ') && 
        !s.startsWith('so ')
      );
      
      const takeaways = importantSentences.slice(0, 3).map((sentence, i) => {
        // Clean up the sentence
        let clean = sentence.replace(/^\d+[\.\)]\s*/, '');
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);
        if (!clean.endsWith('.')) clean += '.';
        return `${i + 1}. ${clean}`;
      });
      
      content = takeaways.join('\n');
      break;
      
    case 'tldr':
      const mainSentences = sentences.slice(0, 3);
      const summaryText = mainSentences.join(' ').substring(0, 250);
      content = `TL;DR: ${summaryText}${summaryText.length >= 250 ? '...' : ''}`;
      break;
      
    case 'concepts':
      // Extract key words
      const words = transcript.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 5 && w.length < 15)
        .filter(w => !['about', 'which', 'their', 'there', 'these', 'those'].includes(w));
      
      const wordCount = {};
      words.forEach(w => wordCount[w] = (wordCount[w] || 0) + 1);
      
      const topConcepts = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
      
      content = topConcepts.map(concept => `• ${concept}`).join('\n');
      break;
      
    case 'detailed':
      const firstHalf = sentences.slice(0, Math.floor(sentences.length/2));
      const secondHalf = sentences.slice(Math.floor(sentences.length/2));
      
      content = `MAIN TOPIC: ${sentences[0] || 'Content analysis'}

KEY POINTS:
• ${firstHalf[1] || 'First key point'}
• ${firstHalf[2] || 'Second key point'}
• ${firstHalf[3] || 'Third key point'}

EVIDENCE/EXAMPLES:
• ${secondHalf[0] || 'Example mentioned'}
• ${secondHalf[1] || 'Another example'}

CONCLUSION:
${sentences[sentences.length-1] || 'Important summary point'}`;
      break;
      
    default:
      content = `Summary: ${sentences.slice(0, 3).join(' ')}...`;
  }
  
  return {
    type: summaryType,
    typeName: typeNames[summaryType] || 'Summary',
    content: content.trim()
  };
}

// Display summary content based on type
function displaySummaryContent(type, content) {
  let html = '';
  
  switch(type) {
    case 'key-takeaways':
      const takeaways = content.split(/\n+/).filter(line => line.trim());
      html = takeaways.map((takeaway, index) => `
        <div class="takeaway-item">
          <div class="takeaway-number">${index + 1}</div>
          <div class="takeaway-text">${takeaway.replace(/^\d+[\.\)]\s*/, '')}</div>
        </div>
      `).join('');
      break;
      
    case 'tldr':
      html = `
        <div class="tldr-content">
          <p>${content}</p>
        </div>
      `;
      break;
      
    case 'concepts':
      const concepts = content.split(/\n+/).filter(line => line.trim());
      html = concepts.map(concept => `
        <span class="concept-item">${concept.replace(/^[•\-]\s*/, '')}</span>
      `).join('');
      break;
      
    case 'detailed':
      const sections = content.split(/\n\s*\n/);
      html = sections.map(section => {
        const lines = section.split('\n').filter(line => line.trim());
        const title = lines[0].replace(/^[A-Z\s]+:\s*/, '');
        const isHeading = section.match(/^[A-Z\s]+:/);
        
        if (isHeading) {
          return `
            <div class="summary-section">
              <h6>${lines[0]}</h6>
              ${lines.slice(1).map(line => `
                <p class="mb-2">
                  <span class="summary-bullet">•</span>
                  ${line.replace(/^[•\-]\s*/, '')}
                </p>
              `).join('')}
            </div>
          `;
        } else {
          return `<div class="summary-section"><p>${section}</p></div>`;
        }
      }).join('');
      break;
      
    default:
      html = `<div class="detailed-summary"><p>${content}</p></div>`;
  }
  
  summaryContent.innerHTML = html;
}

// Get current video info
async function getCurrentVideoInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('youtube.com/watch')) {
      return { videoId: null, videoTitle: 'Current Video' };
    }
    
    // Extract video ID from URL
    const urlParams = new URLSearchParams(new URL(tab.url).search);
    const videoId = urlParams.get('v');
    
    // Try to get video title from tab
    const videoTitle = tab.title.replace(' - YouTube', '');
    
    return {
      videoId,
      videoTitle: videoTitle || 'YouTube Video'
    };
    
  } catch (error) {
    console.error('Error getting video info:', error);
    return { videoId: null, videoTitle: 'YouTube Video' };
  }
}

// Copy summary to clipboard
copySummaryBtn.addEventListener('click', async () => {
  try {
    const textToCopy = summaryContent.innerText || summaryContent.textContent;
    
    await navigator.clipboard.writeText(textToCopy);
    
    // Show feedback
    const originalText = copySummaryBtn.innerHTML;
    copySummaryBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
    copySummaryBtn.classList.remove('btn-outline-primary');
    copySummaryBtn.classList.add('btn-success');
    
    setTimeout(() => {
      copySummaryBtn.innerHTML = originalText;
      copySummaryBtn.classList.remove('btn-success');
      copySummaryBtn.classList.add('btn-outline-primary');
    }, 2000);
    
  } catch (error) {
    console.error('Copy failed:', error);
    copySummaryBtn.innerHTML = '<i class="fas fa-times me-1"></i>Failed';
    copySummaryBtn.classList.remove('btn-outline-primary');
    copySummaryBtn.classList.add('btn-danger');
    
    setTimeout(() => {
      copySummaryBtn.innerHTML = '<i class="fas fa-copy me-1"></i>Copy';
      copySummaryBtn.classList.remove('btn-danger');
      copySummaryBtn.classList.add('btn-outline-primary');
    }, 2000);
  }
});

// Save summary to storage
saveSummaryBtn.addEventListener('click', async () => {
  try {
    const summaryData = JSON.parse(saveSummaryBtn.dataset.summaryData);
    
    if (!summaryData) {
      throw new Error('No summary data to save');
    }
    
    const data = await chrome.storage.local.get(["savedSummaries"]);
    const savedSummaries = data.savedSummaries || [];
    
    // Add new summary
    savedSummaries.push(summaryData);
    
    // Keep only last 20 summaries
    const updatedSummaries = savedSummaries.slice(-20);
    
    await chrome.storage.local.set({ savedSummaries: updatedSummaries });
    
    // Show success feedback
    const originalText = saveSummaryBtn.innerHTML;
    saveSummaryBtn.innerHTML = '<i class="fas fa-check me-1"></i>Saved!';
    saveSummaryBtn.classList.remove('btn-outline-success');
    saveSummaryBtn.classList.add('btn-success');
    
    setTimeout(() => {
      saveSummaryBtn.innerHTML = originalText;
      saveSummaryBtn.classList.remove('btn-success');
      saveSummaryBtn.classList.add('btn-outline-success');
    }, 2000);
    
    // Reload saved summaries list
    loadSavedSummaries();
    
  } catch (error) {
    console.error('Save failed:', error);
    saveSummaryBtn.innerHTML = '<i class="fas fa-times me-1"></i>Failed';
    saveSummaryBtn.classList.remove('btn-outline-success');
    saveSummaryBtn.classList.add('btn-danger');
    
    setTimeout(() => {
      saveSummaryBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save';
      saveSummaryBtn.classList.remove('btn-danger');
      saveSummaryBtn.classList.add('btn-outline-success');
    }, 2000);
  }
});

  // ====================== TRANSCRIPT SECTION ======================
  const transcriptDisplay = document.getElementById("transcript-display");
  const transcriptText = document.getElementById("transcript-text");
  const transcriptLength = document.getElementById("transcript-length");
  const revisionList = document.getElementById("revision-list");

  // Display transcript function
  function displayTranscriptSection(transcript) {
    if (!transcript || transcript.length < 100) {
      if (transcriptDisplay) transcriptDisplay.style.display = 'none';
      return;
    }

    if (transcriptDisplay) {
      transcriptDisplay.style.display = 'block';
      if (transcriptText) transcriptText.textContent = transcript;
      if (transcriptLength) transcriptLength.textContent = `${transcript.length} characters`;
    }
  }

  // Load revision suggestions
  function loadRevisionSuggestions(transcript) {
    if (!revisionList || !transcript) return;

    revisionList.innerHTML = "";
    
    // Extract keywords from transcript
    const words = transcript.toLowerCase().split(/\s+/);
    const freq = {};
    const STOP_WORDS = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'or', 'to', 'in', 'for', 'of', 'as', 'by', 'be', 'are', 'been', 'was', 'were', 'that', 'this', 'it']);
    
    words.forEach(w => {
      const clean = w.replace(/[^\w]/g, '');
      if (clean.length > 4 && !STOP_WORDS.has(clean)) {
        freq[clean] = (freq[clean] || 0) + 1;
      }
    });

    const topKeywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    if (topKeywords.length === 0) {
      revisionList.innerHTML = "<li>No revision suggestions yet.</li>";
      return;
    }

    topKeywords.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `"${item.word}" — mentioned ${item.count} time(s), important concept to review`;
      revisionList.appendChild(li);
    });
  }

  // ====================== QUIZ SECTION ======================
  const generateQuizBtn = document.getElementById("generate-quiz");
  const quizContent = document.getElementById("quiz-content");
  const quizStatus = document.getElementById("quiz-status");
  const quizResults = document.getElementById("quiz-results");
  const questionCountSelect = document.getElementById("question-count");
  const geminiApiKeyInput = document.getElementById("gemini-api-key");
  const saveGeminiKeyBtn = document.getElementById("save-gemini-key");
  const geminiKeyStatus = document.getElementById("gemini-key-status");

  let currentQuiz = null;
  let userAnswers = {};
  let geminiApiKey = '';
  let currentTranscript = '';

  // Save Gemini API key
  saveGeminiKeyBtn.addEventListener('click', () => {
    const apiKey = geminiApiKeyInput.value.trim();
    
    if (!apiKey) {
      geminiKeyStatus.innerHTML = '<span class="text-danger">❌ Please enter an API key</span>';
      return;
    }
    
    if (!apiKey.startsWith('AIza')) {
      geminiKeyStatus.innerHTML = '<span class="text-danger">❌ Invalid Google AI key format</span>';
      return;
    }
    
    geminiApiKey = apiKey;
    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
      geminiKeyStatus.innerHTML = '<span class="text-success">✅ Gemini API Key saved</span>';
    });
  });

  // Load Gemini API key from storage
  function loadGeminiKey() {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        geminiApiKey = result.geminiApiKey;
        geminiApiKeyInput.value = result.geminiApiKey;
        geminiKeyStatus.innerHTML = '<span class="text-success">✅ Gemini API Key loaded</span>';
      }
    });
  }

  loadGeminiKey();

  // Extract transcript from YouTube
  // This should replace your existing extractYouTubeTranscript function
async function extractYouTubeTranscript() {
  try {
    console.log('📝 Starting transcript extraction for summary...');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('youtube.com/watch')) {
      throw new Error('Please navigate to a YouTube video page');
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        return new Promise((resolve) => {
          console.log('🔍 Starting enhanced transcript extraction...');
          
          // Function to find and open transcript
          function findAndOpenTranscript() {
            console.log('🔍 Looking for transcript...');
            
            // Check if transcript is already open
            const existingSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
            if (existingSegments.length > 0) {
              console.log(`✅ Found ${existingSegments.length} existing transcript segments`);
              return extractTranscriptText();
            }
            
            // Try multiple selectors for transcript button
            const transcriptSelectors = [
              'button[aria-label*="transcript" i]',
              'button[aria-label*="show transcript" i]',
              'ytd-button-renderer[aria-label*="transcript" i]',
              '#actions button',
              '#primary-button button',
              '.ytd-menu-renderer button'
            ];
            
            for (const selector of transcriptSelectors) {
              const elements = document.querySelectorAll(selector);
              for (const element of elements) {
                const label = element.getAttribute('aria-label') || element.textContent || '';
                if (label.toLowerCase().includes('transcript') && element.offsetParent !== null) {
                  console.log(`✅ Found transcript button: ${label}`);
                  element.click();
                  return true;
                }
              }
            }
            
            // Try the more actions menu
            const moreActions = document.querySelector('button[aria-label*="more actions" i]');
            if (moreActions) {
              console.log('🔍 Opening more actions menu...');
              moreActions.click();
              
              setTimeout(() => {
                const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, ytd-menu-navigation-item-renderer');
                for (const item of menuItems) {
                  const text = item.textContent || '';
                  if (text.toLowerCase().includes('transcript')) {
                    console.log('✅ Found transcript in menu, clicking...');
                    item.click();
                    return true;
                  }
                }
              }, 500);
            }
            
            return false;
          }
          
          // Function to extract transcript text
          function extractTranscriptText() {
            console.log('📄 Extracting transcript text...');
            
            // Method 1: YouTube's transcript segments
            const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
            console.log(`Found ${segments.length} transcript segments`);
            
            if (segments.length > 0) {
              const transcriptText = Array.from(segments).map(segment => {
                const textElement = segment.querySelector('yt-formatted-string, #text, .segment-text');
                return textElement ? textElement.textContent.trim() : '';
              }).filter(text => text.length > 0).join(' ');
              
              console.log(`✅ Extracted ${transcriptText.length} characters from segments`);
              return transcriptText;
            }
            
            // Method 2: Alternative selector for transcript content
            const transcriptContainer = document.querySelector('ytd-transcript-body-renderer, [role="document"], #content-text');
            if (transcriptContainer) {
              const text = transcriptContainer.textContent || '';
              if (text.length > 100) {
                console.log(`✅ Extracted ${text.length} characters from container`);
                return text.replace(/\s+/g, ' ').trim();
              }
            }
            
            // Method 3: Look for any text content that looks like transcript
            const allElements = document.querySelectorAll('yt-formatted-string, span, div');
            let possibleTranscript = '';
            
            for (const el of allElements) {
              const text = el.textContent || '';
              if (text.length > 50 && text.includes(' ') && !text.includes('subscribe') && !text.includes('like')) {
                possibleTranscript += text + ' ';
                if (possibleTranscript.length > 500) break;
              }
            }
            
            if (possibleTranscript.length > 100) {
              console.log(`✅ Extracted ${possibleTranscript.length} characters from text detection`);
              return possibleTranscript.trim();
            }
            
            return null;
          }
          
          // Main extraction process
          console.log('🚀 Starting transcript extraction process...');
          
          // Try to open transcript first
          const transcriptOpened = findAndOpenTranscript();
          
          // Wait a bit for transcript to load, then extract
          setTimeout(() => {
            const transcript = extractTranscriptText();
            
            if (transcript && transcript.length > 200) {
              console.log(`🎉 Success! Extracted ${transcript.length} character transcript`);
              resolve(transcript);
            } else {
              console.warn('⚠️ Could not extract sufficient transcript');
              
              // Last resort: Try to get from video description
              const description = document.querySelector('#description-inline-expander, #description-text');
              if (description) {
                const descText = description.textContent || '';
                if (descText.length > 200) {
                  console.log(`📝 Using description as fallback: ${descText.length} chars`);
                  resolve(descText.substring(0, 2000));
                }
              }
              
              resolve(null);
            }
          }, transcriptOpened ? 3000 : 2000); // Wait longer if we opened transcript
        });
      }
    });

    const transcript = results[0]?.result;
    
    console.log('📊 Transcript extraction result:', transcript ? `${transcript.length} chars` : 'null');
    
    if (!transcript || transcript.length < 100) {
      throw new Error(`Transcript too short (${transcript ? transcript.length : 0} chars). Make sure the video has English captions enabled.`);
    }

    return transcript;

  } catch (error) {
    console.error('❌ Transcript extraction failed:', error);
    throw new Error('Transcript extraction failed: ' + error.message);
  }
}

  // Generate quiz using Gemini API
  async function generateQuizWithGemini(transcript, questionCount, apiKey) {
    try {
      showStatus('loading', 'AI is generating questions...');

      const prompt = `You are an expert quiz creator. Generate exactly ${questionCount} high-quality multiple-choice questions from this YouTube video transcript.

TRANSCRIPT:
${transcript.substring(0, 5000)}

REQUIREMENTS:
1. Create REAL, MEANINGFUL, SPECIFIC questions about the content
2. Each question MUST have exactly 4 options (A, B, C, D)
3. Only ONE correct answer per question
4. Questions should test understanding of actual content
5. Use specific facts, numbers, processes, definitions mentioned
6. Make questions educational and conceptual
7. Avoid yes/no or ambiguous questions

FORMAT EXAMPLES:
Q1: What is the median salary mentioned?
A) $100,000
B) $154,000
C) $200,000
D) $300,000

Q2: How is X different from Y?
A) X focuses on training models from scratch
B) X integrates pre-trained models into applications
C) X only does data processing
D) X requires a PhD

RESPONSE FORMAT - STRICT JSON ONLY:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "B",
      "explanation": "Brief explanation of the correct answer"
    }
  ]
}

Return ONLY valid JSON, no markdown, no code blocks, no extra text.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4000
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean and parse JSON
      let jsonText = responseText.replace(/```json\s*|\```/g, '').trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini');
      }

      const quizData = JSON.parse(jsonMatch[0]);
      
      if (!quizData.questions || quizData.questions.length === 0) {
        throw new Error('No questions generated');
      }

      currentQuiz = quizData.questions.slice(0, questionCount);
      showStatus('success', `✅ Generated ${currentQuiz.length} questions successfully!`);
      return currentQuiz;

    } catch (error) {
      throw new Error('Quiz generation failed: ' + error.message);
    }
  }

  // Display quiz with custom format
  function displayQuiz(questions) {
    quizContent.innerHTML = '';
    quizResults.style.display = 'none';
    userAnswers = {};

    const header = document.createElement('div');
    header.className = 'quiz-header-custom';
    header.innerHTML = `
      <h3>📝 Quiz - ${questions.length} Questions</h3>
      <p class="text-muted">Select the correct answer for each question</p>
    `;
    quizContent.appendChild(header);

    questions.forEach((q, index) => {
      const card = document.createElement('div');
      card.className = 'question-card-custom';
      
      const optionsHtml = Object.entries(q.options).map(([key, value]) => `
        <div class="option-item">
          <input type="radio" id="q${index}${key}" name="question${index}" value="${key}">
          <label for="q${index}${key}">
            <span class="option-letter">${key})</span> ${value}
          </label>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="question-number">Q${index + 1}</div>
        <div class="question-text">${q.question}</div>
        <div class="options-container">
          ${optionsHtml}
        </div>
      `;

      quizContent.appendChild(card);

      // Add event listeners
      document.querySelectorAll(`input[name="question${index}"]`).forEach(input => {
        input.addEventListener('change', (e) => {
          userAnswers[index] = e.target.value;
          updateSubmitButton();
        });
      });
    });

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.id = 'submit-quiz-btn';
    submitBtn.className = 'btn btn-success btn-lg w-100 mt-4';
    submitBtn.innerHTML = '✓ Submit Answers';
    submitBtn.disabled = true;
    submitBtn.addEventListener('click', calculateScore);
    quizContent.appendChild(submitBtn);
  }

  // Calculate score
  function calculateScore() {
    if (!currentQuiz) return;

    let correct = 0;
    const results = [];

    currentQuiz.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correct++;

      results.push({
        question: q.question,
        userAnswer: q.options[userAnswer] || 'Not answered',
        correctAnswer: q.options[q.correctAnswer],
        isCorrect: isCorrect,
        explanation: q.explanation
      });
    });

    displayResults(correct, results);
  }

  // Display results
  function displayResults(correct, results) {
    const total = currentQuiz.length;
    const percentage = Math.round((correct / total) * 100);

    quizContent.style.display = 'none';
    quizResults.innerHTML = '';
    quizResults.style.display = 'block';

    const header = document.createElement('div');
    header.className = 'results-header-custom';
    
    let message = '';
    let icon = '';
    if (percentage >= 90) { message = 'Excellent!'; icon = '🎉'; }
    else if (percentage >= 80) { message = 'Great Job!'; icon = '👏'; }
    else if (percentage >= 70) { message = 'Good Effort!'; icon = '✅'; }
    else if (percentage >= 60) { message = 'Keep Going!'; icon = '📚'; }
    else { message = 'Try Again!'; icon = '💪'; }

    header.innerHTML = `
      <div class="score-circle">
        <div class="score-number">${percentage}%</div>
        <div class="score-message">${message}</div>
      </div>
      <div class="score-details">
        <h4>Your Score: ${correct}/${total}</h4>
        <p>${icon} ${percentage >= 70 ? 'You passed!' : 'Review the answers below'}</p>
      </div>
    `;
    quizResults.appendChild(header);

    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'results-details-custom';

    results.forEach((r, idx) => {
      const resultCard = document.createElement('div');
      resultCard.className = `result-card-custom ${r.isCorrect ? 'correct' : 'incorrect'}`;
      
      resultCard.innerHTML = `
        <div class="result-header">
          <span class="result-q">Q${idx + 1}</span>
          <span class="result-icon">${r.isCorrect ? '✓' : '✗'}</span>
        </div>
        <div class="result-question">${r.question}</div>
        <div class="result-answers">
          <div class="your-answer">Your Answer: <strong>${r.userAnswer}</strong></div>
          ${!r.isCorrect ? `<div class="correct-answer">Correct Answer: <strong>${r.correctAnswer}</strong></div>` : ''}
          <div class="explanation">💡 ${r.explanation}</div>
        </div>
      `;
      
      detailsContainer.appendChild(resultCard);
    });

    quizResults.appendChild(detailsContainer);

    // Retry button
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-primary btn-lg w-100 mt-4';
    retryBtn.innerHTML = '🔄 Try Again';
    retryBtn.addEventListener('click', () => {
      displayQuiz(currentQuiz);
    });
    quizResults.appendChild(retryBtn);
  }

  // Show status message
  function showStatus(type, message) {
    const statusDiv = quizStatus;
    statusDiv.className = `quiz-status-${type}`;
    
    if (type === 'loading') {
      statusDiv.innerHTML = `<span class="spinner-small"></span> ${message}`;
    } else {
      statusDiv.textContent = message;
    }
  }

  // Update submit button
  function updateSubmitButton() {
    const submitBtn = document.getElementById('submit-quiz-btn');
    if (submitBtn) {
      const allAnswered = Object.keys(userAnswers).length === currentQuiz.length &&
                         Object.values(userAnswers).every(v => v !== null);
      submitBtn.disabled = !allAnswered;
    }
  }

  // Generate quiz button click
  generateQuizBtn.addEventListener('click', async () => {
    try {
      if (!geminiApiKey) {
        showStatus('error', '❌ Please save your Gemini API key first');
        return;
      }

      generateQuizBtn.disabled = true;
      quizResults.style.display = 'none';

      const transcript = await extractYouTubeTranscript();
      const questionCount = parseInt(questionCountSelect.value);

      await generateQuizWithGemini(transcript, questionCount, geminiApiKey);
      displayQuiz(currentQuiz);

    } catch (error) {
      showStatus('error', `❌ ${error.message}`);
    } finally {
      generateQuizBtn.disabled = false;
    }
  });

  // ====================== REMINDER SECTION ======================
// ====================== REMINDER SECTION WITH SMART NOTIFICATIONS ======================
const setReminderBtn = document.getElementById("set-reminder");
const reminderDaysInput = document.getElementById("reminder-days");
const reminderStatus = document.getElementById("reminder-status");
const smartRemindersList = document.getElementById("smart-reminders-list");

// Load existing reminder and smart notifications
chrome.storage.local.get(["revisionReminder", "reminderDays", "events", "quizHistory", "videoHistory"], (data) => {
  if (data.reminderDays) {
    reminderDaysInput.value = data.reminderDays;
  }
  
  if (data.revisionReminder) {
    const daysLeft = Math.ceil((data.revisionReminder - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      reminderStatus.innerHTML = `
        <div class="alert alert-info p-2">
          <i class="fas fa-bell me-2"></i>
          <strong>Reminder set!</strong> You'll be notified in ${daysLeft} day(s).
        </div>
      `;
    }
  }
  
  // Generate smart notifications when tab loads
  generateSmartNotifications(data.events || [], data.quizHistory || [], data.videoHistory || []);
});

// Generate context-aware smart notifications
function generateSmartNotifications(events, quizHistory, videoHistory) {
  if (!smartRemindersList) return;
  
  smartRemindersList.innerHTML = '';
  
  const notifications = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  
  // 1. "You seemed confused at X:XX, review now?"
  if (events.length > 0) {
    // Find most recent confusing events (rewinds, pauses)
    const confusingEvents = events.filter(e => 
      e.event === "Rewind" || e.event === "Pause" || e.event === "Forward"
    ).slice(-3); // Last 3 confusing events
    
    if (confusingEvents.length > 0) {
      const recentEvent = confusingEvents[confusingEvents.length - 1];
      const eventTime = new Date(recentEvent.timestamp || now);
      const hoursSinceEvent = Math.floor((now - eventTime) / (60 * 60 * 1000));
      
      if (hoursSinceEvent < 24) { // Within last 24 hours
        notifications.push({
          type: 'confusion',
          message: `You seemed confused at ${Math.floor(recentEvent.time/60)}:${String(Math.floor(recentEvent.time%60)).padStart(2, '0')}, review now?`,
          priority: 'high',
          time: recentEvent.time,
          timestamp: recentEvent.timestamp
        });
      }
    }
  }
  
  // 2. "Time to retry yesterday's quiz"
  if (quizHistory.length > 0) {
    const yesterday = new Date(now - oneDay).toDateString();
    const yesterdayQuizzes = quizHistory.filter(q => {
      if (!q.date) return false;
      return new Date(q.date).toDateString() === yesterday;
    });
    
    if (yesterdayQuizzes.length > 0) {
      const lowScoreQuizzes = yesterdayQuizzes.filter(q => (q.score || 0) < 70);
      if (lowScoreQuizzes.length > 0) {
        notifications.push({
          type: 'quiz-retry',
          message: `Time to retry yesterday's quiz (score: ${lowScoreQuizzes[0].score || 0}%)`,
          priority: 'medium',
          quizId: lowScoreQuizzes[0].id
        });
      }
    }
  }
  
  // 3. "New video from watched topic available" (simulated)
  if (videoHistory.length > 0) {
    // Get most watched video category/topic (simplified)
    const recentVideos = videoHistory.slice(-5);
    if (recentVideos.length >= 3) {
      // Simulate finding related content
      const topics = ['JavaScript', 'Python', 'Machine Learning', 'Web Development'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      
      notifications.push({
        type: 'new-content',
        message: `New ${randomTopic} tutorial available based on your watch history`,
        priority: 'low',
        topic: randomTopic
      });
    }
  }
  
  // 4. Spaced repetition reminders
  if (events.length > 5) {
    const firstEvent = events[0];
    const firstEventDate = new Date(firstEvent.timestamp || now);
    const daysSinceFirstEvent = Math.floor((now - firstEventDate) / oneDay);
    
    // Suggest review at intervals: 1 day, 3 days, 1 week
    if (daysSinceFirstEvent === 1 || daysSinceFirstEvent === 3 || daysSinceFirstEvent === 7) {
      notifications.push({
        type: 'spaced-repetition',
        message: `Perfect time for spaced repetition review! (${daysSinceFirstEvent} day${daysSinceFirstEvent > 1 ? 's' : ''} since first study)`,
        priority: 'high',
        interval: daysSinceFirstEvent
      });
    }
  }
  
  // 5. Learning streak encouragement
  if (events.length > 0) {
    const activityDates = events
      .map(e => new Date(e.timestamp || now).toDateString())
      .filter((date, index, self) => self.indexOf(date) === index);
    
    const today = new Date().toDateString();
    const yesterday = new Date(now - oneDay).toDateString();
    
    if (activityDates.includes(yesterday) && !activityDates.includes(today)) {
      notifications.push({
        type: 'streak',
        message: 'Keep your learning streak alive! Study today to maintain your progress.',
        priority: 'medium'
      });
    }
  }
  
  // Display notifications
  if (notifications.length === 0) {
    smartRemindersList.innerHTML = `
      <li class="list-group-item">
        <i class="fas fa-check-circle text-success me-2"></i>
        <span class="text-muted">No notifications at the moment. Keep learning!</span>
      </li>
    `;
  } else {
    // Sort by priority: high > medium > low
    notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    notifications.forEach((notification, index) => {
      const li = document.createElement('li');
      li.className = 'list-group-item notification-item';
      
      // Determine icon and color based on type
      let icon = '🔔';
      let colorClass = 'text-primary';
      let badgeClass = 'bg-primary';
      
      switch(notification.type) {
        case 'confusion':
          icon = '🤔';
          colorClass = 'text-warning';
          badgeClass = 'bg-warning';
          break;
        case 'quiz-retry':
          icon = '📝';
          colorClass = 'text-danger';
          badgeClass = 'bg-danger';
          break;
        case 'new-content':
          icon = '🎬';
          colorClass = 'text-success';
          badgeClass = 'bg-success';
          break;
        case 'spaced-repetition':
          icon = '⏰';
          colorClass = 'text-info';
          badgeClass = 'bg-info';
          break;
        case 'streak':
          icon = '🔥';
          colorClass = 'text-danger';
          badgeClass = 'bg-danger';
          break;
      }
      
      li.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <span class="${colorClass} me-2">${icon}</span>
            <strong>${notification.message}</strong>
            <div class="small text-muted mt-1">
              <i class="fas fa-clock me-1"></i>
              ${getTimeAgo(notification.timestamp || now)}
              <span class="badge ${badgeClass} rounded-pill ms-2">${notification.priority}</span>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-secondary action-btn" data-type="${notification.type}" data-index="${index}">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      `;
      
      smartRemindersList.appendChild(li);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.closest('.action-btn').dataset.type;
        handleNotificationAction(type);
      });
    });
  }
}

// Helper function to get time ago
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return 'More than a week ago';
}

// Handle notification actions
function handleNotificationAction(type) {
  switch(type) {
    case 'confusion':
      // Open revision tab at specific time
      document.querySelector('[data-tab="revision-tab"]').click();
      break;
    case 'quiz-retry':
      // Open quiz tab
      document.querySelector('[data-tab="quiz-tab"]').click();
      break;
    case 'new-content':
      // Could open YouTube search for the topic
      chrome.tabs.create({ 
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent('tutorial')}` 
      });
      break;
    case 'spaced-repetition':
    case 'streak':
      // Refresh notifications
      chrome.storage.local.get(["events", "quizHistory", "videoHistory"], (data) => {
        generateSmartNotifications(data.events || [], data.quizHistory || [], data.videoHistory || []);
      });
      break;
  }
}

// Set reminder button click
setReminderBtn.addEventListener("click", () => {
  const days = parseInt(reminderDaysInput.value);
  
  if (!days || days <= 0) {
    reminderStatus.innerHTML = `
      <div class="alert alert-danger p-2">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Please enter a valid number of days (1-30).
      </div>
    `;
    return;
  }
  
  if (days > 30) {
    reminderStatus.innerHTML = `
      <div class="alert alert-warning p-2">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Maximum reminder period is 30 days.
      </div>
    `;
    return;
  }

  const reminderTime = Date.now() + (days * 24 * 60 * 60 * 1000);
  
  // Save reminder
  chrome.storage.local.set({
    revisionReminder: reminderTime,
    reminderDays: days
  }, () => {
    // Set alarm
    chrome.alarms.create("revisionReminder", {
      when: reminderTime
    });
    
    // Show success message
    reminderStatus.innerHTML = `
      <div class="alert alert-success p-2">
        <i class="fas fa-check-circle me-2"></i>
        <strong>Reminder set successfully!</strong><br>
        <small>You'll be notified in ${days} day(s) to review your confusing topics.</small>
      </div>
    `;
    
    // Clear after 5 seconds
    setTimeout(() => {
      if (reminderStatus.innerHTML.includes("successfully")) {
        reminderStatus.innerHTML = "";
      }
    }, 5000);
  });
});

// Listen for reminder tab click to refresh notifications
document.querySelector('[data-tab="reminder-tab"]')?.addEventListener("click", () => {
  // Update reminder status when tab is clicked
  chrome.storage.local.get(["revisionReminder", "events", "quizHistory", "videoHistory"], (data) => {
    if (data.revisionReminder) {
      const daysLeft = Math.ceil((data.revisionReminder - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        reminderStatus.innerHTML = `
          <div class="alert alert-info p-2">
            <i class="fas fa-bell me-2"></i>
            <strong>Active Reminder</strong><br>
            <small>Next review scheduled in ${daysLeft} day(s)</small>
          </div>
        `;
      }
    }
    
    // Refresh smart notifications
    generateSmartNotifications(data.events || [], data.quizHistory || [], data.videoHistory || []);
  });
});

// Add CSS for smart notifications
const smartNotificationsStyle = document.createElement('style');
smartNotificationsStyle.textContent = `
  .notification-item {
    border-left: 4px solid #007bff;
    margin-bottom: 8px;
    transition: all 0.2s ease;
  }
  
  .notification-item:hover {
    background-color: #f8f9fa;
    transform: translateX(2px);
  }
  
  .notification-item.confusion {
    border-left-color: #ffc107;
  }
  
  .notification-item.quiz-retry {
    border-left-color: #dc3545;
  }
  
  .notification-item.new-content {
    border-left-color: #28a745;
  }
  
  .notification-item.spaced-repetition {
    border-left-color: #17a2b8;
  }
  
  .notification-item.streak {
    border-left-color: #fd7e14;
  }
  
  .action-btn {
    padding: 2px 8px;
    font-size: 12px;
  }
  
  .smart-notifications-header {
    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
    color: white;
    padding: 12px 15px;
    border-radius: 8px 8px 0 0;
    margin-bottom: 15px;
  }
  
  .smart-notifications-header h6 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  .smart-notifications-header .badge {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  
  #smart-reminders-list {
    max-height: 300px;
    overflow-y: auto;
  }
  
  .empty-notifications {
    text-align: center;
    padding: 30px 20px;
    color: #6c757d;
  }
  
  .empty-notifications i {
    font-size: 40px;
    margin-bottom: 15px;
    opacity: 0.5;
  }
`;
document.head.appendChild(smartNotificationsStyle);

  // Add CSS styles QUIZ
  const style = document.createElement('style');
  style.textContent = `
    .quiz-header-custom {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 25px;
      text-align: center;
    }

    .quiz-header-custom h3 {
      margin: 0;
      font-size: 1.8em;
      font-weight: 700;
    }

    .question-card-custom {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      transition: all 0.3s ease;
    }

    .question-card-custom:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }

    .question-number {
      color: #667eea;
      font-weight: 700;
      font-size: 0.9em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .question-text {
      font-size: 1.15em;
      font-weight: 600;
      color: #333;
      margin-bottom: 18px;
      line-height: 1.4;
    }

    .options-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .option-item {
      position: relative;
    }

    .option-item input {
      display: none;
    }

    .option-item label {
      display: block;
      padding: 12px 15px;
      background: #f8f9fa;
      border: 2px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      user-select: none;
    }

    .option-item label:hover {
      border-color: #667eea;
      background: #f0f1ff;
    }

    .option-item input:checked + label {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
      font-weight: 600;
    }

    .option-letter {
      font-weight: 700;
      margin-right: 8px;
    }

    .quiz-status-loading, .quiz-status-success, .quiz-status-error {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-weight: 500;
    }

    .quiz-status-loading {
      background: #d1ecf1;
      color: #0c5460;
    }

    .quiz-status-success {
      background: #d4edda;
      color: #155724;
    }

    .quiz-status-error {
      background: #f8d7da;
      color: #721c24;
    }

    .spinner-small {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid #667eea;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .results-header-custom {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 25px;
      text-align: center;
    }

    .score-circle {
      margin-bottom: 20px;
    }

    .score-number {
      font-size: 3em;
      font-weight: 700;
      margin: 10px 0;
    }

    .score-message {
      font-size: 1.3em;
      opacity: 0.9;
    }

    .score-details h4 {
      margin: 15px 0 5px;
      font-size: 1.2em;
    }

    .results-details-custom {
      margin-bottom: 20px;
    }

    .result-card-custom {
      background: white;
      border-left: 5px solid;
      border-radius: 8px;
      padding: 18px;
      margin-bottom: 15px;
      border-color: #dc3545;
    }

    .result-card-custom.correct {
      border-color: #28a745;
      background: #f8fffe;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .result-q {
      color: #667eea;
      font-size: 0.95em;
    }

    .result-icon {
      font-size: 1.3em;
    }

    .result-card-custom.correct .result-icon {
      color: #28a745;
    }

    .result-card-custom.incorrect .result-icon {
      color: #dc3545;
    }

    .result-question {
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }

    .result-answers {
      font-size: 0.95em;
      line-height: 1.6;
    }

    .your-answer, .correct-answer {
      color: #666;
      margin-bottom: 8px;
    }

    .your-answer strong {
      color: #333;
    }

    .correct-answer strong {
      color: #28a745;
    }

    .explanation {
      background: #f0f1ff;
      padding: 10px;
      border-radius: 5px;
      margin-top: 10px;
      color: #555;
      border-left: 3px solid #667eea;
    }

    #submit-quiz-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);

});

// Initialize SUMMARY storage if needed
chrome.storage.local.get(["savedSummaries"], (data) => {
  if (!data.savedSummaries) {
    chrome.storage.local.set({ savedSummaries: [] });
  }

  // ====================== NOTES INTEGRATION SECTION ======================
// Add this RIGHT BEFORE the closing }); of DOMContentLoaded

// Add CSS for notes tab
const notesStyle = document.createElement('style');
notesStyle.textContent = `
  #notes-tab .card {
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
  }
  
  #notes-tab .card-header {
    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
    color: white;
    border-bottom: none;
    padding: 12px 16px;
    font-weight: 600;
    font-size: 14px;
  }
  
  .notes-controls {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .timestamp-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    padding: 8px 15px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }
  
  .timestamp-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  .timestamp-btn i {
    margin-right: 6px;
  }
  
  .notes-editor-container {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 15px;
  }
  
  .notes-toolbar {
    background: #f8f9fa;
    padding: 8px 12px;
    border-bottom: 1px solid #ddd;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .format-btn {
    background: none;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .format-btn:hover {
    background: #e9ecef;
  }
  
  .format-btn.active {
    background: #4361ee;
    color: white;
    border-color: #4361ee;
  }
  
  #notes-editor {
    width: 100%;
    min-height: 200px;
    padding: 15px;
    border: none;
    resize: vertical;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
  }
  
  #notes-editor:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2);
  }
  
  .notes-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .save-note-btn {
    background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
    color: white;
  }
  
  .save-note-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }
  
  .export-pdf-btn {
    background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
    color: white;
  }
  
  .export-pdf-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 65, 108, 0.3);
  }
  
  .share-notes-btn {
    background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
    color: white;
  }
  
  .share-notes-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  }
  
  .clear-notes-btn {
    background: linear-gradient(135deg, #9e9e9e 0%, #616161 100%);
    color: white;
  }
  
  .clear-notes-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(158, 158, 158, 0.3);
  }
  
  .saved-notes-container {
    margin-top: 20px;
  }
  
  .saved-notes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid #f0f0f0;
  }
  
  .saved-notes-header h6 {
    margin: 0;
    font-size: 14px;
    color: #2c3e50;
    font-weight: 600;
  }
  
  .saved-notes-list {
    max-height: 300px;
    overflow-y: auto;
  }
  
  .saved-note-item {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 12px;
    transition: all 0.2s ease;
  }
  
  .saved-note-item:hover {
    border-color: #4361ee;
    box-shadow: 0 2px 8px rgba(67, 97, 238, 0.1);
  }
  
  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  
  .note-title {
    font-weight: 600;
    color: #2c3e50;
    font-size: 14px;
    margin: 0;
  }
  
  .note-timestamp {
    background: #e3f2fd;
    color: #1976d2;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .note-content {
    font-size: 13px;
    line-height: 1.5;
    color: #424242;
    margin-bottom: 10px;
    max-height: 80px;
    overflow: hidden;
    position: relative;
  }
  
  .note-content.expanded {
    max-height: none;
    overflow: visible;
  }
  
  .note-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #757575;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
  }
  
  .note-actions {
    display: flex;
    gap: 5px;
  }
  
  .note-action-btn {
    background: none;
    border: none;
    color: #757575;
    font-size: 11px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .note-action-btn:hover {
    background: #f5f5f5;
    color: #424242;
  }
  
  .note-action-btn.delete:hover {
    color: #f44336;
    background: #ffebee;
  }
  
  .note-action-btn.export:hover {
    color: #ff9800;
    background: #fff3e0;
  }
  
  .no-notes-message {
    text-align: center;
    padding: 40px 20px;
    color: #757575;
  }
  
  .no-notes-message i {
    font-size: 40px;
    margin-bottom: 15px;
    opacity: 0.5;
  }
  
  /* Notes status */
  .notes-status {
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 15px;
    font-size: 13px;
    display: none;
  }
  
  .notes-status.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
    display: block;
  }
  
  .notes-status.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    display: block;
  }
  
  .notes-status.info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
    display: block;
  }
  
  /* Video timestamp integration */
  .video-timestamp {
    background: #e3f2fd;
    color: #1976d2;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-family: monospace;
    cursor: pointer;
    margin-right: 5px;
    display: inline-block;
  }
  
  .video-timestamp:hover {
    background: #bbdefb;
  }
`;
document.head.appendChild(notesStyle);

// Notes Tab Handler
document.querySelector('[data-tab="notes-tab"]')?.addEventListener("click", function() {
  loadNotesTab();
});

function loadNotesTab() {
  // Load saved notes
  loadSavedNotes();
  
  // Get current video info
  getCurrentVideoInfo().then(videoInfo => {
    const currentVideoElement = document.getElementById('current-video-info');
    if (currentVideoElement && videoInfo.videoTitle) {
      currentVideoElement.innerHTML = `
        <i class="fas fa-video me-1"></i>
        <strong>${videoInfo.videoTitle.substring(0, 50)}${videoInfo.videoTitle.length > 50 ? '...' : ''}</strong>
      `;
    }
  });
  
  // Initialize note-taking functionality
  initializeNotesEditor();
}

// Initialize notes editor
function initializeNotesEditor() {
  const editor = document.getElementById('notes-editor');
  const formatButtons = document.querySelectorAll('.format-btn');
  
  if (!editor) return;
  
  // Add timestamp button functionality
  const timestampBtn = document.getElementById('add-timestamp');
  if (timestampBtn) {
    timestampBtn.addEventListener('click', addVideoTimestamp);
  }
  
  // Format button functionality
  formatButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const command = this.dataset.command;
      if (command === 'createlink' || command === 'insertimage') {
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand(command, false, url);
        }
      } else {
        document.execCommand(command, false, null);
      }
      
      // Toggle active state for format buttons
      if (['bold', 'italic', 'underline'].includes(command)) {
        this.classList.toggle('active');
      }
    });
  });
  
  // Save note button
  const saveNoteBtn = document.getElementById('save-note');
  if (saveNoteBtn) {
    saveNoteBtn.addEventListener('click', saveNote);
  }
  
  // Clear notes button
  const clearNotesBtn = document.getElementById('clear-notes');
  if (clearNotesBtn) {
    clearNotesBtn.addEventListener('click', clearNotes);
  }
  
  // Export PDF button
  const exportPdfBtn = document.getElementById('export-pdf');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', showExportModal);
  }
  
  // Share notes button
  const shareNotesBtn = document.getElementById('share-notes');
  if (shareNotesBtn) {
    shareNotesBtn.addEventListener('click', showShareModal);
  }
}

// Add video timestamp to notes
async function addVideoTimestamp() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('youtube.com/watch')) {
      showNotesStatus('error', 'Please navigate to a YouTube video to add timestamps');
      return;
    }
    
    // Get current video time
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const video = document.querySelector('video');
        if (video) {
          const currentTime = Math.floor(video.currentTime);
          const hours = Math.floor(currentTime / 3600);
          const minutes = Math.floor((currentTime % 3600) / 60);
          const seconds = currentTime % 60;
          
          return {
            timestamp: currentTime,
            formattedTime: `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            videoId: new URLSearchParams(window.location.search).get('v')
          };
        }
        return null;
      }
    });
    
    if (results && results[0] && results[0].result) {
      const { timestamp, formattedTime, videoId } = results[0].result;
      const editor = document.getElementById('notes-editor');
      
      // Create clickable timestamp
      const timestampElement = `<span class="video-timestamp" data-time="${timestamp}" data-video="${videoId}">⏱️ ${formattedTime}</span>`;
      
      // Insert at cursor position
      document.execCommand('insertHTML', false, timestampElement + ' ');
      
      showNotesStatus('success', `Timestamp added: ${formattedTime}`);
    } else {
      showNotesStatus('error', 'Could not get video time. Make sure video is playing.');
    }
    
  } catch (error) {
    console.error('Error adding timestamp:', error);
    showNotesStatus('error', 'Failed to add timestamp');
  }
}

// Save note to storage
async function saveNote() {
  const editor = document.getElementById('notes-editor');
  const noteTitleInput = document.getElementById('note-title');
  
  if (!editor) return;
  
  const content = editor.innerHTML.trim();
  const title = noteTitleInput ? noteTitleInput.value.trim() : 'Untitled Note';
  
  if (!content) {
    showNotesStatus('error', 'Please add some notes before saving');
    return;
  }
  
  try {
    // Get current video info
    const videoInfo = await getCurrentVideoInfo();
    const currentTime = new Date().toISOString();
    
    // Create note object
    const note = {
      id: Date.now(),
      title: title || 'Untitled Note',
      content: content,
      plainText: editor.innerText.trim(),
      videoTitle: videoInfo.videoTitle,
      videoId: videoInfo.videoId,
      createdAt: currentTime,
      updatedAt: currentTime,
      tags: extractTags(content),
      wordCount: content.split(/\s+/).length
    };
    
    // Save to storage
    chrome.storage.local.get(['savedNotes'], (data) => {
      const savedNotes = data.savedNotes || [];
      savedNotes.unshift(note); // Add to beginning
      
      chrome.storage.local.set({ savedNotes: savedNotes.slice(0, 100) }, () => { // Keep last 100 notes
        // Clear editor
        editor.innerHTML = '';
        if (noteTitleInput) noteTitleInput.value = '';
        
        // Show success message
        showNotesStatus('success', 'Note saved successfully!');
        
        // Reload saved notes list
        loadSavedNotes();
        
        // Clear status after 3 seconds
        setTimeout(() => {
          const status = document.getElementById('notes-status');
          if (status) status.style.display = 'none';
        }, 3000);
      });
    });
    
  } catch (error) {
    console.error('Error saving note:', error);
    showNotesStatus('error', 'Failed to save note');
  }
}

// Extract tags from note content
function extractTags(content) {
  const hashtags = content.match(/#[\w\u0590-\u05ff]+/g) || [];
  return [...new Set(hashtags.map(tag => tag.toLowerCase()))].slice(0, 5);
}

// Load saved notes
function loadSavedNotes() {
  const savedNotesList = document.getElementById('saved-notes-list');
  if (!savedNotesList) return;
  
  chrome.storage.local.get(['savedNotes'], (data) => {
    const savedNotes = data.savedNotes || [];
    
    if (savedNotes.length === 0) {
      savedNotesList.innerHTML = `
        <div class="no-notes-message">
          <i class="far fa-sticky-note"></i>
          <div>No saved notes yet</div>
          <small class="text-muted">Start taking notes above!</small>
        </div>
      `;
      return;
    }
    
    savedNotesList.innerHTML = '';
    
    savedNotes.forEach(note => {
      const noteElement = createNoteElement(note);
      savedNotesList.appendChild(noteElement);
    });
  });
}

// Create note element for display
function createNoteElement(note) {
  const div = document.createElement('div');
  div.className = 'saved-note-item';
  div.dataset.noteId = note.id;
  
  const date = new Date(note.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const wordCount = note.wordCount || note.content.split(/\s+/).length;
  const readTime = Math.ceil(wordCount / 200); // 200 words per minute
  
  // Extract preview text (remove HTML tags)
  const previewText = note.plainText || note.content.replace(/<[^>]*>/g, '');
  const shortPreview = previewText.length > 150 ? previewText.substring(0, 150) + '...' : previewText;
  
  div.innerHTML = `
    <div class="note-header">
      <div class="note-title">${note.title}</div>
      <span class="note-timestamp">${formattedDate}</span>
    </div>
    
    <div class="note-content">
      ${shortPreview}
      ${previewText.length > 150 ? '<span class="read-more"> [Read more]</span>' : ''}
    </div>
    
    <div class="note-meta">
      <div>
        <i class="fas fa-video me-1"></i>
        <span>${note.videoTitle || 'YouTube Video'}</span>
        <i class="fas fa-clock ms-2 me-1"></i>
        <span>${readTime} min read</span>
      </div>
      <div class="note-actions">
        <button class="note-action-btn view" title="View Note">
          <i class="fas fa-eye"></i>
        </button>
        <button class="note-action-btn edit" title="Edit Note">
          <i class="fas fa-edit"></i>
        </button>
        <button class="note-action-btn export" title="Export as PDF">
          <i class="fas fa-file-pdf"></i>
        </button>
        <button class="note-action-btn delete" title="Delete Note">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
  
  // Add event listeners
  const noteContent = div.querySelector('.note-content');
  const readMore = div.querySelector('.read-more');
  if (readMore) {
    readMore.addEventListener('click', (e) => {
      e.preventDefault();
      noteContent.classList.toggle('expanded');
      readMore.textContent = noteContent.classList.contains('expanded') ? ' [Show less]' : ' [Read more]';
    });
  }
  
  // Action buttons
  div.querySelector('.note-action-btn.view').addEventListener('click', () => viewNote(note));
  div.querySelector('.note-action-btn.edit').addEventListener('click', () => editNote(note));
  div.querySelector('.note-action-btn.export').addEventListener('click', () => exportSingleNote(note));
  div.querySelector('.note-action-btn.delete').addEventListener('click', () => deleteNote(note.id));
  
  return div;
}

// View note in detail
function viewNote(note) {
  const modal = document.createElement('div');
  modal.className = 'pdf-modal';
  modal.innerHTML = `
    <div class="pdf-modal-content" style="max-width: 600px;">
      <div class="pdf-modal-header">
        <h6 class="mb-0">
          <i class="fas fa-sticky-note me-2"></i>
          ${note.title}
        </h6>
      </div>
      <div class="pdf-modal-body">
        <div class="note-metadata mb-3">
          <div class="small text-muted">
            <i class="fas fa-calendar me-1"></i>
            Created: ${new Date(note.createdAt).toLocaleString()}
          </div>
          <div class="small text-muted">
            <i class="fas fa-video me-1"></i>
            Video: ${note.videoTitle || 'Unknown'}
          </div>
          <div class="small text-muted">
            <i class="fas fa-tags me-1"></i>
            Tags: ${note.tags ? note.tags.join(', ') : 'None'}
          </div>
        </div>
        <div class="note-content-view" style="
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          max-height: 400px;
          overflow-y: auto;
        ">
          ${note.content}
        </div>
      </div>
      <div class="pdf-modal-footer">
        <button class="btn btn-secondary" id="close-note-view">Close</button>
        <button class="btn btn-primary" id="export-note-view">
          <i class="fas fa-file-pdf me-1"></i> Export as PDF
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  modal.querySelector('#close-note-view').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.querySelector('#export-note-view').addEventListener('click', () => {
    exportSingleNote(note);
    document.body.removeChild(modal);
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Edit note
function editNote(note) {
  const editor = document.getElementById('notes-editor');
  const noteTitleInput = document.getElementById('note-title');
  
  if (editor) {
    editor.innerHTML = note.content;
  }
  
  if (noteTitleInput) {
    noteTitleInput.value = note.title;
  }
  
  // Scroll to editor
  editor?.scrollIntoView({ behavior: 'smooth' });
  
  // Delete old note
  deleteNote(note.id, false);
  
  showNotesStatus('info', 'Note loaded for editing. Save to update.');
}

// Delete note
function deleteNote(noteId, showConfirmation = true) {
  if (showConfirmation && !confirm('Are you sure you want to delete this note?')) {
    return;
  }
  
  chrome.storage.local.get(['savedNotes'], (data) => {
    const savedNotes = data.savedNotes || [];
    const updatedNotes = savedNotes.filter(note => note.id !== noteId);
    
    chrome.storage.local.set({ savedNotes: updatedNotes }, () => {
      loadSavedNotes();
      showNotesStatus('success', 'Note deleted successfully');
    });
  });
}

// Clear all notes
function clearNotes() {
  if (!confirm('Are you sure you want to clear all notes? This action cannot be undone.')) {
    return;
  }
  
  chrome.storage.local.set({ savedNotes: [] }, () => {
    loadSavedNotes();
    showNotesStatus('success', 'All notes cleared');
  });
}

// Show export modal
function showExportModal() {
  showNotesStatus('info', 'Export feature requires PDF library. For now, you can copy notes and paste into your document.');
}

// Export current note as PDF
async function exportSingleNote(note) {
  showNotesStatus('info', 'Export feature requires PDF library. For now, you can copy notes and paste into your document.');
}

// Share notes via email (using mailto link)
function shareNotesViaEmail() {
  const editor = document.getElementById('notes-editor');
  if (!editor || !editor.innerHTML.trim()) {
    showNotesStatus('error', 'No notes to share');
    return;
  }
  
  const subject = encodeURIComponent('My YouTube Learning Notes');
  const body = encodeURIComponent(
    `Here are my notes:\n\n${editor.innerText}\n\n---\nGenerated by YouTube Learning Assistant Extension`
  );
  
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

// Show share modal
function showShareModal() {
  const editor = document.getElementById('notes-editor');
  if (!editor || !editor.innerHTML.trim()) {
    showNotesStatus('error', 'No notes to share');
    return;
  }
  
  // Simple share options
  const options = [
    { name: 'Email', icon: '📧', action: () => shareNotesViaEmail() },
    { name: 'Copy', icon: '📋', action: async () => {
      try {
        await navigator.clipboard.writeText(editor.innerText);
        showNotesStatus('success', 'Notes copied to clipboard!');
      } catch (error) {
        showNotesStatus('error', 'Failed to copy notes');
      }
    }}
  ];
  
  // Create simple modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 10px; min-width: 200px;">
      <h6>Share Notes</h6>
      <div class="d-flex gap-2 mt-3">
        ${options.map(opt => `
          <button onclick="this.parentElement.parentElement.parentElement.remove(); ${opt.action.toString().replace(/"/g, '&quot;')}" 
                  style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; background: none;">
            ${opt.icon} ${opt.name}
          </button>
        `).join('')}
      </div>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="margin-top: 15px; padding: 8px 16px; border: none; background: #ddd; border-radius: 4px; width: 100%;">
        Cancel
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Get current video info (reuse existing function from your code)
async function getCurrentVideoInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.url?.includes('youtube.com/watch')) {
      return { videoId: null, videoTitle: 'Not on YouTube' };
    }
    
    // Extract video ID from URL
    const urlParams = new URLSearchParams(new URL(tab.url).search);
    const videoId = urlParams.get('v');
    
    // Get video title from tab
    const videoTitle = tab.title?.replace(' - YouTube', '') || 'YouTube Video';
    
    return {
      videoId,
      videoTitle: videoTitle || 'YouTube Video',
      url: tab.url
    };
    
  } catch (error) {
    console.error('Error getting video info:', error);
    return { videoId: null, videoTitle: 'Unknown Video' };
  }
}

// Show notes status message
function showNotesStatus(type, message) {
  const status = document.getElementById('notes-status');
  if (!status) return;
  
  status.className = `notes-status ${type}`;
  status.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
    ${message}
  `;
  status.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    status.style.display = 'none';
  }, 5000);
}

// Initialize notes storage
chrome.storage.local.get(['savedNotes'], (data) => {
  if (!data.savedNotes) {
    chrome.storage.local.set({ savedNotes: [] });
  }
});

// ====================== END NOTES INTEGRATION ======================

// ====================== RESOURCE LINKS INTEGRATION ======================

// Add CSS for resource links
const resourcesStyle = document.createElement('style');
resourcesStyle.textContent = `
  .resource-category {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    color: #6c757d;
    font-weight: 600;
    padding-left: 5px;
  }
  
  .resource-item {
    border: none;
    border-bottom: 1px solid #f0f0f0;
    padding: 12px 15px;
    transition: all 0.2s ease;
    cursor: pointer;
  }
  
  .resource-item:last-child {
    border-bottom: none;
  }
  
  .resource-item:hover {
    background: #f8f9fa;
    transform: translateX(2px);
  }
  
  .resource-icon {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 10px;
    flex-shrink: 0;
  }
  
  .resource-icon.youtube { background: #ff0000; color: white; }
  .resource-icon.article { background: #4285f4; color: white; }
  .resource-icon.docs { background: #34a853; color: white; }
  .resource-icon.exercise { background: #fbbc05; color: white; }
  .resource-icon.github { background: #333; color: white; }
  .resource-icon.course { background: #8b5cf6; color: white; }
  
  .resource-content {
    flex: 1;
    min-width: 0;
  }
  
  .resource-title {
    font-weight: 600;
    font-size: 13px;
    color: #2c3e50;
    margin-bottom: 2px;
    line-height: 1.3;
  }
  
  .resource-description {
    font-size: 11px;
    color: #6c757d;
    line-height: 1.4;
  }
  
  .resource-meta {
    font-size: 10px;
    color: #adb5bd;
    margin-top: 4px;
    display: flex;
    align-items: center;
  }
  
  .resource-meta i {
    margin-right: 4px;
  }
  
  .resource-source {
    display: inline-block;
    padding: 1px 6px;
    background: #e9ecef;
    border-radius: 3px;
    font-size: 9px;
    color: #495057;
    margin-left: 6px;
  }
  
  .no-resources {
    text-align: center;
    padding: 30px 20px;
    color: #6c757d;
  }
  
  .no-resources i {
    font-size: 40px;
    margin-bottom: 15px;
    opacity: 0.5;
  }
  
  .ai-generated-badge {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 5px;
  }
  
  .confidence-badge {
    background: #e8f5e9;
    color: #2e7d32;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: auto;
  }
  
  #refresh-resources {
    font-size: 11px;
    padding: 2px 8px;
  }
`;
document.head.appendChild(resourcesStyle);

// Resource Links Data Structure
const RESOURCE_CATEGORIES = {
  'youtube': {
    name: 'Related YouTube Videos',
    icon: 'youtube',
    color: '#ff0000',
    sources: [
      'YouTube Search',
      'Related Videos',
      'Educational Channels'
    ]
  },
  'articles': {
    name: 'Articles & Blogs',
    icon: 'article',
    color: '#4285f4',
    sources: [
      'Medium',
      'Dev.to',
      'FreeCodeCamp',
      'MDN Web Docs',
      'W3Schools',
      'CSS-Tricks',
      'Smashing Magazine'
    ]
  },
  'documentation': {
    name: 'Official Documentation',
    icon: 'docs',
    color: '#34a853',
    sources: [
      'Official Docs',
      'API References',
      'Guides & Tutorials'
    ]
  },
  'exercises': {
    name: 'Practice Exercises',
    icon: 'exercise',
    color: '#fbbc05',
    sources: [
      'LeetCode',
      'HackerRank',
      'Codewars',
      'Exercism',
      'FreeCodeCamp Challenges'
    ]
  },
  'github': {
    name: 'GitHub Repositories',
    icon: 'github',
    color: '#333',
    sources: [
      'GitHub Trending',
      'Awesome Lists',
      'Starter Projects'
    ]
  },
  'courses': {
    name: 'Online Courses',
    icon: 'course',
    color: '#8b5cf6',
    sources: [
      'freeCodeCamp',
      'Coursera',
      'edX',
      'Udemy Free',
      'YouTube Courses'
    ]
  }
};

// Resource Links Handler
document.querySelector('[data-tab="revision-tab"]')?.addEventListener("click", function() {
  // Load revision suggestions (existing)
  loadRevisionSuggestionsFromEvents();
  
  // Load resource links
  loadResourceLinks();
});

// Refresh button
document.getElementById('refresh-resources')?.addEventListener('click', function() {
  loadResourceLinks();
});

// Load resource links based on current video
async function loadResourceLinks() {
  const resourceLinksContainer = document.getElementById('resource-links');
  const loadingIndicator = document.getElementById('resources-loading');
  
  if (!resourceLinksContainer) return;
  
  // Show loading
  resourceLinksContainer.style.display = 'none';
  loadingIndicator.style.display = 'block';
  
  try {
    // Get current video info and transcript
    const videoInfo = await getCurrentVideoInfo();
    const transcript = await extractYouTubeTranscript();
    
    // Extract keywords from transcript
    const keywords = extractKeywordsFromText(transcript || '');
    
    // Generate resource suggestions
    const resources = await generateResourceSuggestions(keywords, videoInfo);
    
    // Display resources
    displayResourceLinks(resources);
    
  } catch (error) {
    console.error('Error loading resource links:', error);
    showFallbackResources();
  } finally {
    // Hide loading
    loadingIndicator.style.display = 'none';
    resourceLinksContainer.style.display = 'block';
  }
}

// Extract keywords from text
function extractKeywordsFromText(text) {
  if (!text || text.length < 100) {
    return ['programming', 'tutorial', 'learning'];
  }
  
  // Clean text
  const cleanedText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'must', 'shall', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
    'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'its'
  ]);
  
  // Extract words and count frequency
  const words = cleanedText.split(/\s+/);
  const wordFrequency = {};
  
  words.forEach(word => {
    if (word.length > 3 && !stopWords.has(word)) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });
  
  // Sort by frequency and get top keywords
  const sortedKeywords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  // Add common tech keywords if detected
  const techKeywords = detectTechKeywords(cleanedText);
  const allKeywords = [...new Set([...sortedKeywords, ...techKeywords])];
  
  return allKeywords.slice(0, 8); // Return top 8 keywords
}

// Detect technology-specific keywords
function detectTechKeywords(text) {
  const techKeywords = [];
  
  // Programming languages
  const languages = [
    'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
    'typescript', 'swift', 'kotlin', 'dart', 'scala', 'r language'
  ];
  
  // Web development
  const webTech = [
    'html', 'css', 'react', 'angular', 'vue', 'node', 'express', 'django',
    'flask', 'laravel', 'spring', 'bootstrap', 'tailwind', 'webpack', 'npm'
  ];
  
  // Data science & ML
  const dataScience = [
    'machine learning', 'deep learning', 'data science', 'neural networks',
    'tensorflow', 'pytorch', 'pandas', 'numpy', 'matplotlib', 'scikit'
  ];
  
  // Check for each keyword
  [...languages, ...webTech, ...dataScience].forEach(keyword => {
    if (text.includes(keyword)) {
      techKeywords.push(keyword.replace(' language', ''));
    }
  });
  
  return techKeywords;
}

// Generate resource suggestions based on keywords
async function generateResourceSuggestions(keywords, videoInfo) {
  if (keywords.length === 0) {
    keywords = ['programming', 'tutorial', 'education'];
  }
  
  const resources = [];
  const mainKeyword = keywords[0] || 'programming';
  
  // YouTube Videos
  resources.push(...generateYouTubeResources(mainKeyword, keywords));
  
  // Articles & Blogs
  resources.push(...generateArticleResources(mainKeyword, keywords));
  
  // Documentation
  resources.push(...generateDocumentationResources(mainKeyword, keywords));
  
  // Practice Exercises
  resources.push(...generateExerciseResources(mainKeyword, keywords));
  
  // GitHub Repositories
  resources.push(...generateGitHubResources(mainKeyword, keywords));
  
  // Online Courses
  resources.push(...generateCourseResources(mainKeyword, keywords));
  
  // Shuffle and limit resources
  return shuffleArray(resources).slice(0, 12); // Show max 12 resources
}

// Generate YouTube video resources
function generateYouTubeResources(mainKeyword, allKeywords) {
  const resources = [];
  const searchQueries = [
    `${mainKeyword} tutorial`,
    `${mainKeyword} crash course`,
    `learn ${mainKeyword}`,
    `${mainKeyword} for beginners`,
    `${mainKeyword} advanced concepts`
  ];
  
  searchQueries.forEach((query, index) => {
    resources.push({
      id: `youtube-${index}`,
      category: 'youtube',
      title: query.charAt(0).toUpperCase() + query.slice(1),
      description: `Watch tutorials and explanations about ${mainKeyword}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      source: 'YouTube Search',
      confidence: Math.min(85 + index * 3, 95),
      icon: 'youtube'
    });
  });
  
  return resources;
}

// Generate article resources
function generateArticleResources(mainKeyword, allKeywords) {
  const resources = [];
  const sources = RESOURCE_CATEGORIES.articles.sources;
  
  sources.forEach((source, index) => {
    resources.push({
      id: `article-${index}`,
      category: 'articles',
      title: `${mainKeyword} articles on ${source}`,
      description: `Read detailed articles and tutorials about ${mainKeyword}`,
      url: generateArticleURL(source, mainKeyword),
      source: source,
      confidence: 80 + index * 2,
      icon: 'article'
    });
  });
  
  return resources;
}

// Generate article URL based on source
function generateArticleURL(source, keyword) {
  const encodedKeyword = encodeURIComponent(keyword);
  
  switch(source.toLowerCase()) {
    case 'medium':
      return `https://medium.com/search?q=${encodedKeyword}`;
    case 'dev.to':
      return `https://dev.to/search?q=${encodedKeyword}`;
    case 'freecodecamp':
      return `https://www.freecodecamp.org/news/search/?query=${encodedKeyword}`;
    case 'mdn web docs':
      return `https://developer.mozilla.org/en-US/search?q=${encodedKeyword}`;
    case 'w3schools':
      return `https://www.w3schools.com/${keyword}/`;
    case 'css-tricks':
      return `https://css-tricks.com/?s=${encodedKeyword}`;
    case 'smashing magazine':
      return `https://www.smashingmagazine.com/search/?q=${encodedKeyword}`;
    default:
      return `https://www.google.com/search?q=${encodedKeyword}+${source}`;
  }
}

// Generate documentation resources
function generateDocumentationResources(mainKeyword, allKeywords) {
  const resources = [];
  
  // Common documentation URLs for tech topics
  const docsMap = {
    'javascript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    'python': 'https://docs.python.org/3/',
    'react': 'https://reactjs.org/docs/getting-started.html',
    'node': 'https://nodejs.org/en/docs/',
    'vue': 'https://vuejs.org/guide/',
    'typescript': 'https://www.typescriptlang.org/docs/',
    'django': 'https://docs.djangoproject.com/',
    'flask': 'https://flask.palletsprojects.com/',
    'tailwind': 'https://tailwindcss.com/docs',
    'bootstrap': 'https://getbootstrap.com/docs/'
  };
  
  // Check if main keyword has official docs
  if (docsMap[mainKeyword.toLowerCase()]) {
    resources.push({
      id: 'docs-official',
      category: 'documentation',
      title: `Official ${mainKeyword} Documentation`,
      description: `Complete reference and guides for ${mainKeyword}`,
      url: docsMap[mainKeyword.toLowerCase()],
      source: 'Official Docs',
      confidence: 95,
      icon: 'docs'
    });
  }
  
  // Add general documentation search
  resources.push({
    id: 'docs-general',
    category: 'documentation',
    title: `${mainKeyword} Documentation & Guides`,
    description: `Find comprehensive documentation and API references`,
    url: `https://www.google.com/search?q=${encodeURIComponent(mainKeyword)}+documentation`,
    source: 'Documentation Search',
    confidence: 85,
    icon: 'docs'
  });
  
  return resources;
}

// Generate exercise resources
function generateExerciseResources(mainKeyword, allKeywords) {
  const resources = [];
  const platforms = RESOURCE_CATEGORIES.exercises.sources;
  
  platforms.forEach((platform, index) => {
    resources.push({
      id: `exercise-${index}`,
      category: 'exercises',
      title: `Practice ${mainKeyword} on ${platform}`,
      description: `Solve coding challenges and exercises for ${mainKeyword}`,
      url: generateExerciseURL(platform, mainKeyword),
      source: platform,
      confidence: 75 + index * 3,
      icon: 'exercise'
    });
  });
  
  return resources;
}

// Generate exercise URL based on platform
function generateExerciseURL(platform, keyword) {
  const encodedKeyword = encodeURIComponent(keyword);
  
  switch(platform.toLowerCase()) {
    case 'leetcode':
      return `https://leetcode.com/problemset/all/?search=${encodedKeyword}`;
    case 'hackerrank':
      return `https://www.hackerrank.com/domains/tutorials/${encodedKeyword}`;
    case 'codewars':
      return `https://www.codewars.com/kata/search/${encodedKeyword}`;
    case 'exercism':
      return `https://exercism.org/tracks/${encodedKeyword}`;
    case 'freecodecamp challenges':
      return `https://www.freecodecamp.org/learn/${encodedKeyword}/`;
    default:
      return `https://www.google.com/search?q=${encodedKeyword}+coding+practice`;
  }
}

// Generate GitHub resources
function generateGitHubResources(mainKeyword, allKeywords) {
  const resources = [];
  
  resources.push({
    id: 'github-trending',
    category: 'github',
    title: `${mainKeyword} GitHub Repositories`,
    description: `Explore trending ${mainKeyword} projects and code examples`,
    url: `https://github.com/topics/${encodeURIComponent(mainKeyword)}`,
    source: 'GitHub Topics',
    confidence: 90,
    icon: 'github'
  });
  
  resources.push({
    id: 'github-awesome',
    category: 'github',
    title: `Awesome ${mainKeyword} List`,
    description: `Curated list of ${mainKeyword} resources, libraries, and tools`,
    url: `https://github.com/sindresorhus/awesome/blob/main/awesome.md#${encodeURIComponent(mainKeyword)}`,
    source: 'Awesome Lists',
    confidence: 85,
    icon: 'github'
  });
  
  return resources;
}

// Generate course resources
function generateCourseResources(mainKeyword, allKeywords) {
  const resources = [];
  const platforms = RESOURCE_CATEGORIES.courses.sources;
  
  platforms.forEach((platform, index) => {
    resources.push({
      id: `course-${index}`,
      category: 'courses',
      title: `Learn ${mainKeyword} on ${platform}`,
      description: `Free courses and tutorials for mastering ${mainKeyword}`,
      url: generateCourseURL(platform, mainKeyword),
      source: platform,
      confidence: 80 + index * 2,
      icon: 'course'
    });
  });
  
  return resources;
}

// Generate course URL based on platform
function generateCourseURL(platform, keyword) {
  const encodedKeyword = encodeURIComponent(keyword);
  
  switch(platform.toLowerCase()) {
    case 'freecodecamp':
      return `https://www.freecodecamp.org/learn/${encodedKeyword}/`;
    case 'coursera':
      return `https://www.coursera.org/courses?query=${encodedKeyword}&language=en`;
    case 'edx':
      return `https://www.edx.org/search?q=${encodedKeyword}`;
    case 'udemy free':
      return `https://www.udemy.com/courses/search/?q=${encodedKeyword}&price=price-free`;
    case 'youtube courses':
      return `https://www.youtube.com/results?search_query=${encodedKeyword}+full+course`;
    default:
      return `https://www.google.com/search?q=free+${encodedKeyword}+course`;
  }
}

// Display resource links
function displayResourceLinks(resources) {
  const resourceLinksContainer = document.getElementById('resource-links');
  if (!resourceLinksContainer) return;
  
  if (resources.length === 0) {
    resourceLinksContainer.innerHTML = `
      <div class="no-resources">
        <i class="fas fa-link"></i>
        <div>No resources found</div>
        <small class="text-muted">Try refreshing or watching a different video</small>
      </div>
    `;
    return;
  }
  
  // Group resources by category
  const resourcesByCategory = {};
  resources.forEach(resource => {
    if (!resourcesByCategory[resource.category]) {
      resourcesByCategory[resource.category] = [];
    }
    resourcesByCategory[resource.category].push(resource);
  });
  
  let html = '';
  
  // Display resources by category
  Object.entries(resourcesByCategory).forEach(([category, categoryResources]) => {
    const categoryInfo = RESOURCE_CATEGORIES[category];
    
    if (categoryInfo) {
      html += `<div class="resource-category">${categoryInfo.name}</div>`;
      
      categoryResources.forEach(resource => {
        html += `
          <div class="resource-item d-flex align-items-start" onclick="window.open('${resource.url}', '_blank')">
            <div class="resource-icon ${resource.icon}">
              <i class="fas fa-${getIconForCategory(category)}"></i>
            </div>
            <div class="resource-content">
              <div class="resource-title">
                ${resource.title}
                <span class="ai-generated-badge">AI</span>
              </div>
              <div class="resource-description">${resource.description}</div>
              <div class="resource-meta">
                <i class="fas fa-tag"></i>
                <span>${resource.source}</span>
                <span class="confidence-badge">${resource.confidence}% match</span>
              </div>
            </div>
          </div>
        `;
      });
    }
  });
  
  resourceLinksContainer.innerHTML = html;
}

// Get icon for category
function getIconForCategory(category) {
  const iconMap = {
    'youtube': 'play-circle',
    'articles': 'newspaper',
    'documentation': 'book',
    'exercises': 'dumbbell',
    'github': 'code-branch',
    'courses': 'graduation-cap'
  };
  return iconMap[category] || 'link';
}

// Fallback resources when no transcript available
function showFallbackResources() {
  const resourceLinksContainer = document.getElementById('resource-links');
  if (!resourceLinksContainer) return;
  
  const fallbackResources = [
    {
      category: 'youtube',
      title: 'Programming Tutorials',
      description: 'Watch programming tutorials and coding walkthroughs',
      url: 'https://www.youtube.com/results?search_query=programming+tutorial',
      source: 'YouTube',
      confidence: 90,
      icon: 'youtube'
    },
    {
      category: 'articles',
      title: 'Learn to Code Articles',
      description: 'Read articles about programming and software development',
      url: 'https://www.freecodecamp.org/news/',
      source: 'freeCodeCamp',
      confidence: 85,
      icon: 'article'
    },
    {
      category: 'exercises',
      title: 'Coding Practice',
      description: 'Practice coding with interactive exercises',
      url: 'https://www.freecodecamp.org/learn/',
      source: 'freeCodeCamp',
      confidence: 88,
      icon: 'exercise'
    },
    {
      category: 'documentation',
      title: 'MDN Web Docs',
      description: 'Comprehensive web development documentation',
      url: 'https://developer.mozilla.org/',
      source: 'MDN',
      confidence: 95,
      icon: 'docs'
    },
    {
      category: 'github',
      title: 'Awesome Learning Resources',
      description: 'Curated list of learning resources on GitHub',
      url: 'https://github.com/sindresorhus/awesome',
      source: 'GitHub',
      confidence: 92,
      icon: 'github'
    },
    {
      category: 'courses',
      title: 'Free Online Courses',
      description: 'Free programming courses from top universities',
      url: 'https://www.edx.org/learn/programming',
      source: 'edX',
      confidence: 87,
      icon: 'course'
    }
  ];
  
  displayResourceLinks(fallbackResources);
}

// Utility function to shuffle array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Also update the existing getCurrentVideoInfo function to make it accessible
// (It should already exist in your code from earlier)
window.getCurrentVideoInfo = getCurrentVideoInfo;
window.extractYouTubeTranscript = extractYouTubeTranscript;

// ====================== END RESOURCE LINKS ======================

// ====================== FACE INTERACTION TRACK (FUTURE SCOPE) ======================
 
}); 
