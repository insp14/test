/* ============================================================
   JUST REMEMBER — ДЕНЬ 1
   Переходный текст перед досье + заглушка самого досье.
   Подключается тегом <script src="day1.js"> после основного
   скрипта index.html. Рендерится в #puzzle-screen через
   реестр window.JR_DAYS, который создаёт каркас.
   ------------------------------------------------------------
   ПРАВКА ТЕКСТОВ: меняй строки в INTRO_TEXTS — это единственное
   место, где живёт переходный фрагмент перед досье.
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'jr_puzzle_state';
  var TYPE_INTERVAL = 30; // мс между символами

  /* ---------- Тексты переходного фрагмента ---------- */
  var INTRO_TEXTS = [
    'День проходил довольно обычно, как и все предыдущие: утреннее пробуждение, гигиенические процедуры, прием таблеток, дополнительные обследования, обед, прогулка, ужин, сон. Но в этот день произошло кое-что необычное: поднявшись на этаж после очередной прогулки, мимо Вас прошла Энн и, не сказав ни слова, передала Вам какую-то… папку?',
    'В течение нескольких первых секунд Вы оторопело стояли посередине коридора. И снова полное непонимание происходящего: что это и для чего Вам это передали, не было ни малейшего понимания. Опять загадки и никакого прямого ответа. Вы обернулись, чтобы посмотреть на девушку, но в Вашем поле зрения ее уже не было – коридор был заполнен людьми.',
    'Вернувшись в свою палату, Вы решили детально изучить то, что непроизвольно попало к Вам в руки. Неизвестный объект, похожий на какую-то папку, оказался Вашим личным досье – по крайней мере, так было написано мистером Бакхэмом на отдельном листочке, приложенном к папке.'
  ];

  /* ---------- Хранилище прогресса дня ---------- */
  function readState() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (e) { s = {}; }
    if (typeof s !== 'object' || s === null) s = {};
    if (!s.day1 || typeof s.day1 !== 'object') s.day1 = {};
    if (!s.day1.intro || typeof s.day1.intro !== 'object') {
      s.day1.intro = { shown: 0, done: false, dossier: false };
    }
    return s;
  }

  function writeState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* приватный режим — молча */ }
  }

  /* ---------- Звук печати (мягкий: если файла нет — тишина) ---------- */
  function makeTypeSound() {
    var audio = null;
    try {
      audio = new Audio('type.mp3');
      audio.volume = 0.25;
    } catch (e) { audio = null; }
    return {
      play: function () {
        if (!audio) return;
        try {
          audio.currentTime = 0;
          var p = audio.play();
          if (p && p.catch) p.catch(function () {});
        } catch (e) {}
      },
      stop: function () {
        if (!audio) return;
        try { audio.pause(); } catch (e) {}
      }
    };
  }

  /* ---------- Стили дня (вставляются один раз) ---------- */
  function injectStyles() {
    if (document.getElementById('jr-day1-styles')) return;
    var st = document.createElement('style');
    st.id = 'jr-day1-styles';
    st.textContent = [
      '#puzzle-screen{display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;}',
      '.jr-d1-root{width:100%;max-width:700px;margin:0 auto;padding:24px 20px 80px;}',
      '.jr-d1-nav{position:fixed;top:16px;right:20px;display:flex;gap:10px;z-index:1100;}',
      '.jr-d1-navbtn{background:transparent;color:var(--text-color,#e8e8e8);border:1px solid rgba(128,128,128,.5);border-radius:4px;padding:6px 12px;font:inherit;font-size:14px;cursor:pointer;opacity:.7;}',
      '.jr-d1-navbtn:hover{opacity:1;}',
      '.jr-d1-para{margin:0 0 22px 0;line-height:1.65;font-size:20px;text-align:justify;}',
      '.jr-d1-caret{display:inline-block;width:9px;height:18px;background:currentColor;margin-left:2px;vertical-align:-3px;animation:jrD1Blink 1s steps(1) infinite;}',
      '@keyframes jrD1Blink{50%{opacity:0;}}',
      '@keyframes jrD1FadeIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}',
      '.jr-d1-dossier{margin-top:30px;padding:26px 28px;border:1px solid rgba(128,128,128,.45);border-radius:6px;animation:jrD1FadeIn .45s ease both;}',
      '.jr-d1-dossier-title{font-size:20px;letter-spacing:2px;margin-bottom:12px;}',
      '.jr-d1-dossier-note{opacity:.65;font-size:15px;line-height:1.5;}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- Навигация: обращаемся к функциям каркаса ---------- */
  function callHook(pathList, arg) {
    for (var i = 0; i < pathList.length; i++) {
      var parts = pathList[i].split('.');
      var obj = window, ok = true;
      for (var j = 0; j < parts.length - 1; j++) {
        if (obj && typeof obj[parts[j]] !== 'undefined') obj = obj[parts[j]];
        else { ok = false; break; }
      }
      if (ok && obj && typeof obj[parts[parts.length - 1]] === 'function') {
        try { obj[parts[parts.length - 1]](arg); } catch (e) {}
        return true;
      }
    }
    return false;
  }

  function exitToStory(api) {
    if (api && typeof api.exitToStory === 'function') { api.exitToStory(); return; }
    if (!callHook(['JR_API.exitToStory', 'JR_exitPuzzleDay', 'exitPuzzleDay'])) {
      console.warn('[day1] не найдена функция возврата к сюжету');
    }
  }

  function exitToMenu(api) {
    if (api && typeof api.exitToMenu === 'function') { api.exitToMenu(); return; }
    if (!callHook(['JR_API.exitToMenu', 'JR_exitPuzzleToMenu', 'JR_API.openMenu', 'JR_showMenu', 'showMainMenu'])) {
      console.warn('[day1] не найдена функция выхода в главное меню');
    }
  }

  /* ---------- Рендер дня ---------- */
  function render(root, api) {
    if (typeof day1._cleanup === 'function') { try { day1._cleanup(); } catch (e) {} }

    injectStyles();
    var snd = makeTypeSound();
    var state = readState();
    var intro = state.day1.intro;
    var shownCount = Math.min(intro.shown || 0, INTRO_TEXTS.length);
    var typing = null;

    root.innerHTML = '';

    var nav = document.createElement('div');
    nav.className = 'jr-d1-nav';
    var btnStory = document.createElement('button');
    btnStory.className = 'jr-d1-navbtn';
    btnStory.textContent = 'К сюжету';
    btnStory.addEventListener('click', function (e) {
      e.stopPropagation();
      cleanup();
      exitToStory(api);
    });
    var btnMenu = document.createElement('button');
    btnMenu.className = 'jr-d1-navbtn';
    btnMenu.textContent = 'В меню';
    btnMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      cleanup();
      exitToMenu(api);
    });
    nav.appendChild(btnStory);
    nav.appendChild(btnMenu);
    root.appendChild(nav);

    var rootEl = document.createElement('div');
    rootEl.className = 'jr-d1-root';
    root.appendChild(rootEl);

    function addParagraph(text, instant) {
      var p = document.createElement('p');
      p.className = 'jr-d1-para';
      var span = document.createElement('span');
      span.className = 'jr-d1-txt';
      var caret = document.createElement('span');
      caret.className = 'jr-d1-caret';
      p.appendChild(span);
      p.appendChild(caret);
      rootEl.appendChild(p);

      if (instant) {
        span.textContent = text;
        caret.style.display = 'none';
        return null;
      }

      var i = 0;
      var timer = setInterval(function () {
        i++;
        span.textContent = text.slice(0, i);
        if (i % 2 === 0) snd.play();
        if (i >= text.length) {
          clearInterval(timer);
          caret.style.display = 'none';
          typing = null;
          snd.stop();
          advanceState();
        }
      }, TYPE_INTERVAL);

      typing = {
        finish: function () {
          clearInterval(timer);
          span.textContent = text;
          caret.style.display = 'none';
          snd.stop();
          typing = null;
          advanceState();
        },
        abort: function () {
          clearInterval(timer);
          if (caret.parentNode) caret.parentNode.removeChild(caret);
          snd.stop();
        }
      };
      return typing;
    }

    function advanceState() {
      shownCount++;
      state.day1.intro.shown = shownCount;
      if (shownCount >= INTRO_TEXTS.length) state.day1.intro.done = true;
      writeState(state);
    }

    function showDossier() {
      if (rootEl.querySelector('.jr-d1-dossier')) return;
      var box = document.createElement('div');
      box.className = 'jr-d1-dossier';
      box.innerHTML =
        '<div class="jr-d1-dossier-title">ЛИЧНОЕ ДОСЬЕ</div>' +
        '<div class="jr-d1-dossier-note">[Заглушка] Здесь откроется досье: табы «Личное дело», «Фотография», «Медзаписи». Механика табов подключается на следующем этапе.</div>';
      rootEl.appendChild(box);
      state.day1.intro.dossier = true;
      writeState(state);
    }

    function advance() {
      if (typing) { typing.finish(); return; }
      if (shownCount < INTRO_TEXTS.length) {
        addParagraph(INTRO_TEXTS[shownCount], false);
      } else if (!state.day1.intro.dossier) {
        showDossier();
      }
    }

    function onClick(e) {
      if (e.target && e.target.closest && e.target.closest('.jr-d1-navbtn, .jr-d1-dossier')) return;
      advance();
    }

    function onKey(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        advance();
      }
    }

    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);

    function cleanupTyping() {
      if (typing) {
        var t = typing;
        typing = null;
        if (t.abort) t.abort();
      }
      snd.stop();
    }

    function cleanup() {
      document.removeEventListener('keydown', onKey);
      root.removeEventListener('click', onClick);
      cleanupTyping();
    }
    day1._cleanup = cleanup;

    /* Восстановление прогресса после перезагрузки страницы */
    for (var k = 0; k < shownCount; k++) addParagraph(INTRO_TEXTS[k], true);
    if (intro.done && intro.dossier) showDossier();
  }

  /* ---------- Регистрация дня в каркасе ---------- */
  var day1 = {
    id: 1,
    title: 'ДЕНЬ 1',
    render: function (root, api) { return render(root, api); }
  };

  window.JR_DAYS = window.JR_DAYS || {};
  window.JR_DAYS[1] = day1;
})();
