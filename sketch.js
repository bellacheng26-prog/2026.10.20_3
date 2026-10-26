const questions = [
      { id: 0, title: "想知道今天幾度，要用什麼工具？", options: ["尺", "溫度計", "時鐘"], ans: 1 },
      { id: 1, title: "雨過天晴後，天空常出現的七彩光弧是什麼？", options: ["彩虹", "閃電", "流星"], ans: 0 },
      { id: 2, title: "太陽放射出的光與熱，稱為什麼？", options: ["陽光", "月光", "星光"], ans: 0 },
      { id: 3, title: "白色的雪花飄落，地上有雪人，這是什麼天氣？", options: ["下雨", "颳風", "下雪"], ans: 2 },
      { id: 4, title: "烏雲密佈傳來轟隆隆聲響，這是什麼？", options: ["打雷", "地震", "海浪"], ans: 0 },
      { id: 5, title: "樹葉被吹得大幅偏轉，這是什麼天氣？", options: ["晴天", "颳大風", "濃霧"], ans: 1 },
      { id: 6, title: "天空中很多雲遮住太陽，稱為什麼天氣？", options: ["多雲", "晴朗", "大雪"], ans: 0 },
      { id: 7, title: "雨滴從天空降落到地面，這是什麼現象？", options: ["下雨", "霜降", "打雷"], ans: 0 },
      { id: 8, title: "下雨天出門時，通常需要帶什麼工具？", options: ["雨傘", "手電筒", "扇子"], ans: 0 }
    ];

    let piecesState = [];
    let currentQuizPieceId = null;
    let correctCount = 0;
    let snappedCount = 0;
    let timerInterval = null;
    let secondsElapsed = 0;

    let activePiece = null;
    let offsetX = 0, offsetY = 0;
    let pieceCanvases = []; // 儲存切分好的 9 張拼圖 Canvas 畫布
    let fullPuzzleImage = '';

    // 使用 HTML5 Canvas 動態繪製完整的「雨過天晴」圖畫並切割為 9 塊
    function generatePuzzleImages() {
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = 450;
      fullCanvas.height = 300;
      const ctx = fullCanvas.getContext('2d');

      // 1. 藍天漸層背景
      let sky = ctx.createLinearGradient(0, 0, 0, 300);
      sky.addColorStop(0, '#38bdf8');
      sky.addColorStop(1, '#bae6fd');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 450, 300);

      // 2. 太陽 (右上角)
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(380, 70, 35, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        let a = (Math.PI / 4) * i;
        ctx.beginPath();
        ctx.moveTo(380 + Math.cos(a)*42, 70 + Math.sin(a)*42);
        ctx.lineTo(380 + Math.cos(a)*54, 70 + Math.sin(a)*54);
        ctx.stroke();
      }

      // 3. 立體彩虹
      const rainbowColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
      rainbowColors.forEach((color, i) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(225, 310, 200 - i*7, Math.PI*1.1, Math.PI*1.9);
        ctx.stroke();
      });

      // 4. 左側烏雲與雨滴
      ctx.fillStyle = '#64748b';
      ctx.beginPath(); ctx.arc(70, 80, 28, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(100, 70, 38, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(130, 80, 28, 0, Math.PI*2); ctx.fill();

      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(65 + i*16, 115);
        ctx.lineTo(55 + i*16, 135);
        ctx.stroke();
      }

      // 5. 右側白雲
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(320, 180, 25, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(350, 170, 35, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(380, 180, 25, 0, Math.PI*2); ctx.fill();

      fullPuzzleImage = fullCanvas.toDataURL();

      // 將全圖切割成 9 張獨立小畫布
      pieceCanvases = [];
      for (let i = 0; i < 9; i++) {
        let r = Math.floor(i / 3);
        let c = i % 3;

        let pCanvas = document.createElement('canvas');
        pCanvas.width = 150;
        pCanvas.height = 100;
        let pCtx = pCanvas.getContext('2d');

        // 將對應區域裁切繪製到小畫布
        pCtx.drawImage(fullCanvas, c*150, r*100, 150, 100, 0, 0, 150, 100);
        pieceCanvases.push(pCanvas.toDataURL());
      }
    }

    function initGame() {
      generatePuzzleImages();

      const board = document.getElementById('board-container');
      board.style.backgroundImage = `linear-gradient(rgba(248, 250, 252, 0.72), rgba(248, 250, 252, 0.72)), url("${fullPuzzleImage}")`;
      board.style.backgroundSize = '100% 100%';
      board.style.backgroundPosition = 'center';

      document.getElementById('result-modal').classList.remove('active');
      document.getElementById('quiz-modal').classList.remove('active');

      correctCount = 0; snappedCount = 0; secondsElapsed = 0;
      
      document.getElementById('snapped-count').innerText = "0/9";
      document.getElementById('correct-count').innerText = "0 題";
      document.getElementById('timer-display').innerText = "00:00";

      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        secondsElapsed++;
        let m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
        let s = String(secondsElapsed % 60).padStart(2, '0');
        document.getElementById('timer-display').innerText = `${m}:${s}`;
      }, 1000);

      piecesState = Array.from({ length: 9 }, (_, i) => ({
        id: i, unlocked: false, snapped: false
      }));

      renderPool();
    }

    function renderPool() {
      const pool = document.getElementById('pieces-pool');
      pool.innerHTML = '';

      piecesState.forEach((p) => {
        if (p.snapped) return;

        const pieceEl = document.createElement('div');
        pieceEl.className = `puzzle-piece ${p.unlocked ? 'unlocked' : 'locked'}`;
        pieceEl.dataset.id = p.id;

        if (!p.unlocked) {
          pieceEl.innerHTML = `<div class="question-mark">?</div><div class="piece-sub">點我答題</div>`;
          pieceEl.onclick = () => openQuizModal(p.id);
        } else {
          // 直接將裁切好的小畫布填入背景
          pieceEl.style.backgroundImage = `url("${pieceCanvases[p.id]}")`;
          pieceEl.style.backgroundSize = 'cover';
          
          pieceEl.onmousedown = (e) => startDrag(e, pieceEl);
        }

        pool.appendChild(pieceEl);
      });
    }

    function openQuizModal(id) {
      currentQuizPieceId = id;
      const q = questions[id];
      
      document.getElementById('modal-q-num').innerText = `拼圖題目 第 ${id + 1}/9 題`;
      document.getElementById('modal-q-title').innerText = q.title;

      const optsContainer = document.getElementById('modal-options');
      optsContainer.innerHTML = '';

      q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span class="option-idx">${idx + 1}</span> <span>${optText}</span>`;
        btn.onclick = () => submitAnswer(idx);
        optsContainer.appendChild(btn);
      });

      document.getElementById('quiz-modal').classList.add('active');
    }

    function closeQuizModal() {
      document.getElementById('quiz-modal').classList.remove('active');
    }

    function submitAnswer(selectedIdx) {
      const q = questions[currentQuizPieceId];
      if (selectedIdx === q.ans) {
        correctCount++;
      }

      piecesState[currentQuizPieceId].unlocked = true;
      document.getElementById('correct-count').innerText = `${correctCount} 題`;

      closeQuizModal();
      renderPool();
    }

    // 拖曳拼圖邏輯
    function startDrag(e, pieceEl) {
      activePiece = pieceEl;
      const rect = pieceEl.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      pieceEl.classList.add('dragging');
      document.body.appendChild(pieceEl);

      moveAt(e.clientX, e.clientY);

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }

    function moveAt(pageX, pageY) {
      if (!activePiece) return;
      activePiece.style.position = 'fixed';
      activePiece.style.left = (pageX - offsetX) + 'px';
      activePiece.style.top = (pageY - offsetY) + 'px';
    }

    function onMouseMove(e) {
      moveAt(e.clientX, e.clientY);
    }

    function onMouseUp(e) {
      if (!activePiece) return;

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const pieceId = parseInt(activePiece.dataset.id);
      const targetSlot = document.querySelector(`.board-slot[data-index="${pieceId}"]`);
      const slotRect = targetSlot.getBoundingClientRect();
      const pieceRect = activePiece.getBoundingClientRect();

      const dist = Math.hypot(
        (pieceRect.left + pieceRect.width / 2) - (slotRect.left + slotRect.width / 2),
        (pieceRect.top + pieceRect.height / 2) - (slotRect.top + slotRect.height / 2)
      );

      if (dist < 80) {
        activePiece.classList.remove('dragging');
        activePiece.classList.add('snapped');
        activePiece.style.position = 'absolute';
        activePiece.style.left = '0';
        activePiece.style.top = '0';
        activePiece.onmousedown = null;

        targetSlot.appendChild(activePiece);
        piecesState[pieceId].snapped = true;

        snappedCount++;
        document.getElementById('snapped-count').innerText = `${snappedCount}/9`;

        if (snappedCount === 9) {
          setTimeout(completeGame, 300);
        }
      } else {
        renderPool();
      }

      activePiece = null;
    }

    function completeGame() {
      clearInterval(timerInterval);
      let m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
      let s = String(secondsElapsed % 60).padStart(2, '0');

      document.getElementById('result-score-text').innerText = `答對 ${correctCount} / 9 題 | 耗時 ${m}:${s}`;
      document.getElementById('result-modal').classList.add('active');
    }

    window.onload = initGame;