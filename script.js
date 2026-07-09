// ==========================================
// ⚙️ [관리자 설정] 비밀번호 및 횟수 설정 구역
// ==========================================

const ADMIN_PASSWORDS = ["1234", "7777", "admin"]; 

const TURN_PASSWORDS = {
  2: "1223",
  3: "0318",
  4: "0821",
  5: "0517",
  6: "0613",
  7: "1222" // 6턴 종료 후 최종 주가(그래프) 반영을 위한 패스워드
};

const MAX_PWD_ATTEMPTS = 3;

// ==========================================

const MAX_TURN = 6;
let currentTurn = 1;
const initialCash = 10000000;
let player = { cash: initialCash, inventory: {} };
let currentSelectedStock = null;
let currentCategory = 'all';
let chartPoints = []; 

let turnPwdAttempts = 0; 
let endPwdAttempts = 0; 
let isViolated = false; 

function getInitialMarketData() {
  return [
    { name: 'RE:CORE', cat: '주식', price: 50000, history: [50000], active: true, prev: 50000 },
    { name: '겨그린', cat: '주식', price: 15000, history: [15000], active: true, prev: 15000 },
    { name: 'DTX', cat: '주식', price: 35000, history: [35000], active: true, prev: 35000 },
    { name: '루프빈', cat: '주식', price: 85000, history: [85000], active: true, prev: 85000 },
    { name: '스페이스 X', cat: '주식', price: 150000, history: [150000], active: true, prev: 150000 },
    { name: 'SK 하이닉스', cat: '주식', price: 195000, history: [195000], active: true, prev: 195000 },
    { name: '현대차', cat: '주식', price: 245000, history: [245000], active: true, prev: 245000 },
    { name: '해선땅', cat: '부동산', price: 21000, history: [21000], active: true, prev: 21000 },
    { name: '옥땅', cat: '부동산', price: 18000, history: [18000], active: true, prev: 18000 },
    { name: '두범코인', cat: '코인', price: 450000, history: [450000], active: true, prev: 450000 }, 
    { name: 'Y코인', cat: '코인', price: 120000, history: [120000], active: true, prev: 120000 },
    { name: 'X코인', cat: '코인', price: 85000, history: [85000], active: true, prev: 85000 },
    { name: '스테이블 코인', cat: '코인', price: 1400, history: [1400], active: true, prev: 1400 },
    { name: '$10(달러)', cat: '외화', price: 15400, history: [15400], active: true, prev: 15400 },
    { name: '¥100(위안)', cat: '외화', price: 23000, history: [23000], active: true, prev: 23000 },
    { name: '금 1돈', cat: '외화', price: 95000, history: [95000], active: true, prev: 95000 }
  ];
}

let marketData = getInitialMarketData();

function getUnit(name, cat) {
  if (cat === '주식') return '주';
  if (cat === '코인') return '개';
  if (cat === '부동산') return '평';
  if (cat === '외화') {
    if (name === '$10(달러)') return 'x10달러';
    if (name === '¥100(위안)') return 'x100위안';
    if (name === '금 1돈') return '돈';
  }
  return '개';
}

window.onload = function() {
  const savedData = localStorage.getItem('stockGameState');
  if (savedData) {
    try {
      const state = JSON.parse(savedData);
      
      const elId = document.getElementById('inp-id');
      const elName = document.getElementById('inp-name');
      if(elId) elId.value = state.id;
      if(elName) elName.value = state.name;
      
      const dispId = document.getElementById('disp-id');
      const dispName = document.getElementById('disp-name');
      const dispTeamSize = document.getElementById('disp-team-size');

      if(dispId) dispId.textContent = state.id;
      if(dispName) dispName.textContent = state.name;
      
      if (dispTeamSize) {
        if (state.teamSize && state.teamSize !== "관리자") {
          dispTeamSize.textContent = `(${state.teamSize}명)`;
        } else if (state.teamSize === "관리자") {
          dispTeamSize.textContent = "(관리자)";
        }
      }
      
      currentTurn = state.currentTurn || 1;
      player = state.player || { cash: 10000000, inventory: {} };
      marketData = state.marketData || getInitialMarketData();
      endPwdAttempts = state.endPwdAttempts || 0;
      turnPwdAttempts = state.turnPwdAttempts || 0; 
      isViolated = state.violation || false;

      if (isViolated) {
        triggerViolationScreen();
        return;
      }

      if (state.id === "ADMIN") {
        const adminResetBtn = document.getElementById('btn-admin-reset-main');
        if(adminResetBtn) adminResetBtn.style.display = 'inline-block';
      }

      document.getElementById('screen-login').classList.remove('active');
      document.getElementById('screen-main').classList.add('active');

      if (currentTurn > MAX_TURN) {
        document.getElementById('disp-turn').textContent = `MARKET CLOSED`;
        const btnTurn = document.querySelector('.btn-turn');
        if(btnTurn) {
          btnTurn.textContent = `📊 최종 성적표 보기`;
          btnTurn.onclick = function() { endGame(); };
        }
        
        const trQty = document.getElementById('trade-qty');
        const bBuy = document.getElementById('btn-buy');
        const bSell = document.getElementById('btn-sell');
        if(trQty) trQty.disabled = true;
        if(bBuy) bBuy.disabled = true;
        if(bSell) bSell.disabled = true;
      } else {
        document.getElementById('disp-turn').textContent = `TURN ${currentTurn} / ${MAX_TURN}`;
        const btnTurn = document.querySelector('.btn-turn');
        if(btnTurn) btnTurn.onclick = function() { requestNextTurn(); };
      }

      renderMarket(currentCategory);
      updatePortfolioUI();
      selectStock('DTX'); 
    } catch (e) {
      console.error("데이터 복구 오류. 초기화합니다.", e);
      localStorage.removeItem('stockGameState');
    }
  }
};

function saveGame() {
  const dispTeamSize = document.getElementById('disp-team-size');
  let tSize = "1";
  if(dispTeamSize) {
    const teamSizeText = dispTeamSize.textContent;
    tSize = teamSizeText.replace(/[^0-9]/g, '');
    if (teamSizeText.includes("관리자")) tSize = "관리자";
  }

  const state = {
    id: document.getElementById('disp-id').textContent,
    name: document.getElementById('disp-name').textContent,
    teamSize: tSize,
    currentTurn: currentTurn,
    player: player,
    marketData: marketData,
    endPwdAttempts: endPwdAttempts,
    turnPwdAttempts: turnPwdAttempts,
    violation: isViolated
  };
  localStorage.setItem('stockGameState', JSON.stringify(state));
}

function toggleTeamInput() {
  const typeRadio = document.querySelector('input[name="team-input-type"]:checked');
  if (!typeRadio) return;
  
  const selEl = document.getElementById('inp-team-size-sel');
  const dirEl = document.getElementById('inp-team-size-dir');
  
  if (selEl && dirEl) {
    if (typeRadio.value === 'select') {
      selEl.style.display = 'block';
      dirEl.style.display = 'none';
    } else {
      selEl.style.display = 'none';
      dirEl.style.display = 'block';
    }
  }
}

function adminLogin() {
  const pwd = prompt("시스템 관리자 모드에 접근합니다.\n비밀번호를 입력하세요.");
  if (pwd === null) return;
  
  if (ADMIN_PASSWORDS.includes(pwd)) {
    const elId = document.getElementById('inp-id');
    const elName = document.getElementById('inp-name');
    if(elId) elId.value = "ADMIN";
    if(elName) elName.value = "운영진";
    
    document.getElementById('disp-id').textContent = "ADMIN";
    document.getElementById('disp-name').textContent = "운영진";
    const dispTeam = document.getElementById('disp-team-size');
    if(dispTeam) dispTeam.textContent = "(관리자)";
    
    const adminBtn = document.getElementById('btn-admin-reset-main');
    if(adminBtn) adminBtn.style.display = 'inline-block';
    
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-main').classList.add('active');
    
    renderMarket(currentCategory);
    updatePortfolioUI();
    selectStock('물류'); 
    saveGame();
  } else {
    alert("접근 권한이 없습니다.");
  }
}

function requestSystemReset() {
  const remaining = MAX_PWD_ATTEMPTS - endPwdAttempts;
  document.getElementById('reset-error').textContent = '';
  document.getElementById('reset-pwd').value = '';
  
  const dispId = document.getElementById('disp-id');
  const descText = document.getElementById('reset-desc-text');
  
  if(dispId && dispId.textContent === "ADMIN"){
    if(descText) descText.innerHTML = `시스템 데이터를 초기화하려면 관리자 비밀번호를 입력하세요.<br><span style="color:var(--green);">관리자 모드 접속 중 (횟수 무제한)</span>`;
  } else {
    if(descText) descText.innerHTML = `시스템 데이터를 초기화하려면 관리자 비밀번호를 입력하세요.<br><span style="color:var(--red);">남은 기회: ${remaining}번</span>`;
  }
  
  openModal('reset-lock-overlay');
  setTimeout(() => {
    const pwdEl = document.getElementById('reset-pwd');
    if(pwdEl) pwdEl.focus();
  }, 100);
}

function tryEndReset() {
  requestSystemReset();
}

function submitResetPassword() {
  const pwdEl = document.getElementById('reset-pwd');
  const pwd = pwdEl ? pwdEl.value.trim() : "";
  const dispId = document.getElementById('disp-id');
  const isAdmin = (dispId && dispId.textContent === "ADMIN");
  
  if (ADMIN_PASSWORDS.includes(pwd)) { 
    localStorage.removeItem('stockGameState');
    location.reload();
  } else {
    if(!isAdmin){
      endPwdAttempts++;
      saveGame(); 
    }
    
    if (endPwdAttempts >= MAX_PWD_ATTEMPTS) {
      closeModal('reset-lock-overlay');
      isViolated = true;
      saveGame();
      triggerViolationScreen();
    } else {
      const remaining = isAdmin ? "무제한 (관리자)" : (MAX_PWD_ATTEMPTS - endPwdAttempts) + "번";
      document.getElementById('reset-error').textContent = "❌ 보안 코드가 일치하지 않습니다.";
      document.getElementById('reset-desc-text').innerHTML = `시스템 데이터를 초기화하려면 관리자 비밀번호를 입력하세요.<br><span style="color:var(--red);">남은 기회: ${remaining}</span>`;
      if(pwdEl) {
        pwdEl.value = '';
        pwdEl.focus();
      }
    }
  }
}

function triggerViolationScreen() {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.overlay').forEach(el => el.classList.remove('open'));
  
  const dispId = document.getElementById('disp-id');
  const inpId = document.getElementById('inp-id');
  const idValue = (dispId && dispId.textContent !== "-") ? dispId.textContent : (inpId ? inpId.value : "");
  
  document.getElementById('violation-id-display').textContent = `학번: ${idValue || "미등록"}`;
  document.getElementById('violation-screen').classList.add('active');
}

function unlockViolation() {
  const pwdEl = document.getElementById('violation-unlock-pwd');
  const pwd = pwdEl ? pwdEl.value.trim() : "";
  
  if (ADMIN_PASSWORDS.includes(pwd)) {
    isViolated = false;
    turnPwdAttempts = 0; 
    endPwdAttempts = 0;  
    saveGame();
    alert("관리자 권한으로 시스템 잠금이 해제되었습니다.");
    location.reload(); 
  } else {
    alert("관리자 코드가 일치하지 않습니다.");
    if (pwdEl) {
      pwdEl.value = '';
      pwdEl.focus();
    }
  }
}

function getFluctuation(type) {
  switch(type) {
    case '대폭 상승': case '매우 상승': case '폭등': return 0.50; 
    case '상승': return 0.30;                       
    case '약간 상승': return 0.10;                  
    case '동결': return 0.0;
    case '약간 하락': case '약간 감소': return -0.10;                 
    case '하락': case '감소': return -0.30;                      
    case '대폭 하락': case '폭락': return -0.50;                 
    case '상장폐지': return -1;
    default: return 0;
  }
}

const scenarios = [
  // TURN 1
  [
    { effects: [{stock:'스페이스 X', type:'상승'},{stock:'$10(달러)', type:'상승'},{stock:'스테이블 코인', type:'상승'}] },
    { effects: [{stock:'RE:CORE', type:'하락'}] },
    { effects: [{stock:'금 1돈', type:'약간 상승'}] }, 
    { effects: [{stock:'해선땅', type:'동결'}] },
    { effects: [{stock:'SK 하이닉스', type:'상승'}] },
    { effects: [{stock:'겨그린', type:'상승'}] },
    { effects: [{stock:'DTX', type:'상승'}] },
    { effects: [{stock:'루프빈', type:'상승'}] },
    { effects: [{stock:'Y코인', type:'동결'}] },
    { effects: [{stock:'¥100(위안)', type:'하락'}] },
    { effects: [{stock:'스페이스 X', type:'대폭 상승'}] },
    { effects: [{stock:'X코인', type:'약간 상승'}] }
  ],
  // TURN 2
  [
    { effects: [{stock:'겨그린', type:'하락'}] },
    { effects: [{stock:'루프빈', type:'상승'}] },
    { effects: [{stock:'두범코인', type:'상승'}] },
    { effects: [{stock:'금 1돈', type:'약간 하락'}] },
    { effects: [{stock:'스페이스 X', type:'하락'}] },
    { effects: [{stock:'DTX', type:'하락'}] },
    { effects: [{stock:'Y코인', type:'동결'}] },
    { effects: [{stock:'현대차', type:'약간 상승'}] },
    { effects: [{stock:'해선땅', type:'상승'}] },
    { effects: [{stock:'옥땅', type:'하락'}] },
    { effects: [{stock:'X코인', type:'하락'}] }
  ],
  // TURN 3
  [
    { effects: [{stock:'$10(달러)', type:'하락'}, {stock:'스테이블 코인', type:'하락'}] },
    { effects: [{stock:'SK 하이닉스', type:'하락'}] },
    { effects: [{stock:'¥100(위안)', type:'대폭 하락'}] },
    { effects: [{stock:'스페이스 X', type:'대폭 하락'}] },
    { effects: [{stock:'루프빈', type:'대폭 하락'}] },
    { effects: [{stock:'금 1돈', type:'약간 상승'}] },
    { effects: [{stock:'현대차', type:'약간 하락'}] },
    { effects: [{stock:'DTX', type:'상승'}] },
    { effects: [{stock:'Y코인', type:'동결'}] },
    { effects: [{stock:'RE:CORE', type:'대폭 하락'}] },
    { effects: [{stock:'옥땅', type:'상승'}] },
    { effects: [{stock:'X코인', type:'약간 하락'}]}
  ],
  // TURN 4
  [
    { effects: [{stock:'RE:CORE', type:'상승'}] },
    { effects: [{stock:'겨그린', type:'상승'}] },
    { effects: [{stock:'스페이스 X', type:'상장폐지'}] },
    { effects: [{stock:'스페이스 X', type:'하락'}] },
    { effects: [{stock:'현대차', type:'상승'}] },
    { effects: [{stock:'Y코인', type:'동결'}] },
    { effects: [{stock:'루프빈', type:'상승'}] },
    { effects: [{stock:'금 1돈', type:'대폭 하락'}] },
    { effects: [{stock:'$10(달러)', type:'상승'}, {stock:'스테이블 코인', type:'상승'}] },
    { effects: [{stock:'옥땅', type:'상승'}] },
    { effects: [{stock:'해선땅', type:'상승'}] },
    { effects: [{stock:'X코인', type:'약간 하락'}]}
  ],
  // TURN 5
  [
    { effects: [{stock:'RE:CORE', type:'하락'}] },
    { effects: [{stock:'루프빈', type:'대폭 하락'}] },
    { effects: [{stock:'DTX', type:'약간 상승'}] },
    { effects: [{stock:'금 1돈', type:'동결'}] },
    { effects: [{stock:'겨그린', type:'대폭 하락'}] },
    { effects: [{stock:'Y코인', type:'동결'}] },
    { effects: [{stock:'¥100(위안)', type:'하락'}] },
    { effects: [{stock:'현대차', type:'상승'}] },
    { effects: [{stock:'SK 하이닉스', type:'대폭 하락'}] },
    { effects: [{stock:'해선땅', type:'하락'}] },
    { effects: [{stock:'X코인', type:'상승'}]}
  ],
  // TURN 6
  [
    { effects: [{stock:'DTX', type:'상승'}] },
    { effects: [{stock:'현대차', type:'대폭 하락'}] },
    { effects: [{stock:'해선땅', type:'상승'}, {stock:'SK 하이닉스', type:'상승'}] },
    { effects: [{stock:'희토류', type:'매우 상승'}] },
    { effects: [{stock:'금 1돈', type:'동결'}] },
    { effects: [{stock:'Y코인', type:'약간 상승'}] },
    { effects: [{stock:'루프빈', type:'상장폐지'}] },
    { effects: [{stock:'$10(달러)', type:'하락'}, {stock:'스테이블 코인', type:'하락'}] },
    { effects: [{stock:'겨그린', type:'상승'}] },
    { effects: [{stock:'두범코인', type:'대폭 하락'}] },
    { effects: [{stock:'X코인', type:'상장폐지'}]} 
  ]
];

function requestNextTurn() {
  const titleEl = document.getElementById('lock-title');
  const descEl = document.getElementById('lock-desc');
  const errorEl = document.getElementById('lock-error');
  const inputEl = document.getElementById('lock-pwd');
  
  if(inputEl) inputEl.value = '';
  if(errorEl) errorEl.textContent = '';
  
  const dispId = document.getElementById('disp-id');
  const isAdmin = (dispId && dispId.textContent === "ADMIN");
  const remaining = isAdmin ? "무제한 (관리자)" : (MAX_PWD_ATTEMPTS - turnPwdAttempts) + "번";
  
  if (currentTurn < MAX_TURN) {
    const targetT = currentTurn + 1;
    titleEl.textContent = `TURN ${targetT} SYSTEM LOCK`;
    descEl.innerHTML = `현재 시장이 마감되었습니다.<br>다음 회차(TURN ${targetT}) 거래를 재개하려면<br>운영진의 보안 암호를 해독하십시오.<br><span style="color:var(--red);">남은 기회: ${remaining}</span>`;
  } else {
    titleEl.textContent = `FINAL CALCULATION`;
    descEl.innerHTML = `모든 시장 거래가 마감되었습니다.<br>최종 주가를 반영하려면<br>운영진의 보안 암호를 해독하십시오.<br><span style="color:var(--red);">남은 기회: ${remaining}</span>`;
  }
  
  openModal('turn-lock-overlay');
  setTimeout(() => { if(inputEl) inputEl.focus(); }, 100);
}

function submitPassword() {
  const targetT = currentTurn <= MAX_TURN ? currentTurn + 1 : 7;
  const inputEl = document.getElementById('lock-pwd');
  const errorEl = document.getElementById('lock-error');
  const descEl = document.getElementById('lock-desc');
  const pwd = inputEl ? inputEl.value.trim() : "";
  
  const correctPwd = TURN_PASSWORDS[targetT];
  const dispId = document.getElementById('disp-id');
  const isAdmin = (dispId && dispId.textContent === "ADMIN");
  const isAdminPass = (isAdmin && ADMIN_PASSWORDS.includes(pwd));

  if (pwd === correctPwd || isAdminPass) {
    turnPwdAttempts = 0; 
    closeModal('turn-lock-overlay');
    
    if (currentTurn <= MAX_TURN) {
      executeMarketFluctuation(currentTurn);
    }
  } else {
    if (!isAdmin) {
      turnPwdAttempts++; 
      saveGame(); 
    }

    if (turnPwdAttempts >= MAX_PWD_ATTEMPTS) {
      closeModal('turn-lock-overlay');
      isViolated = true;
      saveGame();
      triggerViolationScreen();
    } else {
      const remaining = isAdmin ? "무제한 (관리자)" : (MAX_PWD_ATTEMPTS - turnPwdAttempts) + "번";
      if(errorEl) errorEl.textContent = "❌ 보안 코드가 일치하지 않습니다.";
      
      if (descEl) {
        if (currentTurn < MAX_TURN) {
          descEl.innerHTML = `현재 시장이 마감되었습니다.<br>다음 회차(TURN ${targetT}) 거래를 재개하려면<br>운영진의 보안 암호를 해독하십시오.<br><span style="color:var(--red);">남은 기회: ${remaining}</span>`;
        } else {
          descEl.innerHTML = `모든 시장 거래가 마감되었습니다.<br>최종 주가를 반영하려면<br>운영진의 보안 암호를 해독하십시오.<br><span style="color:var(--red);">남은 기회: ${remaining}</span>`;
        }
      }

      if(inputEl) {
        inputEl.value = '';
        inputEl.focus();
      }
    }
  }
}

function executeMarketFluctuation(completedTurn) {
  const currentNews = scenarios[completedTurn - 1];
  let turnNetRates = {}; 
  
  currentNews.forEach(newsItem => {
    newsItem.effects.forEach(effect => {
      if(!turnNetRates[effect.stock]) turnNetRates[effect.stock] = 0;
      const rate = getFluctuation(effect.type);
      if (rate === -1) {
        turnNetRates[effect.stock] = -1;
      } else if (turnNetRates[effect.stock] !== -1) {
        turnNetRates[effect.stock] += rate;
      }
    });
  });

  marketData.forEach(stock => {
    if(!stock.active) return;
    stock.prev = stock.price;
    let netRate = turnNetRates[stock.name];
    
    if (netRate === -1) {
      stock.price = 0;
      stock.active = false;
    } else {
      if (netRate === undefined) {
        netRate = 0; 
      } else {
        if (netRate > 0.50) netRate = 0.50; 
        if (netRate < -0.50) netRate = -0.50;
      }
      stock.price = Math.floor(stock.price * (1 + netRate));
      if(stock.price <= 0) stock.price = 10;
    }
    stock.history.push(stock.price);
  });

  currentTurn = completedTurn + 1;
  
  if (currentTurn > MAX_TURN) {
    for (const [name, info] of Object.entries(player.inventory)) {
      const stockObj = marketData.find(s => s.name === name);
      const finalPrice = stockObj.active ? stockObj.price : 0;
      player.cash += finalPrice * info.qty;
    }
    player.inventory = {}; 

    document.getElementById('disp-turn').textContent = `MARKET CLOSED`;
    const btnTurn = document.querySelector('.btn-turn');
    if(btnTurn) {
      btnTurn.textContent = `📊 최종 성적표 보기`;
      btnTurn.onclick = function() { endGame(); };
    }
    
    const tradeQty = document.getElementById('trade-qty');
    const btnBuy = document.getElementById('btn-buy');
    const btnSell = document.getElementById('btn-sell');
    
    if(tradeQty) tradeQty.disabled = true;
    if(btnBuy) btnBuy.disabled = true;
    if(btnSell) btnSell.disabled = true;
  } else {
    document.getElementById('disp-turn').textContent = `TURN ${currentTurn} / ${MAX_TURN}`;
    const btnTurn = document.querySelector('.btn-turn');
    if(btnTurn) btnTurn.onclick = function() { requestNextTurn(); };
  }

  renderMarket(currentCategory);
  updatePortfolioUI();
  if(currentSelectedStock) selectStock(currentSelectedStock.name);
  saveGame();
}

function endGame() {
  const finalTotal = player.cash; 
  const yieldRate = ((finalTotal - initialCash) / initialCash * 100).toFixed(1);
  
  document.getElementById('end-total').textContent = finalTotal.toLocaleString() + '원';
  
  const yieldEl = document.getElementById('end-yield');
  if(yieldEl) {
    yieldEl.textContent = yieldRate > 0 ? `+${yieldRate}%` : `${yieldRate}%`;
    yieldEl.style.color = yieldRate > 0 ? 'var(--red)' : (yieldRate < 0 ? 'var(--blue)' : 'var(--text)');
  }

  let rankText = "";
  if (yieldRate >= 100) rankText = "👑 워렌 버핏의 재림";
  else if (yieldRate >= 30) rankText = "🚀 전설적인 투자자";
  else if (yieldRate > 0) rankText = "👍 훌륭한 시장 방어력";
  else if (yieldRate > -30) rankText = "📉 뼈아픈 수업료";
  else rankText = "☠️ 상장폐지의 늪";
  
  document.getElementById('end-rank').textContent = rankText;
  document.getElementById('end-overlay').classList.add('open');
}

function startGame() {
  const elId = document.getElementById('inp-id');
  const elName = document.getElementById('inp-name');
  
  if(!elId || !elName) return;

  const id = elId.value.trim();
  const name = elName.value.trim();
  
  let teamSize = "";
  
  const typeRadio = document.querySelector('input[name="team-input-type"]:checked');
  const selEl = document.getElementById('inp-team-size-sel');
  const dirEl = document.getElementById('inp-team-size-dir');
  const oldEl = document.getElementById('inp-team-size');

  if (selEl && dirEl) {
    const inputType = typeRadio ? typeRadio.value : 'select';
    teamSize = (inputType === 'select') ? selEl.value : dirEl.value.trim();
  } else if (oldEl) {
    teamSize = oldEl.value.trim();
  } else {
    teamSize = "1"; 
  }

  if(!id || !name || !teamSize) {
    return alert('학번, 이름, 팀원 수를 모두 정확히 입력해주세요.');
  }
  
  const dispId = document.getElementById('disp-id');
  const dispName = document.getElementById('disp-name');
  const dispTeamSize = document.getElementById('disp-team-size');
  
  if(dispId) dispId.textContent = id;
  if(dispName) dispName.textContent = name;
  if(dispTeamSize) dispTeamSize.textContent = `(${teamSize}명)`;
  
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('screen-main').classList.add('active');
  
  renderMarket(currentCategory);
  updatePortfolioUI();
  selectStock('물류'); 
  saveGame();
}

function renderMarket(filterCat = 'all') {
  const container = document.getElementById('stock-list-container');
  if(!container) return;
  container.innerHTML = '';
  
  const categories = ['주식', '부동산', '코인', '외화'];
  
  categories.forEach(cat => {
    if(filterCat !== 'all' && cat !== filterCat) return;
    const catStocks = marketData.filter(s => s.cat === cat);
    if(catStocks.length === 0) return;
    
    const divider = document.createElement('div');
    divider.className = 'group-divider';
    divider.textContent = `── ${cat} (${catStocks.length}) ──`;
    container.appendChild(divider);
    
    catStocks.forEach(stock => {
      const diff = stock.price - stock.prev;
      const rate = stock.prev === 0 ? 0 : ((diff / stock.prev) * 100).toFixed(1);
      const colorClass = !stock.active ? '' : (diff > 0 ? 'up' : (diff < 0 ? 'dn' : ''));
      const sign = !stock.active ? '' : (diff > 0 ? '▲' : (diff < 0 ? '▼' : '-'));
      
      const priceText = stock.active ? `${stock.price.toLocaleString()} (${sign}${Math.abs(rate)}%)` : '[상장폐지]';
      
      const div = document.createElement('div');
      div.className = `stock-item ${currentSelectedStock && currentSelectedStock.name === stock.name ? 'selected' : ''} ${!stock.active ? 'delisted' : ''}`;
      if(stock.active) div.onclick = () => selectStock(stock.name);
      div.innerHTML = `<span class="sname">${stock.name}</span><span class="sprice ${colorClass}">${priceText}</span>`;
      container.appendChild(div);
    });
  });
}

function filterCat(cat, btn) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  currentCategory = cat;
  renderMarket(cat);
}

function selectStock(name) {
  currentSelectedStock = marketData.find(s => s.name === name);
  if(!currentSelectedStock) return;
  
  const btnBuy = document.getElementById('btn-buy');
  const btnSell = document.getElementById('btn-sell');
  const trQty = document.getElementById('trade-qty');
  
  if(!currentSelectedStock.active || currentTurn > MAX_TURN) {
    if(btnBuy) btnBuy.disabled = true;
    if(btnSell) btnSell.disabled = true;
    if(trQty) trQty.disabled = true;
  } else {
    if(btnBuy) btnBuy.disabled = false;
    if(btnSell) btnSell.disabled = false;
    if(trQty) trQty.disabled = false;
  }

  renderMarket(currentCategory);
  
  const diff = currentSelectedStock.price - currentSelectedStock.prev;
  const rate = ((diff / currentSelectedStock.prev) * 100).toFixed(1);
  const color = diff > 0 ? 'var(--red)' : (diff < 0 ? 'var(--blue)' : 'var(--text)');

  document.getElementById('selected-stock-name').textContent = `[${currentSelectedStock.cat}] ${currentSelectedStock.name}`;
  document.getElementById('selected-stock-details').innerHTML = `<span style="font-size:24px; font-weight:900; color:${color};">${currentSelectedStock.price.toLocaleString()}원</span><span style="margin-left:10px; color:${color};">${diff > 0 ? '+'+diff.toLocaleString() : diff.toLocaleString()}원 (${rate}%)</span>`;
  document.getElementById('trade-target').textContent = `${currentSelectedStock.name} (현재가: ${currentSelectedStock.price.toLocaleString()}원)`;
  
  drawChart();
}

function drawChart() {
  if(!currentSelectedStock || !currentSelectedStock.active) {
    const cvs = document.getElementById('stockChart');
    if(cvs) cvs.getContext('2d').clearRect(0,0,2000,1000);
    return;
  }
  const canvas = document.getElementById('stockChart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const history = currentSelectedStock.history;
  chartPoints = []; 
  
  if(history.length === 0) return;

  const maxPrice = Math.max(...history);
  const minPrice = Math.min(...history);
  const range = (maxPrice - minPrice) || 1; 
  
  const paddingYTop = 30;
  const paddingYBottom = 30;
  const drawingHeight = canvas.height - paddingYTop - paddingYBottom;
  const paddingX = 20;
  const drawingWidth = canvas.width - paddingX * 2;
  
  const stepX = history.length > 1 ? drawingWidth / (history.length - 1) : 0;
  const startPrice = history[0];
  const isUp = history[history.length-1] >= startPrice;
  const lineColor = isUp ? '#fa5252' : '#4dabf7';

  const startYRatio = (startPrice - minPrice) / range;
  const startY = canvas.height - paddingYBottom - (startYRatio * drawingHeight);
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1;
  ctx.moveTo(paddingX, startY);
  ctx.lineTo(canvas.width - paddingX, startY);
  ctx.stroke();
  ctx.setLineDash([]); 

  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

  history.forEach((price, index) => {
    const x = paddingX + index * stepX;
    const yRatio = (price - minPrice) / range;
    const y = canvas.height - paddingYBottom - (yRatio * drawingHeight);
    
    chartPoints.push({ x: x, y: y, price: price, turn: index + 1 });
    if(index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  
  if(history.length === 1) {
    ctx.fillStyle = lineColor;
    ctx.arc(paddingX, canvas.height/2, 4, 0, Math.PI*2);
    ctx.fill();
    return;
  }
  ctx.stroke();
  
  ctx.lineTo(canvas.width - paddingX, canvas.height);
  ctx.lineTo(paddingX, canvas.height);
  ctx.closePath();
  
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if(isUp) {
    gradient.addColorStop(0, 'rgba(250, 82, 82, 0.3)');
    gradient.addColorStop(1, 'rgba(250, 82, 82, 0)');
  } else {
    gradient.addColorStop(0, 'rgba(77, 171, 247, 0.3)');
    gradient.addColorStop(1, 'rgba(77, 171, 247, 0)');
  }
  ctx.fillStyle = gradient;
  ctx.fill();
}

const graphContainer = document.getElementById('graph-container');
const tooltip = document.getElementById('chart-tooltip');
const crosshairX = document.getElementById('chart-crosshair-x');

if (graphContainer) {
  graphContainer.addEventListener('mousemove', (e) => {
    if (chartPoints.length < 2) return;
    const rect = graphContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestPoint = chartPoints[0];
    let minDiff = Math.abs(mouseX - closestPoint.x);

    for (let i = 1; i < chartPoints.length; i++) {
      const diff = Math.abs(mouseX - chartPoints[i].x);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = chartPoints[i];
      }
    }

    if(tooltip && crosshairX) {
      tooltip.style.display = 'block';
      crosshairX.style.display = 'block';
      tooltip.style.left = `${closestPoint.x}px`;
      tooltip.style.top = `${closestPoint.y}px`;
      tooltip.innerHTML = `<span style="color:#a0a8b1;">Turn ${closestPoint.turn}</span><br><strong style="font-size:13px;">${closestPoint.price.toLocaleString()}원</strong>`;
      crosshairX.style.left = `${closestPoint.x}px`;
    }
  });

  graphContainer.addEventListener('mouseleave', () => {
    if(tooltip) tooltip.style.display = 'none';
    if(crosshairX) crosshairX.style.display = 'none';
  });
}

function buyStock() {
  if(!currentSelectedStock || !currentSelectedStock.active) return alert('유효한 종목을 선택하세요.');
  const qtyEl = document.getElementById('trade-qty');
  const qty = qtyEl ? parseInt(qtyEl.value) : 0;
  if(isNaN(qty) || qty <= 0) return alert('올바른 수량을 입력하세요.');
  const totalCost = currentSelectedStock.price * qty;
  if(player.cash < totalCost) return alert('보유 현금이 부족합니다.');
  
  player.cash -= totalCost;
  if(!player.inventory[currentSelectedStock.name]) player.inventory[currentSelectedStock.name] = { qty: 0, avgPrice: 0 };
  
  const item = player.inventory[currentSelectedStock.name];
  const totalValueBefore = item.qty * item.avgPrice;
  item.qty += qty;
  item.avgPrice = Math.floor((totalValueBefore + totalCost) / item.qty);
  
  updatePortfolioUI();
  saveGame();
}

function sellStock() {
  if(!currentSelectedStock || !currentSelectedStock.active) return alert('유효한 종목을 선택하세요.');
  const qtyEl = document.getElementById('trade-qty');
  const qty = qtyEl ? parseInt(qtyEl.value) : 0;
  if(isNaN(qty) || qty <= 0) return alert('올바른 수량을 입력하세요.');
  
  const item = player.inventory[currentSelectedStock.name];
  if(!item || item.qty < qty) return alert('보유 수량이 부족합니다.');
  
  const revenue = currentSelectedStock.price * qty;
  player.cash += revenue;
  item.qty -= qty;
  if(item.qty === 0) delete player.inventory[currentSelectedStock.name];
  
  updatePortfolioUI();
  saveGame();
}

function updatePortfolioUI() {
  const myCashEl = document.getElementById('my-cash');
  if(myCashEl) myCashEl.textContent = player.cash.toLocaleString() + '원';
  
  let totalStockValue = 0;
  const portList = document.getElementById('portfolio-list');
  if(!portList) return;
  portList.innerHTML = '';
  
  for(const [name, info] of Object.entries(player.inventory)) {
    const stockObj = marketData.find(s => s.name === name);
    const currentPrice = stockObj.price;
    const isDelisted = !stockObj.active;
    
    const currentVal = isDelisted ? 0 : currentPrice * info.qty;
    totalStockValue += currentVal;
    
    const yieldRate = isDelisted ? -100.0 : (((currentPrice - info.avgPrice) / info.avgPrice) * 100).toFixed(1);
    const yColor = yieldRate > 0 ? 'var(--red)' : (yieldRate < 0 ? 'var(--blue)' : 'var(--text)');
    const yieldText = isDelisted ? '상장폐지(-100%)' : `${yieldRate}%`;
    
    const unit = getUnit(stockObj.name, stockObj.cat);
    
    portList.innerHTML += `<div class="port-item"><span style="${isDelisted?'text-decoration:line-through;color:#777;':''}">${name} <strong style="color:var(--text); margin-left:4px;">${info.qty}</strong>${unit}</span><span style="color:${yColor}; font-weight:700;">${yieldText}</span></div>`;
  }
  
  if(Object.keys(player.inventory).length === 0) {
    portList.innerHTML = '<div style="color:var(--muted); text-align:center; padding:10px 0;">보유 자산이 없습니다.</div>';
  }
  
  const totalAsset = player.cash + totalStockValue;
  const myTotalEl = document.getElementById('my-total');
  if(myTotalEl) myTotalEl.textContent = totalAsset.toLocaleString() + '원';
}

function openModal(id) { 
  const el = document.getElementById(id);
  if(el) el.classList.add('open'); 
}
function closeModal(id) { 
  const el = document.getElementById(id);
  if(el) el.classList.remove('open'); 
}

window.addEventListener('resize', () => {
  const main = document.getElementById('screen-main');
  if(main && main.classList.contains('active')) drawChart();
});
