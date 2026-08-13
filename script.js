(function(){
  'use strict';

  function formatPrice(n){
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' руб.';
  }

  /* ---------- Hero-декорации (ведьма, грибы, ветки): на некоторых мобильных
     браузерах атрибут autoplay не срабатывает надёжно (особенно когда на
     экране сразу несколько видео) — тогда видео так и остаётся чёрным
     прямоугольником, ни разу не нарисовав кадр. Подстраховываемся явным
     вызовом .play() — если autoplay уже сработал, это просто no-op. */
  document.querySelectorAll('.play-hero video').forEach(function(video){
    var tryPlay = function(){ video.play().catch(function(){}); };
    tryPlay();
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden && video.paused) tryPlay();
    });
  });

  /* ---------- Сдвиг фазы зацикленного видео: чтобы одинаковые ролики слева и
     справа не двигались синхронно, стартуем один из них с середины клипа. */
  document.querySelectorAll('video[data-phase-offset]').forEach(function(video){
    var offset = parseFloat(video.getAttribute('data-phase-offset')) || 0;
    function apply(){ video.currentTime = offset % (video.duration || 1); }
    if (video.readyState >= 1){
      apply();
    } else {
      video.addEventListener('loadedmetadata', apply, {once:true});
    }
  });

  /* ---------- «Почему стоит к нам прийти»: карусель из 4 видео раз в 8 сек —
     главное видео и три маленьких справа сдвигаются по кругу одновременно,
     с полоской-таймером снизу главного видео, которая заполняется к моменту смены. */
  var whyMain = document.querySelector('.why-photo-main');
  if (whyMain){
    var whyFill = whyMain.querySelector('.why-timer-fill');
    // У каждого слота два наложенных <video> (двойная буферизация): пока
    // виден активный слой со старым кадром, в тени грузится новый ролик
    // во второй слой, и только когда он готов — оба плавно кроссфейдятся.
    // Так картинка никогда не пропадает и не мелькает чёрным между сменами.
    var whySlots = [whyMain, document.querySelector('.why-photo-1'), document.querySelector('.why-photo-2'), document.querySelector('.why-photo-3')]
      .map(function(el){
        if (!el) return null;
        return {a: el.querySelector('.why-v-a'), b: el.querySelector('.why-v-b'), activeIsA: true};
      });
    var whyPhotos = [
      {src:'анимация/гуси-лебеди-анимация.mp4', alt:'Сцена спектакля «Гуси-лебеди»'},
      {src:'анимация/колобок-анимация.mp4', alt:'Сцена «Колобок»'},
      {src:'анимация/айболит-анимация.mp4', alt:'Сцена «Айболит»'},
      {src:'анимация/кошкин-дом-анимация.mp4', alt:'Сцена «Кошкин дом»'}
    ];
    var WHY_INTERVAL = 5000;
    var whyIndex = 0;
    function whyStartTimer(){
      whyFill.style.transition = 'none';
      whyFill.style.width = '0%';
      void whyFill.offsetWidth; // форсируем reflow, чтобы transition ниже применился заново
      whyFill.style.transition = 'width ' + (WHY_INTERVAL / 1000) + 's linear';
      whyFill.style.width = '100%';
    }
    // Видео без autoplay ничего не рисует в кадре, пока хоть раз не
    // проиграется — иначе картинка просто пустая (чёрная/прозрачная).
    // Главному видео даём играть и дальше, боковым — один кадр и сразу пауза,
    // чтобы они стояли неподвижно, но не пропадали.
    function whyShowFrame(video, isMain){
      var p = video.play();
      if (p && p.then){
        p.then(function(){ if (!isMain) video.pause(); }).catch(function(){});
      } else if (!isMain){
        video.pause();
      }
    }
    function whySwap(slot, slotIndex, isMain){
      var incoming = slot.activeIsA ? slot.b : slot.a;
      var outgoing = slot.activeIsA ? slot.a : slot.b;
      var p = whyPhotos[(whyIndex + slotIndex) % whyPhotos.length];
      var source = incoming.querySelector('source');
      if (!source){
        source = document.createElement('source');
        source.type = 'video/mp4';
        incoming.appendChild(source);
      }
      source.src = p.src;
      incoming.setAttribute('aria-label', p.alt);
      incoming.load();
      var revealed = false;
      function reveal(){
        if (revealed) return;
        revealed = true;
        whyShowFrame(incoming, isMain);
        incoming.classList.add('active');
        outgoing.classList.remove('active');
        slot.activeIsA = !slot.activeIsA;
      }
      // Кроссфейд стартуем только когда новый кадр реально готов —
      // старый слой остаётся видимым (activeIsA не менялось) всё это время.
      incoming.addEventListener('loadeddata', reveal, {once:true});
      setTimeout(reveal, 600); // подстраховка, если событие не пришло
    }
    function whyNext(){
      whyIndex = (whyIndex + 1) % whyPhotos.length;
      whySlots.forEach(function(slot, slotIndex){
        if (!slot) return;
        whySwap(slot, slotIndex, slotIndex === 0);
      });
      whyStartTimer();
    }
    // Показываем кадр во всех четырёх слотах сразу при загрузке страницы —
    // без этого боковые видео остаются пустыми до первой смены.
    whySlots.forEach(function(slot, slotIndex){
      if (!slot) return;
      var video = slot.a, isMain = slotIndex === 0;
      function show(){ whyShowFrame(video, isMain); video.classList.add('active'); }
      if (video.readyState >= 2) show();
      else video.addEventListener('loadeddata', show, {once:true});
    });
    whyStartTimer();
    setInterval(whyNext, WHY_INTERVAL);
  }

  /* ---------- Бургер-меню в хедере ---------- */
  var menuToggles = document.querySelectorAll('[data-menu-toggle]');
  function closeAllMenus(except){
    document.querySelectorAll('.menu-panel.open').forEach(function(p){
      if (p !== except) p.classList.remove('open');
    });
  }
  menuToggles.forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      var panel = document.getElementById(btn.getAttribute('data-menu-toggle'));
      var willOpen = !panel.classList.contains('open');
      closeAllMenus();
      if (willOpen) panel.classList.add('open');
    });
  });
  document.addEventListener('click', function(){ closeAllMenus(); });
  document.querySelectorAll('.menu-panel').forEach(function(p){
    p.addEventListener('click', function(e){ e.stopPropagation(); });
  });
  document.querySelectorAll('.menu-panel a').forEach(function(a){
    a.addEventListener('click', function(){ closeAllMenus(); });
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeAllMenus(); });

  /* ---------- FAQ аккордеон ---------- */
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function(){
      var wasOpen = item.classList.contains('open');
      item.closest('.faq-list').querySelectorAll('.faq-item.open').forEach(function(o){ o.classList.remove('open'); });
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ---------- Табы бронирования (афиша.html) ---------- */
  var tabButtons = document.querySelectorAll('.booking-tabs button');
  var panels = document.querySelectorAll('.booking-panel');
  function showPanel(name){
    tabButtons.forEach(function(b){ b.classList.toggle('active', b.dataset.tab === name); });
    panels.forEach(function(p){ p.classList.toggle('active', p.dataset.panel === name); });
    window.scrollTo({top:0, behavior:'smooth'});
  }
  tabButtons.forEach(function(btn){
    btn.addEventListener('click', function(){ showPanel(btn.dataset.tab); });
  });
  document.querySelectorAll('[data-goto]').forEach(function(btn){
    btn.addEventListener('click', function(){ showPanel(btn.dataset.goto); });
  });

  /* ---------- Схема зала: генерация мест ---------- */
  var seatRoot = document.getElementById('seat-rows');
  if (seatRoot){
    var offSeats = {'1-13':1,'1-14':1,'2-10':1,'2-11':1,'2-12':1,'3-14':1,'3-15':1,'6r-1':1,'6r-2':1};
    var config = [
      {rows:[1,2,3,4,5], price:1700, split:false, perSide:29},
      {rows:[6,7,8,9], price:1500, split:true, perSide:10, gap:421},
      {rows:[10,11,12], price:1300, split:true, perSide:11, gap:308},
      {rows:[13,14,15], price:1100, split:true, perSide:11, gap:198}
    ];
    config.forEach(function(group){
      group.rows.forEach(function(r){
        var rowEl = document.createElement('div');
        rowEl.className = 'seat-row tier-' + group.price;
        var label = document.createElement('span');
        label.className = 'row-num';
        label.textContent = r;
        rowEl.appendChild(label);
        if (!group.split){
          for (var n = 1; n <= group.perSide; n++){
            rowEl.appendChild(makeSeat(r, n, group.price, offSeats[r + '-' + n]));
          }
        } else {
          for (var nl = 1; nl <= group.perSide; nl++){
            rowEl.appendChild(makeSeat(r, nl, group.price, offSeats[r + 'l-' + nl]));
          }
          var gap = document.createElement('span');
          gap.style.width = group.gap + 'px';
          gap.style.display = 'inline-block';
          rowEl.appendChild(gap);
          for (var nr = 1; nr <= group.perSide; nr++){
            rowEl.appendChild(makeSeat(r, group.perSide + nr, group.price, offSeats[r + 'r-' + nr]));
          }
        }
        seatRoot.appendChild(rowEl);
      });
    });
  }
  function makeSeat(row, num, price, isOff){
    var s = document.createElement('span');
    s.className = 'seat' + (isOff ? ' off' : '');
    s.dataset.id = row + '-' + num;
    s.dataset.row = row;
    s.dataset.num = num;
    s.dataset.price = price;
    return s;
  }

  /* ---------- Схема зала: выбор мест ---------- */
  var seatMap = document.querySelector('.seat-map');
  if (seatMap){
    var selected = [];
    var rowsBox = document.getElementById('ticket-rows');
    var totalBox = document.getElementById('order-total');

    function renderOrder(){
      if (!rowsBox) return;
      rowsBox.innerHTML = '';
      var total = 0;
      selected.forEach(function(s){
        total += s.price;
        var row = document.createElement('div');
        row.className = 'ticket-row';
        row.innerHTML = '<span>ПАРТЕР ряд ' + s.row + ' место ' + s.num + '</span>' +
          '<span class="price">' + s.price + ' руб</span><i class="rm" data-seat="' + s.id + '"></i>';
        rowsBox.appendChild(row);
      });
      if (totalBox) totalBox.textContent = formatPrice(total);
      document.querySelectorAll('[data-seat-count]').forEach(function(el){ el.textContent = selected.length; });
    }

    seatMap.addEventListener('click', function(e){
      var seat = e.target.closest('.seat');
      if (seat && !seat.classList.contains('off')){
        var id = seat.dataset.id;
        var idx = selected.findIndex(function(s){ return s.id === id; });
        if (idx > -1){
          selected.splice(idx, 1);
          seat.classList.remove('selected');
        } else {
          selected.push({
            id: id,
            row: seat.dataset.row,
            num: seat.dataset.num,
            price: parseInt(seat.dataset.price, 10)
          });
          seat.classList.add('selected');
        }
        renderOrder();
      }
      var rm = e.target.closest('.rm[data-seat]');
      if (rm){
        var rid = rm.dataset.seat;
        selected = selected.filter(function(s){ return s.id !== rid; });
        var el = seatMap.querySelector('.seat[data-id="' + rid + '"]');
        if (el) el.classList.remove('selected');
        renderOrder();
      }
    });

    var toOrderBtn = document.getElementById('to-order-step');
    if (toOrderBtn){
      toOrderBtn.addEventListener('click', function(){
        renderOrder();
        showPanel('order');
      });
    }
  }

  /* ---------- Викторина ---------- */
  var quiz = document.querySelector('.quiz-list');
  if (quiz){
    var submitBtn = document.querySelector('.quiz-submit');
    var scorePill = document.querySelector('.quiz-score-pill');
    var resultPill = document.querySelector('.quiz-result-pill');
    submitBtn && submitBtn.addEventListener('click', function(){
      var leadSection = document.getElementById('lead-section');
      // пересчитываем результат при каждом нажатии — иначе счёт застревал
      // на значении первого (возможно, ещё не полного) прохождения теста.
      // первый клик — только проверяем ответы и показываем результат, не уводя
      // пользователя со страницы: вопросы остаются на экране, чтобы можно было
      // прокрутить обратно и посмотреть, где отмечено правильно/неправильно
      var wasGraded = quiz.classList.contains('graded');
      quiz.classList.add('graded');
      var items = quiz.querySelectorAll('.quiz-item');
      var correct = 0;
      items.forEach(function(item){
        var checked = item.querySelector('input:checked');
        if (checked && checked.dataset.correct === '1') correct++;
        item.querySelectorAll('.quiz-opt').forEach(function(opt){
          var inp = opt.querySelector('input');
          var dot = opt.querySelector('.dot');
          dot.classList.remove('correct', 'wrong');
          if (inp.dataset.correct === '1') dot.classList.add('correct');
          else if (inp.checked) dot.classList.add('wrong');
        });
      });
      var pct = Math.round((correct / items.length) * 1000) / 10;
      if (scorePill) scorePill.textContent = 'Правильных ответов: ' + correct + ' из ' + items.length;
      if (resultPill) resultPill.textContent = 'Результат: ' + pct + '%';
      if (leadSection) leadSection.style.display = 'block';
      if (!wasGraded){
        var quizFooter = document.querySelector('.quiz-footer');
        if (quizFooter) quizFooter.scrollIntoView({behavior:'smooth', block:'center'});
      } else if (leadSection){
        // второй и последующие клики — переходим за подарком
        leadSection.scrollIntoView({behavior:'smooth'});
      }
    });
  }

  /* ---------- Карусель «Ближайшие представления»: стрелки листают карточки по кругу ---------- */
  var blizSection = document.getElementById('blizhajshie');
  if (blizSection){
    var blizShows = [
      {title:'Кошкин дом', font:'rep-font-koshkin', img:'frames/IMG_20260318_222105.png', dates:'12.03 — 11.00; 16.00<br>20.03 — 11.00; 16.00'},
      {title:'Гуси-лебеди', font:'rep-font-gusi', img:'frames/гуси-сцена.jpg', dates:'13.03 — 11.00; 16.00<br>21.03 — 11.00; 16.00'},
      {title:'Айболит', font:'rep-font-aibolit', img:'frames/7c9f7d8a-58b7-48c4-939f-ec4cb22c3e2d_b6a72888-187a-493c-b027-33e9e2f877e7.png', dates:'14.03 — 11.00; 16.00<br>22.03 — 11.00; 16.00'},
      {title:'КОЛОБОК', font:'rep-font-kolobok', img:'frames/9c670e1e-eb0f-42a7-a597-39ec2c7de1a1_c409b13a-e003-4b60-b7ec-a4bc60844353.png', dates:'15.03 — 11.00; 16.00<br>23.03 — 11.00; 16.00'}
    ];
    var blizIndex = 0;
    var blizTrack = blizSection.querySelector('[data-track]');
    function renderBliz(){
      var n = blizShows.length, html = '';
      for (var i = 0; i < n; i++){
        var s = blizShows[(blizIndex + i) % n];
        html += '<div class="show-card"><div class="thumb"><img class="cover-img" src="' + s.img + '" alt="' + s.title + '"></div><h3 class="' + s.font + '">' + s.title + '</h3><p class="dates">' + s.dates + '</p><a href="афиша.html" class="btn-buy-ticket">купить билет</a></div>';
      }
      blizTrack.innerHTML = html;
    }
    blizSection.querySelector('.arrow-left').addEventListener('click', function(){ blizIndex = (blizIndex - 1 + blizShows.length) % blizShows.length; renderBliz(); });
    blizSection.querySelector('.arrow-right').addEventListener('click', function(){ blizIndex = (blizIndex + 1) % blizShows.length; renderBliz(); });
    renderBliz();

    /* ---------- Магнитное увеличение карточек по наведению (macOS-dock) ------
       Карточка под курсором и соседи по расстоянию плавно раздвигаются шире —
       коэффициент считается через smoothstep и сглаживается в цикле rAF. */
    var MAG_BASE = 400, MAG_HOVER = 460, MAG_GAP = 45, MAG_INFLUENCE = 320;
    var magTargets = blizShows.map(function(){ return 0; });
    var magCur = blizShows.map(function(){ return 0; });
    var magLoopId = 0;
    function magApply(){
      var cards = blizTrack.querySelectorAll('.show-card');
      cards.forEach(function(card, i){
        card.style.width = (MAG_BASE + (MAG_HOVER - MAG_BASE) * (magCur[i] || 0)) + 'px';
      });
    }
    function magStartLoop(){
      if (magLoopId) return;
      (function step(){
        var moving = false;
        for (var i = 0; i < magCur.length; i++){
          var d = (magTargets[i] || 0) - magCur[i];
          if (Math.abs(d) > 0.001){ magCur[i] += d * 0.2; moving = true; }
          else magCur[i] = magTargets[i] || 0;
        }
        magApply();
        magLoopId = moving ? requestAnimationFrame(step) : 0;
      })();
    }
    blizTrack.addEventListener('mousemove', function(e){
      // на мобильном карточки ширятся через CSS (78vw) под узкий экран —
      // инлайновый style.width от эффекта увеличения перебивал бы это
      if (window.innerWidth <= 767) return;
      var rect = blizTrack.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var n = blizShows.length;
      var next = [];
      for (var i = 0; i < n; i++){
        var center = i * (MAG_BASE + MAG_GAP) + MAG_BASE / 2;
        var dist = Math.abs(cx - center);
        var f = Math.max(0, 1 - dist / MAG_INFLUENCE);
        next[i] = f * f * (3 - 2 * f);
      }
      magTargets = next;
      magStartLoop();
    });
    blizTrack.addEventListener('mouseleave', function(){
      magTargets = blizShows.map(function(){ return 0; });
      magStartLoop();
    });
  }

  /* ---------- Карусель «Отзывы»: стрелки листают карточки по кругу ---------- */
  var otzyvySection = document.getElementById('otzyvy');
  if (otzyvySection){
    var reviews = [
      {photo:'frames/01.png', photoAlt:'Дети на&nbsp;мастер-классе', avatar:'frames/avatar-fox-painted.png', name:'Фрау Лерерин', level:'Знаток города 9 уровня', stars:'★★★★★ &nbsp;30 декабря 2024', text:'Были на&nbsp;спектакле «Курочка ряба» в&nbsp;прошлом году. Дочке очень понравилось. Очень удобные кресла, можно сделать повыше для&nbsp;совсем маленьких зрителей. После спектакля можно поучаствовать в&nbsp;мастер-классе по&nbsp;разукрашиванию керамической игрушки. Мы так и&nbsp;сделали, и&nbsp;у нас дома живёт керамическая фигурка кошки. В&nbsp;фойе на&nbsp;1 и&nbsp;2 этаже можно посмотреть на&nbsp;театральные куклы. Кафетерий на&nbsp;2-м этаже.', ctaHref:'спектакль-кошкин-дом.html#o-spektakle', ctaLabel:'Узнать подробнее о&nbsp;спектакле, «Кошкин&nbsp;дом»'},
      {photo:'frames/02.png', photoAlt:'Зрители в&nbsp;зале', avatar:'frames/avatar-fox-icon.png', name:'Тамара', level:'Знаток города 4 уровня', stars:'★★★★★ &nbsp;14 февраля', text:'Самый любимый театр! Ходим часто и&nbsp;с большим удовольствием! Дети у&nbsp;меня разного возраста, но&nbsp;им всем очень нравится! Уже и&nbsp;актёров узнают) После каждого спектакля мы рисуем главных героев, а&nbsp;ещё вдохновились на&nbsp;создание собственного домашнего театра! Спасибо прекрасным актёрам, режиссёрам и&nbsp;всем тем, кто имеет отношение к&nbsp;этому замечательному театру! Желаем вам творческих успехов, вдохновения и&nbsp;процветания❤️', ctaHref:'спектакль-айболит.html#o-spektakle', ctaLabel:'Узнать подробнее о&nbsp;спектакле, «Айболит»'},
      {photo:'frames/03.png', photoAlt:'Дети в&nbsp;зале', avatar:'frames/avatar-smiley.png', name:'Алёна П.', level:'Знаток города 5 уровня', stars:'★★★★★ &nbsp;26 сентября 2025', text:'Ходили с&nbsp;дочкой на&nbsp;спектакль «Мойдодыр». Замечательная классическая постановка. Яркие куклы, прекрасные актёры. Обстановка в&nbsp;театре камерная, уютная. В&nbsp;холле есть музей кукол, можно поближе рассмотреть эти шедевры. Проводят мастер-классы по&nbsp;росписи деревянных и&nbsp;фарфоровых фигурок. Мастера аккуратные, внимательные к&nbsp;детям, общаются заинтересованно, помогают. Впечатлений осталось много.', ctaHref:'спектакль-колобок.html#o-spektakle', ctaLabel:'Узнать подробнее о&nbsp;спектакле, «Колобок»'},
      {photo:'frames/04.webp', photoAlt:'Дети в&nbsp;зрительном зале', avatar:'frames/avatar-frog.png', name:'Оксана Петрова', level:'Знаток города 6 уровня', stars:'★★★★★ &nbsp;3 марта', text:'Ходили всей семьёй на&nbsp;«Гуси-лебеди» — дети сидели как&nbsp;завороженные, не&nbsp;могли оторваться от&nbsp;сцены! Куклы очень красивые, а&nbsp;гуси совсем как&nbsp;настоящие. Сынок весь спектакль что-то записывал в&nbsp;блокнотик, говорит — готовится к&nbsp;своей собственной пьесе) Зал уютный, из&nbsp;партера всё прекрасно видно даже самым маленьким. Обязательно придём ещё!', ctaHref:'спектакль.html#o-spektakle', ctaLabel:'Узнать подробнее о&nbsp;спектакле,<br>«Гуси&#8209;лебеди»'}
    ];
    var reviewIndex = 0;
    var reviewsTrack = otzyvySection.querySelector('[data-track]');
    function renderReviews(){
      // на мобильном стрелки скрыты, карусель — это просто горизонтальный
      // свайп-список, поэтому показываем все отзывы сразу, а не по 3 с ротацией
      var n = window.innerWidth <= 767 ? reviews.length : Math.min(3, reviews.length), html = '';
      for (var i = 0; i < n; i++){
        var r = reviews[(reviewIndex + i) % reviews.length];
        var isMid = (i === 1);
        var midClass = isMid ? ' mid' : '';
        var ctaIcon = isMid ? 'icons/review-link-gold.svg' : 'icons/review-link-red.svg';
        html +=
          '<div class="review-card' + midClass + '">' +
            '<div class="photo"><img class="cover-img" src="' + r.photo + '" alt="' + r.photoAlt + '"></div>' +
            '<div class="body">' +
              '<div class="head">' +
                '<div class="who"><img class="avatar" src="' + r.avatar + '" alt=""><div><div class="name">' + r.name + '</div><div class="level">' + r.level + '</div></div></div>' +
                '<button type="button" class="follow">Подписаться</button>' +
              '</div>' +
              '<div class="stars">' + r.stars + '</div>' +
              '<p class="text">' + r.text + '</p>' +
            '</div>' +
            '<a class="cta" href="' + r.ctaHref + '"><span class="label">' + r.ctaLabel + '</span><img src="' + ctaIcon + '" alt=""></a>' +
          '</div>';
      }
      reviewsTrack.innerHTML = html;
    }
    reviewsTrack.addEventListener('click', function(e){
      var followBtn = e.target.closest('.follow');
      if (followBtn){
        var followed = followBtn.classList.toggle('followed');
        followBtn.textContent = followed ? 'Вы подписаны' : 'Подписаться';
      }
    });
    otzyvySection.querySelector('.arrow-left').addEventListener('click', function(){ reviewIndex = (reviewIndex - 1 + reviews.length) % reviews.length; renderReviews(); });
    otzyvySection.querySelector('.arrow-right').addEventListener('click', function(){ reviewIndex = (reviewIndex + 1) % reviews.length; renderReviews(); });
    renderReviews();
  }

  /* ---------- Карусель репертуара «coverflow»: точный порт референсной
     Originkit-карусели с пресетом {activeHeight:530, restWidth:334,
     restHeight:473, gap:14, showArrows:false, autoplay:true}. activeWidth,
     radius и transition{duration:0.3,delay:1} не переопределены — берутся из
     дефолтов компонента. Единая непрерывная позиция `repPos` анимируется
     через requestAnimationFrame с постоянной скоростью и сама переключает
     карточку по истечении dwell — ровно как tick() в референсе. showArrows:
     false и autoplay:true → стрелки скрыты и клик/клавиатура для навигации
     тоже отключены (как в компоненте: selectable = !isStatic && !autoplay).
     Кнопка «купить билет» и подписи над картинками — из более ранней
     доработки, без изменений. */
  var repSection = document.querySelector('[data-repertoire]');
  if (repSection){
    var repShows = [
      {title:'КОШКИН ДОМ', font:'rep-font-koshkin', sub:'по&nbsp;мотивам сказки<br>С.Я. Маршака «Кошкин дом»', img:'frames/IMG_20260318_222105.png', link:'афиша.html'},
      {title:'ГУСИ-ЛЕБЕДИ', font:'rep-font-gusi', sub:'по&nbsp;мотивам русской народной<br>сказки «Гуси-лебеди»', img:'frames/гуси-сцена.jpg', link:'афиша.html'},
      {title:'АЙБОЛИТ', font:'rep-font-aibolit', sub:'по&nbsp;мотивам сказки<br>К.И. Чуковского «Айболит»', img:'frames/7c9f7d8a-58b7-48c4-939f-ec4cb22c3e2d_b6a72888-187a-493c-b027-33e9e2f877e7.png', link:'афиша.html'},
      {title:'КОЛОБОК', font:'rep-font-kolobok', sub:'по&nbsp;мотивам русской народной<br>сказки «Колобок»', img:'frames/9c670e1e-eb0f-42a7-a597-39ec2c7de1a1_c409b13a-e003-4b60-b7ec-a4bc60844353.png', link:'афиша.html'}
    ];
    var repRow = repSection.querySelector('[data-rep-row]');
    // --- размеры из Figma-скринов: боковые фото 800×600 (как есть, выходят
    // за пределы фрейма), главное фото шире на 20pt с каждой стороны (+40 к
    // ширине) и такой высоты, чтобы до кнопки оставалось ровно 40px. ---
    var REP_REST_W = 550;            // боковые карточки — уменьшены (было 800)
    var REP_REST_IMG_H = 413;        // сохраняем те же пропорции 4:3 (было 600)
    var REP_ACTIVE_W = REP_REST_W + 40; // главное фото шире на 20pt слева и справа
    var REP_GAP = 14;
    var REP_RADIUS = 2;              // radius (шкала 0..20, как в референсе)
    var REP_AUTOPLAY = true;         // autoplay
    var REP_AUTOPLAY_DIR = 'leftToRight'; // карусель крутится слева направо
    var REP_MOVE_DUR = 0.6;          // медленнее едет между карточками (было 0.3)
    var REP_DWELL = 3;               // дольше стоит на месте перед автопереключением (было 1)
    var REP_TITLE_GAP = 37;          // отступ между заголовком и картинкой (наша доработка)
    var REP_BTN_GAP = 40;            // отступ между главным фото и кнопкой «купить билет»
    var REP_BTN_TOP_SECTION = 927;   // top кнопки (см. .rep-btn-buy в styles.css)
    var REP_ROW_TOP = 189;           // top .repertoire-row внутри секции
    // Нижний край картинки — общий для всех карточек (не только активной),
    // чтобы отступ до кнопки был ровно 40px именно когда карточка в центре.
    var REP_IMG_BOTTOM_Y = REP_BTN_TOP_SECTION - REP_BTN_GAP - REP_ROW_TOP;
    // Высота заголовка активной карточки (однострочный, 48px) измеряется
    // один раз после первого рендера — см. repMeasureTitle().
    var REP_ACTIVE_TITLE_H = 64; // запасное значение, уточняется после рендера
    var REP_C1 = REP_ACTIVE_W / 2 + REP_GAP + REP_REST_W / 2;
    var REP_PITCH = REP_REST_W + REP_GAP;
    var repCount = repShows.length;
    var repPos = 0;      // непрерывная позиция (плавно едет к repTarget)
    var repTarget = 0;   // целевой индекс (может расти/убывать без ограничений)
    var repRafId = null;
    var repLastT = null;
    var repDwellAcc = 0;
    var repDir = REP_AUTOPLAY_DIR === 'leftToRight' ? -1 : 1;
    var repPrefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function cardHTML(show, i){
      return (
        '<div class="rep-card" data-idx="' + i + '">' +
          '<div class="rep-title-row">' +
            '<h3 class="' + show.font + '">' + show.title + '</h3>' +
            '<p class="rep-subtitle">' + show.sub + '</p>' +
          '</div>' +
          '<div class="rep-image"><img src="' + show.img + '" alt="' + show.title + '"></div>' +
        '</div>'
      );
    }
    // relOf — кратчайшее по кругу расстояние карточки i от непрерывной позиции pos.
    function repRelOf(i, pos){
      var rel = ((i - pos) % repCount + repCount) % repCount;
      if (rel > repCount / 2) rel -= repCount;
      return rel;
    }
    function repXForRel(rel){
      var ar = Math.abs(rel);
      var mag = ar <= 1 ? ar * REP_C1 : REP_C1 + (ar - 1) * REP_PITCH;
      return (rel < 0 ? -1 : 1) * mag;
    }
    // 0 в центре (полный активный размер) → 1 через один слот (размер «пластинки»).
    function repBlend(rel){ return Math.min(Math.abs(rel), 1); }

    // Высота главного фото — производная величина: нижний край картинки
    // зафиксирован (REP_IMG_BOTTOM_Y), поэтому высота = расстояние от низа
    // до верхней точки, где кончается заголовок + отступ до него.
    var REP_ACTIVE_IMG_H = REP_IMG_BOTTOM_Y - REP_TITLE_GAP - REP_ACTIVE_TITLE_H;

    var repCards = null;
    function repRenderFrame(){
      if (!repCards) repCards = repRow.querySelectorAll('.rep-card');
      repCards.forEach(function(card){
        var i = +card.dataset.idx;
        var rel = repRelOf(i, repPos);
        var ar = Math.abs(rel);
        var a = repBlend(rel);
        var isActive = ar < 0.5;
        var opacity = ar <= 1 ? 1 : (ar >= 2 ? 0 : 1 - (ar - 1));
        var imgH = REP_ACTIVE_IMG_H + (REP_REST_IMG_H - REP_ACTIVE_IMG_H) * a;
        var w = REP_ACTIVE_W + (REP_REST_W - REP_ACTIVE_W) * a;
        // Нижний край картинки общий для всех карточек — держим стабильный
        // 40px отступ до кнопки, когда карточка в центре.
        var imgTop = REP_IMG_BOTTOM_Y - imgH;
        // borderRadius = (radius/20) * (min(w,h)/2) — формула из референса.
        var radius = (Math.max(0, Math.min(20, REP_RADIUS)) / 20) * (Math.min(w, imgH) / 2);
        card.style.transform = 'translateX(' + repXForRel(rel) + 'px) translateX(-50%)';
        card.style.width = w + 'px';
        card.style.opacity = String(opacity);
        card.style.zIndex = String(Math.round(1000 - ar * 100));
        card.style.pointerEvents = 'none'; // autoplay:true → карточки некликабельны, как в референсе
        card.classList.toggle('current', isActive);
        var imageEl = card.querySelector('.rep-image');
        var titleEl = card.querySelector('.rep-title-row');
        imageEl.style.height = imgH + 'px';
        imageEl.style.top = imgTop + 'px';
        imageEl.style.borderRadius = radius + 'px';
        // заголовок ставится ровно над картинкой с постоянным отступом —
        // высота заголовка измеряется уже после того, как применилась
        // ширина карточки (иначе перенос строк даст неверные цифры).
        titleEl.style.top = (imgTop - REP_TITLE_GAP - titleEl.offsetHeight) + 'px';
      });
    }

    // Один rAF-цикл двигает repPos к repTarget с постоянной скоростью, а после
    // того как доехал — если включён автоплей, копит паузу (dwell) и сам
    // сдвигает target дальше. Точно как tick() в референсе.
    function repTick(t){
      var last = repLastT == null ? t : repLastT;
      var dt = Math.min((t - last) / 1000, 1 / 30);
      repLastT = t;
      var diff = repTarget - repPos;
      var step = (1 / REP_MOVE_DUR) * dt;
      var arriving = repPrefersReduced || Math.abs(diff) <= step;
      if (arriving){
        repPos = repTarget;
        repRenderFrame();
        if (REP_AUTOPLAY){
          repDwellAcc += dt;
          if (repDwellAcc >= REP_DWELL){
            repDwellAcc = 0;
            repTarget += repDir;
          }
          repRafId = requestAnimationFrame(repTick);
          return;
        }
        repRafId = null;
        repLastT = null;
        return;
      }
      repPos += (diff < 0 ? -1 : 1) * step;
      repRenderFrame();
      repRafId = requestAnimationFrame(repTick);
    }
    function repEnsureRunning(){
      if (repRafId == null){
        repLastT = null;
        repRafId = requestAnimationFrame(repTick);
      }
    }
    // Ручное листание стрелками поверх автоплея — сбрасываем накопленную
    // паузу, чтобы автоплей не «доехал» сразу следом за ручным кликом.
    function goNext(){ repTarget += 1; repDwellAcc = 0; repEnsureRunning(); }
    function goPrev(){ repTarget -= 1; repDwellAcc = 0; repEnsureRunning(); }

    repRow.innerHTML = repShows.map(cardHTML).join('');
    repCards = repRow.querySelectorAll('.rep-card');

    // На мобильных экранах coverflow-математика (расчёт под канву 1920px)
    // не подходит — вместо неё показываем карточки простой горизонтальной
    // лентой со скроллом (см. .rep-row-mobile в styles.css) и не запускаем
    // rAF-цикл вовсе.
    var repIsMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    if (repIsMobile){
      repRow.classList.add('rep-row-mobile');
    } else {
      repRenderFrame();
      // Уточняем высоту заголовка активной карточки по факту рендера (шрифты
      // разные у каждого спектакля могут на пару px отличаться по высоте
      // строки) и пересчитываем высоту фото, чтобы отступ до кнопки был
      // ровно 40px, а не «примерно».
      var repActiveTitleEl = repRow.querySelector('.rep-card.current .rep-title-row');
      if (repActiveTitleEl && repActiveTitleEl.offsetHeight){
        REP_ACTIVE_TITLE_H = repActiveTitleEl.offsetHeight;
        REP_ACTIVE_IMG_H = REP_IMG_BOTTOM_Y - REP_TITLE_GAP - REP_ACTIVE_TITLE_H;
        repRenderFrame();
      }
      if (REP_AUTOPLAY){
        repDwellAcc = 0;
        repEnsureRunning();
      }
    }
    var repArrowPrev = repSection.querySelector('[data-rep-prev]'); // левая стрелка
    var repArrowNext = repSection.querySelector('[data-rep-next]'); // правая стрелка
    // Левая стрелка = движение влево (goNext сдвигает активную карточку влево),
    // правая стрелка = движение вправо (goPrev сдвигает её вправо).
    if (repArrowPrev) repArrowPrev.addEventListener('click', goNext);
    if (repArrowNext) repArrowNext.addEventListener('click', goPrev);
  }

  /* ---------- Модалка «Оставить отзыв» ---------- */
  var reviewModal = document.querySelector('[data-review-modal]');
  if (reviewModal){
    var reviewForm = document.getElementById('review-form');
    var reviewFormWrap = reviewModal.querySelector('.review-modal-form');
    var reviewThanks = reviewModal.querySelector('.thanks');
    var reviewStars = reviewModal.querySelectorAll('[data-rating] button');
    var reviewPhotoInput = reviewModal.querySelector('[data-review-photo-input]');
    var reviewPhotoPreview = reviewModal.querySelector('[data-review-photo-preview]');
    var reviewPhotoImg = reviewPhotoPreview ? reviewPhotoPreview.querySelector('img') : null;

    function resetReviewPhoto(){
      if (!reviewPhotoInput) return;
      reviewPhotoInput.value = '';
      reviewPhotoPreview.classList.remove('show');
      reviewPhotoImg.src = '';
    }
    if (reviewPhotoInput){
      reviewPhotoInput.addEventListener('change', function(){
        var file = reviewPhotoInput.files && reviewPhotoInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(){
          reviewPhotoImg.src = reader.result;
          reviewPhotoPreview.classList.add('show');
        };
        reader.readAsDataURL(file);
      });
      reviewModal.querySelector('[data-review-photo-remove]').addEventListener('click', resetReviewPhoto);
    }

    function openReviewModal(){
      reviewModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeReviewModal(){
      reviewModal.classList.remove('open');
      document.body.style.overflow = '';
      if (reviewForm) reviewForm.reset();
      reviewStars.forEach(function(s){ s.classList.remove('active'); });
      resetReviewPhoto();
      reviewFormWrap.classList.remove('hide');
      reviewThanks.classList.remove('show');
    }
    document.querySelectorAll('[data-open-review-modal]').forEach(function(btn){
      btn.addEventListener('click', openReviewModal);
    });
    reviewModal.querySelectorAll('[data-close-review-modal]').forEach(function(btn){
      btn.addEventListener('click', closeReviewModal);
    });
    reviewModal.addEventListener('click', function(e){
      if (e.target === reviewModal) closeReviewModal();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && reviewModal.classList.contains('open')) closeReviewModal();
    });

    reviewStars.forEach(function(star, i){
      star.addEventListener('click', function(){
        reviewStars.forEach(function(s, j){ s.classList.toggle('active', j <= i); });
      });
    });

    if (reviewForm){
      reviewForm.addEventListener('submit', function(e){
        e.preventDefault();
        reviewFormWrap.classList.add('hide');
        reviewThanks.classList.add('show');
      });
    }
  }

  /* ---------- Лид-форма ---------- */
  var leadForm = document.getElementById('lead-form');
  if (leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var submitSpan = leadForm.querySelector('.lead-submit span');
      if (submitSpan) submitSpan.textContent = 'Спасибо! Мы свяжемся с вами';
    });
  }
})();
