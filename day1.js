/* ============================================================
   JUST REMEMBER — ДЕНЬ 1 (объединённая версия, v3)
   Переходный текст (печатная машинка) + интерактив досье +
   ночь / сон / итоги.
   Подключается <script src="day1.js"> после основного скрипта
   index.html. Рендерится в #puzzle-screen через реестр window.JR_DAYS.
   ------------------------------------------------------------
   v3: шапка как в основной игре, рабочее «Меню», само-восстановление
   после возврата из меню (фикс пустого экрана), публичный day1.reinit.
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'jr_puzzle_state';
  var TYPE_INTERVAL = 30; // мс между символами

  /* ---------- Тексты ---------- */
  var INTRO_TEXTS = [
    'День проходил довольно обычно, как и все предыдущие: утреннее пробуждение, гигиенические процедуры, прием таблеток, дополнительные обследования, обед, прогулка, ужин, сон. Но в этот день произошло кое-что необычное: поднявшись на этаж после очередной прогулки, мимо Вас прошла Энн и, не сказав ни слова, передала Вам какую-то… папку?',
    'В течение нескольких первых секунд Вы оторопело стояли посередине коридора. И снова полное непонимание происходящего: что это и для чего Вам это передали, не было ни малейшего понимания. Опять загадки и никакого прямого ответа. Вы обернулись, чтобы посмотреть на девушку, но в Вашем поле зрения ее уже не было – коридор был заполнен людьми.',
    'Вернувшись в свою палату, Вы решили детально изучить то, что непроизвольно попало к Вам в руки. Неизвестный объект, похожий на какую-то папку, оказался Вашим личным досье – по крайней мере, так было написано мистером Бакхэмом на отдельном листочке, приложенном к папке.'
  ];

  var DREAM_TEXT = 'Спали Вы достаточно крепко, чтобы помнить в деталях, что Вам приснилось. Однако кое-что запомнилось – буква «С». Почему Вы запомнили только ее из всего сна – непонятно.';

  var FACTS = {
    dates: {
      text: 'Дата поступления — 15 лет назад. Веранда: война, волна сна, «случаи сократились до нуля».',
      pts: 2,
      flag: 'dates_matched'
    },
    epikriz: {
      text: 'Выписной эпикриз отсутствует — в досье страница пуста.',
      pts: 1,
      flag: 'epikriz_missing'
    },
    photo: {
      text: 'Фотография не соответствует внешности — совпадают лишь общие черты лица.',
      pts: 1,
      flag: 'photo_examined'
    }
  };

  var SLOTS_TOTAL = 8;
  var FULL_MAX = 11; // суммарная полнота дней 1–3 (4+3+5)

  /* ---------- Хранилище прогресса ---------- */
  function readState() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (e) { s = {}; }
    if (typeof s !== 'object' || s === null) s = {};
    if (!s.day1 || typeof s.day1 !== 'object') s.day1 = {};
    if (!s.day1.intro || typeof s.day1.intro !== 'object') s.day1.intro = { shown: 0, done: false, dossier: false };
    if (typeof s.day1.score !== 'number') s.day1.score = 0;
    if (typeof s.day1.max !== 'number') s.day1.max = 4;
    if (!Array.isArray(s.day1.flags)) s.day1.flags = [];
    if (!Array.isArray(s.day1.facts)) s.day1.facts = [];
    if (!Array.isArray(s.day1.letters)) s.day1.letters = [];
    if (typeof s.day1.done !== 'boolean') s.day1.done = false;
    if (typeof s.day1.step !== 'string') s.day1.step = 'intro';
    if (!s.day2 || typeof s.day2 !== 'object') s.day2 = { score: 0, letters: [], facts: [] };
    if (!s.day3 || typeof s.day3 !== 'object') s.day3 = { score: 0, letters: [], facts: [] };
    return s;
  }

  function writeState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* приватный режим — молча */ }
  }

  /* ---------- Звук печати ---------- */
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

  /* ---------- Стили дня ---------- */
  function injectStyles() {
    if (document.getElementById('jr-day1-styles')) return;
    var st = document.createElement('style');
    st.id = 'jr-day1-styles';
    st.textContent = [
      '#puzzle-screen{display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;}',
      '.jr-d1-root{width:100%;max-width:760px;margin:0 auto;padding:10px 20px 80px;}',
      '.jr-d1-nav{position:fixed;top:16px;right:20px;display:flex;gap:10px;z-index:1100;}',
      '.jr-d1-navbtn{background:transparent;color:var(--text-color,#e8e8e8);border:1px solid rgba(128,128,128,.5);border-radius:4px;padding:6px 12px;font:inherit;font-size:14px;cursor:pointer;opacity:.7;}',
      '.jr-d1-navbtn:hover{opacity:1;}',

      /* Шапка как в основной игре */
      '.jr-d1-header{width:100%;max-width:760px;margin:0 auto 22px;text-align:center;}',
      '.jr-d1-header .jr-d1-hr{border:none;height:1px;background:var(--text-color,#e8e8e8);opacity:.85;margin:0 0 18px;}',
      '.jr-d1-header .jr-d1-hr.bottom{margin:18px 0 0;}',
      '.jr-d1-header h1{margin:0;font-size:42px;font-weight:bold;letter-spacing:8px;color:var(--text-color,#e8e8e8);}',

      '.jr-d1-topbar{display:flex;gap:12px;margin-bottom:16px;align-items:stretch;flex-wrap:wrap;}',
      '.jr-d1-frame{border:1px solid rgba(128,128,128,.45);padding:12px 14px;}',
      '.jr-d1-nbframe{flex:1;display:flex;align-items:center;}',
      '.jr-d1-notebook{display:flex;gap:6px;flex-wrap:wrap;}',
      '.jr-d1-slot{width:34px;height:42px;border:1px solid rgba(128,128,128,.6);display:flex;align-items:center;justify-content:center;font-size:20px;}',
      '.jr-d1-slot.filled{background:var(--text-color,#e8e8e8);color:#111;font-weight:bold;animation:jrD1Pop .35s;}',
      '@keyframes jrD1Pop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}',
      '.jr-d1-counter{min-width:180px;display:flex;flex-direction:column;justify-content:center;font-size:13px;line-height:1.6;}',
      '.jr-d1-facts{width:100%;margin-bottom:16px;}',
      '.jr-d1-facts h2{font-size:13px;letter-spacing:2px;font-weight:normal;margin:0 0 8px;opacity:.8;}',
      '.jr-d1-facts ul{list-style:none;margin:0;padding:0;}',
      '.jr-d1-facts li{padding:6px 8px;border-bottom:1px dashed rgba(128,128,128,.3);font-size:14px;animation:jrD1Fade .5s;}',
      '@keyframes jrD1Fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
      '.jr-d1-panel{display:none;}',
      '.jr-d1-panel.active{display:block;animation:jrD1Fade .4s;}',
      '.jr-d1-para{margin:0 0 22px;line-height:1.65;font-size:20px;text-align:justify;}',
      '.jr-d1-caret{display:inline-block;width:9px;height:18px;background:currentColor;margin-left:2px;vertical-align:-3px;animation:jrD1Blink 1s steps(1) infinite;}',
      '@keyframes jrD1Blink{50%{opacity:0}}',
      '.jr-d1-btn{display:inline-block;border:1px solid var(--text-color,#e8e8e8);background:transparent;color:var(--text-color,#e8e8e8);font:inherit;font-size:15px;padding:10px 22px;cursor:pointer;letter-spacing:1px;transition:.2s;margin:4px;}',
      '.jr-d1-btn:hover:not(:disabled){background:var(--text-color,#e8e8e8);color:#111;}',
      '.jr-d1-btn:disabled{opacity:.35;cursor:default;}',
      '.jr-d1-btn.ghost{border-color:rgba(128,128,128,.5);opacity:.8;}',
      '.jr-d1-center{text-align:center;margin:12px 0;}',
      '.jr-d1-tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}',
      '.jr-d1-tab{border:1px solid rgba(128,128,128,.5);background:transparent;color:inherit;font:inherit;padding:8px 18px;cursor:pointer;font-size:14px;letter-spacing:1px;opacity:.8;}',
      '.jr-d1-tab.active{background:var(--text-color,#e8e8e8);color:#111;opacity:1;}',
      '.jr-d1-doc{border:1px solid rgba(128,128,128,.35);padding:16px;margin-bottom:12px;}',
      '.jr-d1-doc h3{font-size:14px;letter-spacing:2px;font-weight:normal;opacity:.8;margin:0 0 10px;}',
      '.jr-d1-line{border-bottom:1px dotted rgba(128,128,128,.3);padding:7px 2px;font-size:14px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}',
      '.jr-d1-line .k{opacity:.55;flex-shrink:0;}',
      '.jr-d1-line .val{text-align:right;}',
      '.jr-d1-pre{white-space:pre-wrap;text-align:right;}',
      '.jr-d1-photo{width:200px;height:260px;border:1px solid var(--text-color,#e8e8e8);display:flex;align-items:center;justify-content:center;cursor:pointer;margin:0 auto;}',
      '.jr-d1-photo .mark{opacity:.5;font-size:12px;letter-spacing:2px;text-align:center;}',
      '.jr-d1-photo.examined{cursor:default;border-style:dashed;}',
      '.jr-d1-note{opacity:.75;font-size:14px;line-height:1.6;margin:10px 0;}',
      '.jr-d1-hint{opacity:.6;font-size:13px;font-style:italic;margin:10px 0;}',
      '.jr-d1-link{color:var(--text-color,#e8e8e8);text-decoration:none;border-bottom:1px dashed rgba(128,128,128,.6);cursor:pointer;}',
      '.jr-d1-link:hover{opacity:.7;}',
      '.jr-d1-dead{opacity:.5;cursor:default;}',
      '.jr-d1-footer{margin-top:26px;font-size:12px;opacity:.4;text-align:center;}',
      '.jr-d1-footer a{color:inherit;}',
      '.jr-d1-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);border:1px solid var(--text-color,#e8e8e8);background:rgba(0,0,0,.85);color:var(--text-color,#e8e8e8);padding:10px 20px;font-size:14px;opacity:0;transition:.4s;pointer-events:none;z-index:1200;}',
      '.jr-d1-toast.show{opacity:1;}'
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
  var lastRoot = null;
  var lastApi = null;
  var exited = false;

  function render(root, api) {
    if (typeof day1._cleanup === 'function') { try { day1._cleanup(); } catch (e) {} }

    lastRoot = root;
    lastApi = api;
    exited = false;

    injectStyles();
    var snd = makeTypeSound();
    var state = readState();
    var shownCount = Math.min(state.day1.intro.shown || 0, INTRO_TEXTS.length);
    var typing = null;

    root.innerHTML = '';

    /* Верхняя навигация */
    var nav = document.createElement('div');
    nav.className = 'jr-d1-nav';
    var btnStory = document.createElement('button');
    btnStory.className = 'jr-d1-navbtn';
    btnStory.textContent = 'К сюжету';
    btnStory.addEventListener('click', function (e) {
      e.stopPropagation();
      leave(function () { exitToStory(api); });
    });
    var btnMenu = document.createElement('button');
    btnMenu.className = 'jr-d1-navbtn';
    btnMenu.textContent = 'Меню';
    btnMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      leave(function () { exitToMenu(api); });
    });
    nav.appendChild(btnStory);
    nav.appendChild(btnMenu);
    root.appendChild(nav);

    var wrap = document.createElement('div');
    wrap.className = 'jr-d1-root';
    root.appendChild(wrap);

    /* Шапка как в основной игре */
    var header = document.createElement('div');
    header.className = 'jr-d1-header';
    header.innerHTML =
      '<hr class="jr-d1-hr">' +
      '<h1>JUST REMEMBER</h1>' +
      '<hr class="jr-d1-hr bottom">';
    wrap.appendChild(header);

    /* Блокнот + счётчики */
    var topbar = document.createElement('div');
    topbar.className = 'jr-d1-topbar';
    var nbFrame = document.createElement('div');
    nbFrame.className = 'jr-d1-frame jr-d1-nbframe';
    var nb = document.createElement('div');
    nb.className = 'jr-d1-notebook';
    nbFrame.appendChild(nb);
    var counterFrame = document.createElement('div');
    counterFrame.className = 'jr-d1-frame jr-d1-counter';
    counterFrame.innerHTML =
      '<div>Полнота: <span class="jr-d1-scoreNow">0</span> / <span class="jr-d1-scoreMax">11</span></div>' +
      '<div>Сегодня: <span class="jr-d1-scoreDay">0</span> / 4</div>';
    topbar.appendChild(nbFrame);
    topbar.appendChild(counterFrame);
    wrap.appendChild(topbar);

    /* Доска фактов */
    var factsFrame = document.createElement('div');
    factsFrame.className = 'jr-d1-frame jr-d1-facts';
    factsFrame.innerHTML = '<h2>ДОСКА ФАКТОВ</h2>';
    var factsList = document.createElement('ul');
    factsFrame.appendChild(factsList);
    wrap.appendChild(factsFrame);

    /* Тост */
    var toastEl = document.createElement('div');
    toastEl.className = 'jr-d1-toast';
    root.appendChild(toastEl);
    var toastTimer;
    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
    }

    /* Панели */
    var panels = {};
    ['intro', 'dossier', 'night', 'dream', 'results'].forEach(function (name) {
      var p = document.createElement('div');
      p.className = 'jr-d1-panel';
      panels[name] = p;
      wrap.appendChild(p);
    });

    function allLetters() {
      var a1 = Array.isArray(state.day1.letters) ? state.day1.letters : [];
      var a2 = state.day2 && Array.isArray(state.day2.letters) ? state.day2.letters : [];
      var a3 = state.day3 && Array.isArray(state.day3.letters) ? state.day3.letters : [];
      return [].concat(a1, a2, a3);
    }
    function allScore() {
      return (state.day1.score || 0) + ((state.day2 && state.day2.score) || 0) + ((state.day3 && state.day3.score) || 0);
    }

    function renderNotebook() {
      var letters = allLetters();
      nb.innerHTML = '';
      for (var i = 0; i < SLOTS_TOTAL; i++) {
        var cell = document.createElement('div');
        cell.className = 'jr-d1-slot' + (letters[i] ? ' filled' : '');
        cell.textContent = letters[i] || '';
        nb.appendChild(cell);
      }
    }
    function renderCounter() {
      counterFrame.querySelector('.jr-d1-scoreNow').textContent = allScore();
      counterFrame.querySelector('.jr-d1-scoreMax').textContent = FULL_MAX;
      counterFrame.querySelector('.jr-d1-scoreDay').textContent = state.day1.score;
    }
    function renderFacts() {
      var all = [].concat(
        Array.isArray(state.day1.facts) ? state.day1.facts : [],
        (state.day2 && state.day2.facts) || [],
        (state.day3 && state.day3.facts) || []
      );
      factsList.innerHTML = '';
      if (!all.length) {
        var li = document.createElement('li');
        li.textContent = 'Пока пусто. Внимательность — единственный инструмент.';
        factsList.appendChild(li);
        return;
      }
      all.forEach(function (f) {
        var li = document.createElement('li');
        li.textContent = f.text + (f.pts ? '  +' + f.pts : '');
        factsList.appendChild(li);
      });
    }
    function refresh() {
      renderNotebook();
      renderCounter();
      renderFacts();
    }

    function addFact(key) {
      var f = FACTS[key];
      if (!f || state.day1.flags.indexOf(f.flag) !== -1) return;
      state.day1.flags.push(f.flag);
      state.day1.facts.push({ text: f.text, pts: f.pts });
      state.day1.score += f.pts;
      writeState(state);
      refresh();
      toast('Новый факт на доску (+' + f.pts + ')');
    }

    function goto(step) {
      state.day1.step = step;
      writeState(state);
      Object.keys(panels).forEach(function (k) {
        panels[k].classList.toggle('active', k === step);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ---------- ЭКРАН: ПЕРЕХОДНЫЙ ТЕКСТ ---------- */
    var introAdd = null; // мост к печати следующего абзаца

    function buildIntro() {
      var p = panels.intro;
      var area = document.createElement('div');
      p.appendChild(area);

      var btnWrap = document.createElement('div');
      btnWrap.className = 'jr-d1-center';
      var openBtn = document.createElement('button');
      openBtn.className = 'jr-d1-btn';
      openBtn.textContent = 'Открыть досье';
      openBtn.style.display = 'none';
      openBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        goto('dossier');
      });
      btnWrap.appendChild(openBtn);
      p.appendChild(btnWrap);

      function addParagraph(text, instant) {
        var para = document.createElement('p');
        para.className = 'jr-d1-para';
        var span = document.createElement('span');
        span.className = 'jr-d1-txt';
        var caret = document.createElement('span');
        caret.className = 'jr-d1-caret';
        para.appendChild(span);
        para.appendChild(caret);
        area.appendChild(para);

        if (instant) {
          span.textContent = text;
          caret.style.display = 'none';
          return;
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
            paragraphDone();
          }
        }, TYPE_INTERVAL);

        typing = {
          finish: function () {
            clearInterval(timer);
            span.textContent = text;
            caret.style.display = 'none';
            snd.stop();
            typing = null;
            paragraphDone();
          },
          abort: function () {
            clearInterval(timer);
            if (caret.parentNode) caret.parentNode.removeChild(caret);
            snd.stop();
          }
        };
      }

      function paragraphDone() {
        shownCount++;
        state.day1.intro.shown = shownCount;
        if (shownCount >= INTRO_TEXTS.length) {
          state.day1.intro.done = true;
          openBtn.style.display = '';
        }
        writeState(state);
      }

      introAdd = function () {
        if (shownCount < INTRO_TEXTS.length) {
          addParagraph(INTRO_TEXTS[shownCount], false);
        }
      };

      /* Восстановление уже показанных абзацев — мгновенно */
      for (var k = 0; k < shownCount; k++) addParagraph(INTRO_TEXTS[k], true);
      if (state.day1.intro.done) openBtn.style.display = '';
    }

    /* ---------- ЭКРАН: ДОСЬЕ ---------- */
    function buildDossier() {
      var p = panels.dossier;
      p.innerHTML =
        '<div class="jr-d1-tabs">' +
        '<button class="jr-d1-tab active" data-tab="file">ЛИЧНОЕ ДЕЛО</button>' +
        '<button class="jr-d1-tab" data-tab="photo">ФОТОГРАФИЯ</button>' +
        '<button class="jr-d1-tab" data-tab="med">МЕДЗАПИСИ</button>' +
        '</div>' +
        '<div class="jr-d1-tabpane" data-pane="file">' +
        '<div class="jr-d1-doc"><h3>ЛИЧНОЕ ДЕЛО</h3>' +
        '<div class="jr-d1-line"><span class="k">Имя</span><span class="val">Сайлас Хаклоу</span></div>' +
        '<div class="jr-d1-line"><span class="k">Дата рождения</span><span class="val">03.09.1989</span></div>' +
        '<div class="jr-d1-line"><span class="k">Документы</span><span class="val">направление бригады скорой помощи; регистрационная карта пациента; согласие на госпитализацию (подписи не читаются)</span></div>' +
        '<div class="jr-d1-line"><span class="k">Обследование</span><span class="val">КТ черепа — 19.11.2011; ЭЭГ — 19.11.2011, 23.11.2011; ежедневный общий осмотр с 18.11.2011</span></div>' +
        '<div class="jr-d1-line"><span class="k">Дата поступления</span><span class="val">18.11.2011</span></div>' +
        '</div>' +
        '<div class="jr-d1-center"><button class="jr-d1-btn ghost" id="jr-d1-btnDates">Сопоставить даты</button></div>' +
        '<div class="jr-d1-hint" id="jr-d1-hintDates" style="display:none">Даты обследований разнобойны. Стоит наложить их друг на друга.</div>' +
        '</div>' +
        '<div class="jr-d1-tabpane" data-pane="photo" style="display:none">' +
        '<div class="jr-d1-doc"><h3>ФОТОГРАФИЯ</h3>' +
        '<div class="jr-d1-center"><div class="jr-d1-photo" id="jr-d1-photoBox"><span class="mark">[ФОТО — в профиль]</span></div></div>' +
        '<div class="jr-d1-note">Личность на фотографии… Вроде бы Вы, а вроде бы и нет. Человек, изображенный на ней, действительно похож на Вас, но лишь общими чертами. Из отличительных особенностей — длинная прическа, борода и серьга в ухе, которых нет у Вас, но была у человека на фото. Внимание также упало на шрамы, которые Вы обнаружили у себя на лице после пробуждения, но не видите на фотографии.</div>' +
        '</div>' +
        '</div>' +
        '<div class="jr-d1-tabpane" data-pane="med" style="display:none">' +
        '<div class="jr-d1-doc"><h3>МЕДЗАПИСИ</h3>' +
        '<div class="jr-d1-line"><span class="k">Обследование №1</span><span class="val">КТ черепа, 19.11.2011: органических повреждений не выявлено.</span></div>' +
        '<div class="jr-d1-line"><span class="k">Обследование №2</span><span class="val">ЭЭГ, 19.11.2011 и 23.11.2011: выраженных отклонений не зафиксировано.</span></div>' +
        '<div class="jr-d1-line"><span class="k">История болезни</span><span class="val">поступление 18.11.2011 по направлению скорой помощи; диагноз: «длительное расстройство сознания неясной этиологии»; терапия: противосудорожные, седативные; динамика стабильная.</span></div>' +
        '<div class="jr-d1-line"><span class="k">Выписной эпикриз</span><span class="val"><a href="#" class="jr-d1-link" id="jr-d1-linkEpikriz">Страница отсутствует</a></span></div>' +
        '<div class="jr-d1-note" id="jr-d1-epikrizEmpty" style="display:none">Страница пуста. Не «испорчена» — именно пуста, будто туда никогда ничего не вписывали.</div>' +
        '</div>' +
        '</div>' +
        '<div class="jr-d1-center"><button class="jr-d1-btn" id="jr-d1-btnClose">Закрыть досье</button></div>';

      var tabs = p.querySelectorAll('.jr-d1-tab');
      Array.prototype.forEach.call(tabs, function (t) {
        t.addEventListener('click', function (e) {
          e.stopPropagation();
          switchTab(t.dataset.tab);
        });
      });

      function switchTab(name) {
        Array.prototype.forEach.call(tabs, function (t) {
          t.classList.toggle('active', t.dataset.tab === name);
        });
        Array.prototype.forEach.call(p.querySelectorAll('.jr-d1-tabpane'), function (pane) {
          pane.style.display = (pane.dataset.pane === name ? '' : 'none');
        });
      }

      var btnDates = p.querySelector('#jr-d1-btnDates');
      function refreshDatesBtn() {
        if (state.day1.flags.indexOf('dates_matched') !== -1) {
          btnDates.disabled = true;
          btnDates.textContent = 'Даты сопоставлены';
        }
      }
      btnDates.addEventListener('click', function (e) {
        e.stopPropagation();
        if (state.day1.flags.indexOf('dates_matched') !== -1) return;
        addFact('dates');
        p.querySelector('#jr-d1-hintDates').style.display = 'none';
        refreshDatesBtn();
      });
      refreshDatesBtn();

      p.querySelector('#jr-d1-photoBox').addEventListener('click', function () {
        if (state.day1.flags.indexOf('photo_examined') !== -1) return;
        this.classList.add('examined');
        addFact('photo');
      });

      p.querySelector('#jr-d1-linkEpikriz').addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (state.day1.flags.indexOf('epikriz_missing') !== -1) return;
        p.querySelector('#jr-d1-epikrizEmpty').style.display = '';
        var link = p.querySelector('#jr-d1-linkEpikriz');
        var dead = document.createElement('span');
        dead.className = 'jr-d1-dead';
        dead.textContent = 'не в наличии…';
        link.parentNode.replaceChild(dead, link);
        addFact('epikriz');
      });

      p.querySelector('#jr-d1-btnClose').addEventListener('click', function (e) {
        e.stopPropagation();
        goto('night');
      });
    }

    /* ---------- ЭКРАН: НОЧЬ ---------- */
    function buildNight() {
      var p = panels.night;
      p.innerHTML =
        '<div class="jr-d1-center"><button class="jr-d1-btn" id="jr-d1-btnSleep">Лечь и закрыть глаза</button></div>' +
        '<div class="jr-d1-center"><button class="jr-d1-btn ghost" id="jr-d1-btnBack">Вернуться к досье</button></div>';
      p.querySelector('#jr-d1-btnSleep').addEventListener('click', function (e) {
        e.stopPropagation();
        dream();
      });
      p.querySelector('#jr-d1-btnBack').addEventListener('click', function (e) {
        e.stopPropagation();
        goto('dossier');
      });
    }

    function dream() {
      if (state.day1.flags.indexOf('dream_seen') === -1) {
        state.day1.flags.push('dream_seen');
        if (state.day1.letters.indexOf('С') === -1) state.day1.letters.push('С');
        writeState(state);
        refresh();
        toast('Новая буква в блокноте: С');
      }
      goto('dream');
    }

    /* ---------- ЭКРАН: СОН ---------- */
    function buildDream() {
      var p = panels.dream;
      p.innerHTML =
        '<p class="jr-d1-para">' + DREAM_TEXT + '</p>' +
        '<div class="jr-d1-center"><button class="jr-d1-btn" id="jr-d1-btnWake">Проснуться</button></div>';
      p.querySelector('#jr-d1-btnWake').addEventListener('click', function (e) {
        e.stopPropagation();
        finishDay1();
      });
    }

    /* ---------- ЭКРАН: ИТОГИ ---------- */
    function buildResults() {
      var p = panels.results;
      var got = (state.day1.facts && state.day1.facts.length)
        ? state.day1.facts.map(function (f) { return '• ' + f.text; }).join('\n')
        : '—';
      p.innerHTML =
        '<div class="jr-d1-doc"><h3>ИТОГИ ДНЯ 1</h3>' +
        '<div class="jr-d1-line"><span class="k">Очки дня</span><span class="val">' + state.day1.score + ' / 4</span></div>' +
        '<div class="jr-d1-line"><span class="k">Полнота общая</span><span class="val">' + allScore() + ' / ' + FULL_MAX + '</span></div>' +
        '<div class="jr-d1-line"><span class="k">Факты</span><span class="val jr-d1-pre">' + got + '</span></div>' +
        '<div class="jr-d1-line"><span class="k">Блокнот</span><span class="val">' + (allLetters().join(' ') || '—') + '</span></div>' +
        '</div>' +
        '<div class="jr-d1-center"><button class="jr-d1-btn" disabled>День 2 — скоро</button></div>';
    }

    function finishDay1() {
      state.day1.done = true;
      writeState(state);
      buildResults();
      goto('results');
    }

    /* ---------- Управление: клик и пробел ---------- */
    function advance() {
      if (state.day1.step !== 'intro') return;
      if (typing) { typing.finish(); return; }
      if (introAdd) introAdd();
    }

    function onClick(e) {
      if (e.target && e.target.closest && e.target.closest('.jr-d1-navbtn, .jr-d1-btn, .jr-d1-tab, .jr-d1-photo, .jr-d1-link')) return;
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

    /* Само-восстановление: если каркас очистил #puzzle-screen
       (возврат из меню без вызова render) — перерисовываем день сами */
    var healTimer = setInterval(function () {
      if (exited) return;
      var screen = document.getElementById('puzzle-screen');
      if (!screen) return;
      if (!screen.contains(wrap)) {
        clearInterval(healTimer);
        try { day1.render(lastRoot, lastApi); } catch (e) {}
      }
    }, 500);

    function stopHeal() {
      if (healTimer) {
        clearInterval(healTimer);
        healTimer = null;
      }
    }

    function cleanup() {
      stopHeal();
      document.removeEventListener('keydown', onKey);
      root.removeEventListener('click', onClick);
      cleanupTyping();
    }
    day1._cleanup = cleanup;

    function leave(afterExit) {
      exited = true;
      cleanup();
      if (afterExit) afterExit();
    }

    /* ---------- Сборка и запуск ---------- */
    buildIntro();
    buildDossier();
    buildNight();
    buildDream();
    buildResults();

    if (state.day1.done) {
      goto('results');
    } else if (state.day1.step && panels[state.day1.step]) {
      goto(state.day1.step);
    } else {
      goto('intro');
    }
    refresh();

    /* первый непоказанный абзац печатается сразу при входе */
    if (state.day1.step === 'intro' && !state.day1.intro.done && shownCount < INTRO_TEXTS.length) {
      introAdd();
    }
  }

  /* ---------- Регистрация дня в каркасе ---------- */
  var day1 = {
    id: 1,
    title: 'ДЕНЬ 1',
    render: function (root, api) { return render(root, api); },
    /* публичная перерисовка дня (для каркаса и отладки) */
    reinit: function (root, api) {
      render(root || lastRoot || document.getElementById('puzzle-screen'), api || lastApi);
    }
  };

  window.JR_DAYS = window.JR_DAYS || {};
  window.JR_DAYS[1] = day1;
})();
