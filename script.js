// ==================== GAME STATE ====================
const gameState = {
  balance: 1000,
  initialBalance: 1000,
  gameActive: false,
  gamePaused: false,
  selectedColor: null,
  totalBets: 0,
  wins: 0,
  losses: 0,
  timeRemaining: 60,
  totalGameDuration: 60,
  winMultiplier: 2,
  minBet: 1,
  maxBet: 10000,
  totalWagered: 0,
  totalWon: 0,
  betHistory: [],
  colorWins: { red: 0, green: 0, violet: 0 },
  colorProbabilities: { red: 33.33, green: 33.33, violet: 33.34 },
  customColors: { red: '#FF0000', green: '#00FF00', violet: '#8B00FF' },
  settings: {
    sound: true,
    animations: true,
    notifications: true,
    theme: 'dark'
  },
  adminLog: []
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  initializeEventListeners();
  loadGameData();
  updateDisplay();
});

// ==================== EVENT LISTENERS ====================
function initializeEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', switchSection);
  });

  // Game Controls
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', selectColor);
  });

  document.querySelectorAll('.quick-bet').forEach(btn => {
    btn.addEventListener('click', setQuickBet);
  });

  document.getElementById('placeBetBtn').addEventListener('click', placeBet);
  document.getElementById('resetGameBtn').addEventListener('click', resetGame);
  document.getElementById('pauseGameBtn').addEventListener('click', togglePauseGame);

  // Settings
  document.getElementById('soundToggle').addEventListener('change', updateSettings);
  document.getElementById('animationToggle').addEventListener('change', updateSettings);
  document.getElementById('notificationToggle').addEventListener('change', updateSettings);
  document.getElementById('themeSelect').addEventListener('change', updateSettings);
  document.getElementById('textSizeSelect').addEventListener('change', updateSettings);
}

// ==================== SECTION NAVIGATION ====================
function switchSection(e) {
  const sectionName = e.target.dataset.section;
  
  // Update active nav button
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');

  // Update active section
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionName).classList.add('active');

  // Refresh analytics when switching to analytics section
  if (sectionName === 'analytics') {
    updateAnalytics();
  }
}

// ==================== GAME LOGIC ====================
function selectColor(e) {
  const color = e.currentTarget.dataset.color;
  
  // Remove active state from all buttons
  document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
  
  // Add active state to clicked button
  e.currentTarget.classList.add('active');
  
  gameState.selectedColor = color;
  document.getElementById('selectedColor').textContent = `Selected: ${color.toUpperCase()}`;
  
  addAdminLog(`Color selected: ${color}`, 'info');
}

function setQuickBet(e) {
  const amount = e.target.dataset.amount;
  document.getElementById('betAmount').value = amount;
}

function placeBet() {
  // Validation
  if (!gameState.selectedColor) {
    showNotification('Please select a color first!', 'warning');
    return;
  }

  const betAmount = parseInt(document.getElementById('betAmount').value);
  
  if (!betAmount || betAmount < gameState.minBet || betAmount > gameState.maxBet) {
    showNotification(`Bet must be between $${gameState.minBet} and $${gameState.maxBet}`, 'warning');
    return;
  }

  if (betAmount > gameState.balance) {
    showNotification('Insufficient balance!', 'warning');
    return;
  }

  // Deduct bet from balance
  gameState.balance -= betAmount;
  gameState.totalWagered += betAmount;
  gameState.totalBets++;

  // Determine winning color
  const winningColor = getRandomColor();
  const isWin = winningColor === gameState.selectedColor;

  // Update balance and stats
  if (isWin) {
    const winAmount = betAmount * gameState.winMultiplier;
    gameState.balance += winAmount;
    gameState.totalWon += winAmount;
    gameState.wins++;
    showWinResult(betAmount, winAmount);
  } else {
    gameState.losses++;
    showLossResult(betAmount);
  }

  // Update color win count
  gameState.colorWins[winningColor]++;

  // Record bet in history
  recordBet(gameState.selectedColor, betAmount, isWin, winningColor);

  // Update displays
  updateDisplay();
  addAdminLog(`Bet placed: $${betAmount} on ${gameState.selectedColor} - ${isWin ? 'WIN' : 'LOSS'}`, isWin ? 'success' : 'info');

  // Check for game over
  if (gameState.balance <= 0) {
    endGame();
  }
}

function getRandomColor() {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const [color, prob] of Object.entries(gameState.colorProbabilities)) {
    cumulative += prob;
    if (random < cumulative) {
      return color;
    }
  }

  return 'red';
}

function showWinResult(betAmount, winAmount) {
  const resultEl = document.getElementById('resultText');
  const colorCircle = document.getElementById('winningColorCircle');
  
  resultEl.textContent = `🎉 YOU WIN! +$${winAmount}`;
  resultEl.className = 'result-win';
  
  colorCircle.style.background = gameState.customColors[gameState.selectedColor];
  colorCircle.classList.add('active');
  
  if (gameState.settings.sound) playSound('win');
  if (gameState.settings.notifications) showNotification('You won! 🎉', 'success');

  setTimeout(() => colorCircle.classList.remove('active'), 1000);
}

function showLossResult(betAmount) {
  const resultEl = document.getElementById('resultText');
  const colorCircle = document.getElementById('winningColorCircle');
  
  resultEl.textContent = `❌ YOU LOST! -$${betAmount}`;
  resultEl.className = 'result-lose';
  
  colorCircle.style.background = '#444';
  colorCircle.classList.add('active');
  
  if (gameState.settings.sound) playSound('lose');
  if (gameState.settings.notifications) showNotification('You lost this round', 'error');

  setTimeout(() => colorCircle.classList.remove('active'), 1000);
}

function recordBet(selectedColor, amount, isWin, winningColor) {
  gameState.betHistory.unshift({
    selectedColor,
    amount,
    result: isWin ? 'WIN' : 'LOSS',
    winningColor,
    timestamp: new Date().toLocaleTimeString()
  });

  // Keep only last 50 bets
  if (gameState.betHistory.length > 50) {
    gameState.betHistory.pop();
  }
}

// ==================== GAME CONTROL ====================
function resetGame() {
  gameState.balance = gameState.initialBalance;
  gameState.selectedColor = null;
  gameState.totalBets = 0;
  gameState.wins = 0;
  gameState.losses = 0;
  gameState.totalWagered = 0;
  gameState.totalWon = 0;
  gameState.betHistory = [];
  gameState.colorWins = { red: 0, green: 0, violet: 0 };
  
  document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('betAmount').value = '';
  document.getElementById('selectedColor').textContent = 'No color selected';
  document.getElementById('resultText').textContent = 'Place a bet to start playing';
  
  updateDisplay();
  addAdminLog('Game reset', 'info');
  saveGameData();
}

function togglePauseGame() {
  gameState.gamePaused = !gameState.gamePaused;
  const btn = document.getElementById('pauseGameBtn');
  btn.textContent = gameState.gamePaused ? 'Resume' : 'Pause';
  addAdminLog(`Game ${gameState.gamePaused ? 'paused' : 'resumed'}`, 'info');
}

function endGame() {
  gameState.gameActive = false;
  document.getElementById('placeBetBtn').disabled = true;
  showNotification('Game Over! Your balance reached $0', 'error');
  addAdminLog('Game ended - Balance depleted', 'error');
}

// ==================== DISPLAY UPDATES ====================
function updateDisplay() {
  // Game balance and stats
  document.getElementById('gameBalance').textContent = `$${gameState.balance}`;
  document.getElementById('gameTimer').textContent = `${gameState.timeRemaining}s`;
  document.getElementById('gameWinRate').textContent = gameState.totalBets > 0 
    ? `${Math.round((gameState.wins / gameState.totalBets) * 100)}%` 
    : '0%';

  // Game stats
  document.getElementById('totalBets').textContent = gameState.totalBets;
  document.getElementById('winCount').textContent = gameState.wins;
  document.getElementById('lossCount').textContent = gameState.losses;
  const profit = gameState.totalWon - gameState.totalWagered;
  document.getElementById('totalProfit').textContent = `$${profit}`;

  // Save game data
  saveGameData();
}

function updateAnalytics() {
  document.getElementById('totalGamesPlayed').textContent = gameState.totalBets;
  document.getElementById('analyticBalance').textContent = `$${gameState.balance}`;
  document.getElementById('totalWagered').textContent = `$${gameState.totalWagered}`;
  document.getElementById('totalWon').textContent = `$${gameState.totalWon}`;
  document.getElementById('analyticWins').textContent = gameState.wins;
  document.getElementById('analyticLosses').textContent = gameState.losses;
  
  const winRate = gameState.totalBets > 0 
    ? Math.round((gameState.wins / gameState.totalBets) * 100)
    : 0;
  document.getElementById('analyticWinRate').textContent = `${winRate}%`;
  
  const avgBet = gameState.totalBets > 0 
    ? Math.round(gameState.totalWagered / gameState.totalBets)
    : 0;
  document.getElementById('avgBet').textContent = `$${avgBet}`;

  document.getElementById('redWins').textContent = gameState.colorWins.red;
  document.getElementById('greenWins').textContent = gameState.colorWins.green;
  document.getElementById('violetWins').textContent = gameState.colorWins.violet;

  // Update bet history
  updateBetHistory();
}

function updateBetHistory() {
  const historyContainer = document.getElementById('betHistory');
  
  if (gameState.betHistory.length === 0) {
    historyContainer.innerHTML = '<p>No bets placed yet</p>';
    return;
  }

  let html = '';
  gameState.betHistory.slice(0, 10).forEach(bet => {
    html += `
      <div class="bet-entry">
        <div>
          <div class="bet-entry-label">Time</div>
          <div class="bet-entry-value">${bet.timestamp}</div>
        </div>
        <div>
          <div class="bet-entry-label">Selected</div>
          <div class="bet-entry-value">${bet.selectedColor}</div>
        </div>
        <div>
          <div class="bet-entry-label">Amount</div>
          <div class="bet-entry-value">$${bet.amount}</div>
        </div>
        <div>
          <div class="bet-entry-label">Result</div>
          <div class="bet-entry-value" style="color: ${bet.result === 'WIN' ? '#00ff00' : '#ff6b6b'}">${bet.result}</div>
        </div>
      </div>
    `;
  });
  
  historyContainer.innerHTML = html;
}

// ==================== ADMIN PANEL FUNCTIONS ====================
function updateGameBalance() {
  const newBalance = parseInt(document.getElementById('adminBalance').value);
  if (newBalance && newBalance > 0) {
    gameState.balance = newBalance;
    gameState.initialBalance = newBalance;
    updateDisplay();
    addAdminLog(`Balance updated to $${newBalance}`, 'success');
  }
}

function updateGameDuration() {
  const newDuration = parseInt(document.getElementById('adminDuration').value);
  if (newDuration && newDuration > 0) {
    gameState.totalGameDuration = newDuration;
    gameState.timeRemaining = newDuration;
    addAdminLog(`Game duration updated to ${newDuration}s`, 'success');
  }
}

function updateWinMultiplier() {
  const newMultiplier = parseFloat(document.getElementById('adminMultiplier').value);
  if (newMultiplier && newMultiplier > 0) {
    gameState.winMultiplier = newMultiplier;
    addAdminLog(`Win multiplier updated to ${newMultiplier}x`, 'success');
  }
}

function updateProbabilities() {
  const red = parseFloat(document.getElementById('adminRedProb').value);
  const green = parseFloat(document.getElementById('adminGreenProb').value);
  const violet = parseFloat(document.getElementById('adminVioletProb').value);

  const total = red + green + violet;
  if (total !== 100) {
    alert('Probabilities must sum to 100%');
    return;
  }

  gameState.colorProbabilities = { red, green, violet };
  addAdminLog(`Probabilities updated - Red: ${red}%, Green: ${green}%, Violet: ${violet}%`, 'success');
}

function updateBetLimits() {
  const minBet = parseInt(document.getElementById('adminMinBet').value);
  const maxBet = parseInt(document.getElementById('adminMaxBet').value);

  if (minBet < 1 || maxBet < minBet) {
    alert('Invalid bet limits');
    return;
  }

  gameState.minBet = minBet;
  gameState.maxBet = maxBet;
  addAdminLog(`Bet limits updated - Min: $${minBet}, Max: $${maxBet}`, 'success');
}

function updateColors() {
  const red = document.getElementById('adminRedColor').value;
  const green = document.getElementById('adminGreenColor').value;
  const violet = document.getElementById('adminVioletColor').value;

  gameState.customColors = { red, green, violet };
  
  // Update CSS variables
  document.documentElement.style.setProperty('--color-red', red);
  document.documentElement.style.setProperty('--color-green', green);
  document.documentElement.style.setProperty('--color-violet', violet);

  addAdminLog('Custom colors applied', 'success');
}

function adminStartGame() {
  gameState.gameActive = true;
  document.getElementById('placeBetBtn').disabled = false;
  addAdminLog('Game started by admin', 'success');
}

function adminStopGame() {
  gameState.gameActive = false;
  document.getElementById('placeBetBtn').disabled = true;
  addAdminLog('Game stopped by admin', 'info');
}

function adminResetGame() {
  resetGame();
  addAdminLog('Game reset by admin', 'info');
}

function adminClearAllData() {
  if (confirm('Are you sure you want to clear all game data? This cannot be undone!')) {
    gameState.balance = gameState.initialBalance;
    gameState.totalBets = 0;
    gameState.wins = 0;
    gameState.losses = 0;
    gameState.totalWagered = 0;
    gameState.totalWon = 0;
    gameState.betHistory = [];
    gameState.colorWins = { red: 0, green: 0, violet: 0 };
    
    updateDisplay();
    updateAnalytics();
    addAdminLog('All game data cleared by admin', 'error');
    saveGameData();
  }
}

function adminSetWinningColor() {
  const forceColor = document.getElementById('adminForceColor').value;
  // This would be used in a real game to set the next winning color
  addAdminLog(`Winning color force set to: ${forceColor}`, 'info');
}

function adminAddFunds() {
  const funds = parseInt(document.getElementById('adminAddFunds').value);
  if (funds > 0) {
    gameState.balance += funds;
    updateDisplay();
    addAdminLog(`Admin added $${funds} to balance`, 'success');
  }
}

// ==================== SETTINGS ====================
function updateSettings(e) {
  const setting = e.target.id;
  
  if (setting === 'soundToggle') {
    gameState.settings.sound = e.target.checked;
  } else if (setting === 'animationToggle') {
    gameState.settings.animations = e.target.checked;
  } else if (setting === 'notificationToggle') {
    gameState.settings.notifications = e.target.checked;
  } else if (setting === 'themeSelect') {
    gameState.settings.theme = e.target.value;
  } else if (setting === 'textSizeSelect') {
    const size = e.target.value;
    document.documentElement.style.setProperty('--text-size', 
      size === 'small' ? '12px' : size === 'large' ? '16px' : '14px');
  }

  saveGameData();
}

// ==================== DATA MANAGEMENT ====================
function saveGameData() {
  localStorage.setItem('colourGameState', JSON.stringify(gameState));
}

function loadGameData() {
  const saved = localStorage.getItem('colourGameState');
  if (saved) {
    Object.assign(gameState, JSON.parse(saved));
    updateDisplay();
  }
}

function exportGameData() {
  const dataStr = JSON.stringify(gameState, null, 2);
  downloadFile(dataStr, 'colour-game-data.json', 'application/json');
}

function downloadCSV() {
  let csv = 'Date,Time,Selected Color,Bet Amount,Result,Winning Color\n';
  gameState.betHistory.reverse().forEach(bet => {
    csv += `${new Date().toLocaleDateString()},${bet.timestamp},${bet.selectedColor},$${bet.amount},${bet.result},${bet.winningColor}\n`;
  });
  downloadFile(csv, 'colour-game-stats.csv', 'text/csv');
}

function downloadFile(content, fileName, contentType) {
  const element = document.createElement('a');
  element.setAttribute('href', `data:${contentType};charset=utf-8,` + encodeURIComponent(content));
  element.setAttribute('download', fileName);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function deleteAllData() {
  if (confirm('Delete all local game data? This cannot be undone!')) {
    localStorage.removeItem('colourGameState');
    location.reload();
  }
}

// ==================== UTILITIES ====================
function addAdminLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  gameState.adminLog.unshift({ message, type, timestamp });

  // Keep only last 100 logs
  if (gameState.adminLog.length > 100) {
    gameState.adminLog.pop();
  }

  updateAdminLog();
}

function updateAdminLog() {
  const logContainer = document.getElementById('adminLog');
  let html = '';
  
  gameState.adminLog.forEach(entry => {
    html += `<div class="log-entry ${entry.type}">[${entry.timestamp}] ${entry.message}</div>`;
  });

  logContainer.innerHTML = html || '<div class="log-entry info">No admin actions yet</div>';
  logContainer.scrollTop = logContainer.scrollHeight;
}

function showNotification(message, type) {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // You can add toast notifications here if desired
}

function playSound(type) {
  // Play sound effects if enabled
  // This is a placeholder - implement with Web Audio API or audio elements
}
