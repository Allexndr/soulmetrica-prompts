/* ─────────────────────────────────────────────────────────────
   VELUNA · квиз-бот-помощник + инлайн-мини-квиз.
   Перенесено из эталонного бандла SoulMetrica. Самодостаточно.
   Финал → открывает штатную модалку заказа через window.velunaOpenOrder.
   ───────────────────────────────────────────────────────────── */
(function () {
  if (window.__vqbLoaded) return;
  window.__vqbLoaded = true;

  var css = `
  .vqb-launch{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:120;display:flex;align-items:center;gap:12px;cursor:pointer;font-family:'Nunito','Manrope',sans-serif;}
  .vqb-launch-bubble{background:#fff;color:#241B2E;padding:11px 15px;border-radius:18px 18px 4px 18px;box-shadow:0 10px 30px rgba(36,27,46,.16);font-size:14px;max-width:215px;line-height:1.35;opacity:0;transform:translateY(8px) scale(.96);transition:.4s cubic-bezier(.2,1,.3,1);pointer-events:none;}
  .vqb-launch-bubble.on{opacity:1;transform:none;}
  .vqb-launch-bubble b{color:#C4607A;}
  .vqb-av{width:60px;height:60px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;background:radial-gradient(circle at 32% 28%,#E08CA0,#C4607A 70%);box-shadow:0 12px 30px rgba(196,96,122,.42);position:relative;transition:transform .25s;}
  .vqb-launch:hover .vqb-av{transform:scale(1.06) rotate(-4deg);}
  .vqb-av::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(196,96,122,.5);animation:vqbPulse 2.4s infinite;}
  .vqb-av .vqb-dot{position:absolute;right:3px;bottom:3px;width:13px;height:13px;border-radius:50%;background:#5BC57A;border:2.5px solid #fff;}
  @keyframes vqbPulse{0%{transform:scale(1);opacity:.7}70%{transform:scale(1.5);opacity:0}100%{opacity:0}}

  .vqb-scrim{position:fixed;inset:0;z-index:118;background:rgba(20,15,35,.28);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .28s ease;}
  .vqb-scrim.on{opacity:1;pointer-events:auto;}

  .vqb-panel{position:fixed;top:0;right:0;bottom:0;z-index:119;width:min(400px,100vw);max-width:100%;height:100%;max-height:100dvh;background:#FBF6EC;border-radius:24px 0 0 24px;box-shadow:-18px 0 60px rgba(36,27,46,.22);display:flex;flex-direction:column;overflow:hidden;font-family:'Nunito','Manrope',sans-serif;transform:translate3d(110%,0,0);opacity:1;visibility:hidden;pointer-events:none;transition:transform .42s cubic-bezier(0.34,1.3,0.64,1),visibility 0s linear .42s;}
  .vqb-panel.on{transform:translate3d(0,0,0);visibility:visible;pointer-events:auto;transition:transform .42s cubic-bezier(0.34,1.3,0.64,1),visibility 0s;}
  .vqb-panel.vqb-center{left:auto!important;right:0!important;top:0!important;bottom:0!important;transform:translate3d(110%,0,0)!important;}
  .vqb-panel.vqb-center.on{transform:translate3d(0,0,0)!important;}

  .vqb-head{display:flex;align-items:center;gap:11px;padding:14px 14px 14px 16px;padding-top:max(14px,env(safe-area-inset-top));background:linear-gradient(135deg,#fff,#FDEFF1);border-bottom:1px solid rgba(196,96,122,.12);flex:none;}
  .vqb-head-av{width:42px;height:42px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff;background:radial-gradient(circle at 32% 28%,#E08CA0,#C4607A 70%);position:relative;}
  .vqb-head-av .vqb-dot{position:absolute;right:0;bottom:1px;width:11px;height:11px;border-radius:50%;background:#5BC57A;border:2px solid #fff;}
  .vqb-head-t{flex:1;min-width:0;}
  .vqb-head-t b{font-family:'Playfair Display',serif;font-size:17px;color:#241B2E;display:block;line-height:1.1;}
  .vqb-head-t span{font-size:12px;color:#6E8C63;}
  .vqb-x{border:none;background:rgba(36,27,46,.08);min-width:44px;height:36px;padding:0 12px;border-radius:999px;cursor:pointer;color:#241B2E;font-size:13px;font-weight:800;line-height:1;flex:none;transition:.2s;display:inline-flex;align-items:center;justify-content:center;gap:4px;}
  .vqb-x:hover{background:rgba(36,27,46,.14);}
  .vqb-x::before{content:'Скрыть';font-size:12px;letter-spacing:.01em;}

  .vqb-body{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding:18px 16px 8px;display:flex;flex-direction:column;gap:11px;scroll-behavior:smooth;}
  .vqb-body::-webkit-scrollbar{width:5px;}.vqb-body::-webkit-scrollbar-thumb{background:rgba(196,96,122,.25);border-radius:3px;}

  .vqb-row{display:flex;gap:8px;align-items:flex-end;}
  .vqb-row.me{flex-direction:row-reverse;}
  .vqb-mini{width:28px;height:28px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;background:radial-gradient(circle at 32% 28%,#E08CA0,#C4607A 70%);}
  .vqb-msg{max-width:78%;padding:10px 13px;border-radius:16px 16px 16px 4px;background:#fff;color:#241B2E;font-size:14.5px;line-height:1.42;box-shadow:0 4px 14px rgba(36,27,46,.06);animation:vqbIn .3s cubic-bezier(.2,1,.3,1);}
  .vqb-row.me .vqb-msg{border-radius:16px 16px 4px 16px;background:linear-gradient(135deg,#F06E9C,#C4607A);color:#fff;box-shadow:0 5px 16px rgba(196,96,122,.4);animation:vqbPop .34s cubic-bezier(.2,1.5,.4,1);}
  @keyframes vqbPop{0%{opacity:0;transform:scale(.8) translateY(4px)}60%{transform:scale(1.04)}100%{opacity:1;transform:none}}
  .vqb-msg b{color:#C4607A;}.vqb-row.me .vqb-msg b{color:#fff;}
  .vqb-msg em{font-family:'Caveat',cursive;font-style:normal;font-size:18px;color:#6E8C63;}
  @keyframes vqbIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .vqb-typing{display:flex;gap:4px;padding:13px;}
  .vqb-typing span{width:7px;height:7px;border-radius:50%;background:#E08CA0;animation:vqbBlink 1.2s infinite;}
  .vqb-typing span:nth-child(2){animation-delay:.2s}.vqb-typing span:nth-child(3){animation-delay:.4s}
  @keyframes vqbBlink{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}

  .vqb-foot{flex:none;padding:10px 14px max(15px,env(safe-area-inset-bottom));display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid rgba(196,96,122,.1);background:#FBF6EC;}
  .vqb-opt{flex:1 1 auto;border:1.5px solid rgba(196,96,122,.45);background:linear-gradient(135deg,#fff,#FFF1F5);color:#241B2E;padding:12px 14px;border-radius:14px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;text-align:left;transition:transform .14s,box-shadow .14s,background .14s,border-color .14s;line-height:1.25;}
  .vqb-opt:hover{border-color:#C4607A;background:linear-gradient(135deg,#FFE6EF,#FFD3E2);transform:translateY(-2px);box-shadow:0 7px 18px rgba(196,96,122,.3);}
  .vqb-opt:active{transform:translateY(0) scale(.97);}
  .vqb-opt.vqb-prime,.vqb-cta{position:relative;overflow:hidden;border:none;color:#fff;background:linear-gradient(135deg,#F06E9C 0%,#D45E83 48%,#B23E66 100%);box-shadow:0 8px 22px rgba(196,96,122,.5),inset 0 1px 0 rgba(255,255,255,.45);animation:vqbGlow 2.6s ease-in-out infinite;}
  .vqb-opt.vqb-prime{text-align:center;flex-basis:100%;font-weight:800;}
  .vqb-opt.vqb-prime::after,.vqb-cta::after{content:'';position:absolute;top:0;left:-70%;width:45%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:vqbShine 3s ease-in-out infinite;pointer-events:none;}
  .vqb-opt.vqb-prime:hover,.vqb-cta:hover{transform:translateY(-2px) scale(1.02);filter:brightness(1.07) saturate(1.12);}
  .vqb-opt.vqb-prime:active,.vqb-cta:active{transform:translateY(1px) scale(.98);}
  @keyframes vqbGlow{0%,100%{box-shadow:0 8px 22px rgba(196,96,122,.42),inset 0 1px 0 rgba(255,255,255,.45)}50%{box-shadow:0 12px 34px rgba(210,80,120,.78),inset 0 1px 0 rgba(255,255,255,.45)}}
  @keyframes vqbShine{0%{left:-70%}45%{left:140%}100%{left:140%}}
  .vqb-opt.vqb-ghost{border:none;background:transparent;color:#857A92;font-weight:500;text-decoration:underline;text-underline-offset:3px;font-size:13px;text-align:center;flex-basis:100%;padding:4px;}
  .vqb-dates{display:flex;gap:7px;width:100%;}
  .vqb-dates select{flex:1;padding:11px 8px;border-radius:12px;border:1.5px solid rgba(196,96,122,.35);background:#fff;font-family:inherit;font-size:14px;color:#241B2E;}

  .vqb-card{background:#fff;border:1.5px solid rgba(196,96,122,.25);border-radius:18px;padding:15px 16px;box-shadow:0 10px 26px rgba(196,96,122,.12);animation:vqbIn .35s;}
  .vqb-card .vqb-tag{font-family:'Caveat',cursive;color:#C4607A;font-size:17px;}
  .vqb-card h4{font-family:'Playfair Display',serif;font-size:20px;color:#241B2E;margin:2px 0 6px;line-height:1.15;}
  .vqb-card p{font-size:13.5px;color:#4A3F58;line-height:1.45;margin-bottom:11px;}
  .vqb-price{display:flex;align-items:baseline;gap:9px;margin-bottom:12px;flex-wrap:wrap;}
  .vqb-price b{font-family:'Playfair Display',serif;font-size:25px;color:#0E7A50;white-space:nowrap;}
  .vqb-price s{color:#CF5A52;font-size:14px;text-decoration-color:rgba(207,90,82,.75);font-weight:600;}
  .vqb-timer{display:flex;align-items:center;justify-content:center;gap:6px;background:#E7F5EE;border:1px solid rgba(14,122,80,.30);border-radius:11px;padding:8px 10px;margin-bottom:11px;font-size:12.5px;color:#0E7A50;font-weight:700;}
  .vqb-timer b{font-family:'Playfair Display',serif;font-size:16px;color:#0E7A50;font-variant-numeric:tabular-nums;}
  .vqb-cta{display:block;width:100%;padding:14px;border-radius:14px;cursor:pointer;font-family:inherit;font-size:15px;font-weight:800;transition:transform .15s,filter .15s;}
  .vqb-trust{font-size:12px;color:#857A92;text-align:center;margin-top:9px;}
  html[lang="en"] .vqb-x::before{content:'Hide';}

  @media (max-width:720px){
    .vqb-panel,.vqb-panel.vqb-center,.vqb-panel.vqb-center.on{
      left:10px!important;right:10px!important;top:auto!important;bottom:max(10px,env(safe-area-inset-bottom))!important;
      width:auto!important;max-width:none!important;height:min(72vh,640px)!important;max-height:min(72vh,640px)!important;
      border-radius:22px!important;box-shadow:0 20px 60px rgba(36,27,46,.28)!important;
      transform:translate3d(0,110%,0)!important;
    }
    .vqb-panel.on,.vqb-panel.vqb-center.on{transform:translate3d(0,0,0)!important;}
    .vqb-x::before{content:'Скрыть';}
    html[lang="en"] .vqb-x::before{content:'Hide';}
    .vqb-launch-bubble{max-width:170px;font-size:13px;}
    .vqb-av{width:54px;height:54px;font-size:23px;}
  }
  @media (prefers-reduced-motion:reduce){
    .vqb-panel,.vqb-scrim,.vqb-launch-bubble{transition:none!important;}
  }`;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function lifePath(d, m, y) {
    var s = ('' + d + m + y).split('').map(Number).reduce(function (a, b) { return a + b; }, 0);
    while (s > 9 && s !== 11 && s !== 22 && s !== 33) s = String(s).split('').map(Number).reduce(function (a, b) { return a + b; }, 0);
    return s;
  }
  var ARCH = {
    1: { a: 'Первопроходец', soul: 'Снаружи ты та, что всё держит и решает за всех. А внутри давно ждёшь, чтобы кто-то спросил «а ты как?». И ты скорее сделаешь сама, чем попросишь — даже когда падаешь.' },
    2: { a: 'Гармонизатор', soul: 'Ты заходишь в комнату и за секунду считываешь настроение каждого. Подстраиваешься так мягко, что к вечеру не помнишь, чего хотела ты сама. Тебя легко любить — и слишком легко не замечать.' },
    3: { a: 'Творец', soul: 'В тебе фонтан идей, но ты первая говоришь «да у всех так». Загораешься ярко — и гаснешь у самого финиша. Ты боишься не провала, а того, что получится — и придётся быть на виду.' },
    4: { a: 'Строитель', soul: 'Ты держишь всё под контролем, потому что однажды земля ушла из-под ног — и ты решила «больше никогда». Отпустить и довериться тебе почти физически тяжело. Ты выдыхаешь, только когда всё проверено дважды.' },
    5: { a: 'Искатель', soul: 'Тебе тесно везде — в графике, в планах, иногда и в самих отношениях. Рвёшься к новому, а ночью винишь себя за брошенное на полпути. Свобода нужна тебе как воздух — и она же тебя пугает.' },
    6: { a: 'Хранитель', soul: 'К тебе идут со всем — ты опора, жилетка и спасатель в одном лице. А когда падаешь сама, вдруг оказывается, что держать тебя некому. Ты привыкла, что твоя очередь — всегда последняя.' },
    7: { a: 'Мудрец', soul: 'Ты чувствуешь людей насквозь, но держишь их на расстоянии вытянутой руки. Не потому что холодная — один раз подпустила близко, и было больно. Тебе проще побыть одной, чем объяснять, что у тебя внутри.' },
    8: { a: 'Сильная', soul: 'Ты сильная — и тебя за это привыкли нагружать: «ты же справишься». А внутри живёт та, что хочет наконец прислониться к кому-то сильнее. Только показать этого себе не разрешаешь.' },
    9: { a: 'Щедрая душа', soul: 'Ты отдаёшь так легко, что давно перестала считать. А потом сидишь опустошённая и не понимаешь, почему так пусто. Тебе проще спасать других, чем признать, что спасать пора бы тебя.' },
    11: { a: 'Видящая', soul: 'Ты чувствуешь то, что другие даже не замечают — фальшь, чужую боль, беду до того, как она случилась. Тебе с детства говорили «ты всё драматизируешь». Нет. Ты правда так видишь — просто носить это тяжело.' },
    22: { a: 'Мастер', soul: 'В тебе масштаб, который ты сама от себя прячешь. Каждый раз, когда замахиваешься на большое, внутри шепчет «а вдруг не потяну» — и ты делаешь меньше, чем можешь. Ты боишься не неудачи, а своего размера.' },
    33: { a: 'Наставница', soul: 'Ты лечишь словом и одним присутствием — к тебе тянутся за теплом. А себе помогаешь в последнюю очередь, по остаточному. Ты столько отдаёшь, что забываешь: у тебя тоже есть дно.' }
  };
  var SPHERE_SOUL = {
    money: 'А в деньгах — тот же узор: они идут к тебе, и ты будто сама тормозишь у самого порога. Крупный заказ, повышение, лёгкие деньги — и внутри щёлкает «потом», «это не точно». Где именно включается этот тормоз — видно по твоей дате, но отсюда не разглядеть.',
    love: 'А в любви ты раз за разом попадаешь в один и тот же сюжет — лица меняются, финал тот же. Это не «не те мужчины» и не невезение. Это сценарий, который включается в конкретный момент близости — и ты, скорее всего, уже вспомнила, о ком речь.',
    realize: 'А в деле ты стоишь у самой двери — идей сто, а делаешь меньше, чем можешь. И каждый раз находишь разумное «ещё не время». Где именно ты сливаешь свою силу — отсюда не видно, но в карте это первое, что бросается в глаза.',
    self: 'И знаешь, что цепляет сильнее всего? Ты читаешь это и киваешь. Всё это ты про себя давно знала — просто никто не собирал это в одну ясную картину. А когда увидишь её целиком — себя уже не «развидеть».'
  };
  var KARMA = {
    13: 'А вот это уже только про твою дату: у тебя кармический узел «13» — родовое «работай или умри». Ты не умеешь отдыхать без чувства вины, и деньги даются только через «упахаться» до изнеможения.',
    14: 'И отдельно по твоей дате — кармический узел «14»: деньги утекают сквозь пальцы, а внутри сидит «беги, пока не привязали». Стабильность ты сама же тихо и разрушаешь.',
    16: 'А ещё в твоей дате — кармический узел «16»: стоит подняться, как что-то обваливается. Это не злой рок — это узор «взлёт и обвал» из рода.',
    19: 'И вот что важно: у тебя кармический узел «19» — «всё сама, в одиночку». Просить и опираться почти невыносимо — и это твой главный денежный тормоз.'
  };
  function karmaOf(d, m, y) {
    if (!d || !m || !y) return null;
    var full = ('' + d + m + y).split('').reduce(function (a, c) { return a + (+c); }, 0);
    var checks = [d, d + m, full, m + (y % 100)];
    for (var i = 0; i < checks.length; i++) { if (KARMA[checks[i]]) return checks[i]; }
    return null;
  }

  var P = {
    money: { prod: 'Денежный код', price: 3990, why: 'Он показывает, где именно твой денежный блок — и три шага, чтобы убрать его.' },
    love: { prod: 'Сценарий любви', price: 4990, why: 'Он вскрывает, почему повторяется один и тот же сценарий — и как из него выйти.' },
    realize: { prod: 'Реализация', price: 3990, why: 'Он про твою настоящую силу и путь — без чужих советов, по твоей дате.' },
    self: { prod: 'Число судьбы', price: 1990, why: 'Первый слой про тебя: характер, сила и урок. С него удобно начать.' },
    full: { prod: 'Полный разбор', price: 9900, why: 'Все 12 глав про тебя: характер, деньги, любовь, блоки и прогноз. То, что потом нельзя «развидеть».' }
  };

  var state = { sphere: null, depth: null, intent: null, d: 15, m: 6, y: 1995, num: null, seeded: false, name: '' };

  var launch = document.createElement('div');
  launch.className = 'vqb-launch';
  launch.innerHTML =
    '<div class="vqb-launch-bubble" id="vqb-bubble">Привет, дорогая 🤍 Иди сюда — расскажу тебе про тебя <b>кое-что интересное</b>…</div>' +
    '<div class="vqb-av">✦<span class="vqb-dot"></span></div>';
  document.body.appendChild(launch);

  var scrim = document.createElement('div');
  scrim.className = 'vqb-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  document.body.appendChild(scrim);

  var panel = document.createElement('div');
  panel.className = 'vqb-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Чат SoulMetrica');
  panel.innerHTML =
    '<div class="vqb-head">' +
    '<div class="vqb-head-av">✦<span class="vqb-dot"></span></div>' +
    '<div class="vqb-head-t"><b>SoulMetrica</b><span>чат-виджет · можно скрыть</span></div>' +
    '<button type="button" class="vqb-x" id="vqb-x" aria-label="Скрыть чат">✕</button></div>' +
    '<div class="vqb-body" id="vqb-body"></div>' +
    '<div class="vqb-foot" id="vqb-foot"></div>';
  document.body.appendChild(panel);

  var body = panel.querySelector('#vqb-body');
  var foot = panel.querySelector('#vqb-foot');

  function scrollDown() { body.scrollTop = body.scrollHeight; }
  function bot(html, cb) {
    var t = document.createElement('div');
    t.className = 'vqb-row';
    t.innerHTML = '<div class="vqb-mini">✦</div><div class="vqb-msg vqb-typing"><span></span><span></span><span></span></div>';
    body.appendChild(t); scrollDown();
    var delay = Math.min(550 + html.length * 7, 1100);
    setTimeout(function () {
      t.querySelector('.vqb-msg').classList.remove('vqb-typing');
      t.querySelector('.vqb-msg').innerHTML = html;
      scrollDown();
      if (cb) cb();
    }, delay);
  }
  function me(text) {
    var r = document.createElement('div');
    r.className = 'vqb-row me';
    r.innerHTML = '<div class="vqb-msg">' + text + '</div>';
    body.appendChild(r); scrollDown();
  }
  function opts(list) {
    foot.innerHTML = '';
    list.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'vqb-opt' + (o.cls ? ' ' + o.cls : '');
      b.innerHTML = o.label;
      b.onclick = o.fn;
      foot.appendChild(b);
    });
  }
  function clearOpts() { foot.innerHTML = ''; }
  function showTyping() {
    var t = document.createElement('div');
    t.className = 'vqb-row'; t.id = 'vqb-tmp-typing';
    t.innerHTML = '<div class="vqb-mini">✦</div><div class="vqb-msg vqb-typing"><span></span><span></span><span></span></div>';
    body.appendChild(t); scrollDown();
  }
  function hideTyping() { var t = document.getElementById('vqb-tmp-typing'); if (t) t.remove(); }

  function englishMode() {
    return window.VelunaI18n && window.VelunaI18n.getLang && window.VelunaI18n.getLang() === 'en';
  }

  function startEnglish() {
    body.innerHTML = ''; clearOpts();
    bot('Hi 🤍 I’m SoulMetrica.', function () {
      bot('A birth date can reveal a lot. What feels most important to you right now?', function () {
        opts([
          { label: '💸 Money and financial blocks', fn: function () { englishPick('money', '💸 Money'); } },
          { label: '💔 Love and repeating patterns', fn: function () { englishPick('love', '💔 Love'); } },
          { label: '🚀 Purpose and realization', fn: function () { englishPick('realize', '🚀 Realization'); } },
          { label: '🤍 Understanding myself', fn: function () { englishPick('self', '🤍 Understanding myself'); } }
        ]);
      });
    });
  }

  function englishPick(sphere, label) {
    state.sphere = sphere;
    me(label);
    clearOpts();
    bot('Thank you. Would you like a focused first step or the complete picture?', function () {
      opts([
        {
          label: 'A focused reading',
          cls: 'vqb-prime',
          fn: function () {
            var product = sphere === 'self' ? P.self : P[sphere] || P.full;
            me('A focused reading');
            englishRecommendation(product);
          }
        },
        {
          label: 'The complete reading',
          fn: function () {
            me('The complete reading');
            englishRecommendation(P.full);
          }
        },
        { label: 'Show all readings', cls: 'vqb-ghost', fn: gotoProducts }
      ]);
    });
  }

  function englishRecommendation(product) {
    clearOpts();
    var title =
      window.VelunaI18n && window.VelunaI18n.productTitle
        ? window.VelunaI18n.productTitle(product.prod, 'en')
        : product.prod;
    bot('I recommend <b>' + title + '</b>. It is prepared personally from your birth data and delivered as a PDF in Telegram within 2–3 hours.', function () {
      opts([
        {
          label: 'Order this reading →',
          cls: 'vqb-prime',
          fn: function () {
            openCheckout(product);
          }
        },
        { label: 'Show all readings', cls: 'vqb-ghost', fn: gotoProducts }
      ]);
    });
  }

  function start() {
    if (englishMode()) {
      startEnglish();
      return;
    }
    body.innerHTML = ''; clearOpts();
    bot('Привет, моя хорошая 🤍 Я SoulMetrica.', function () {
      bot('По одной дате видно многое — будто чужой дневник, а там про тебя. Дай пару честных ответов, и я покажу, что ты <b>давно чувствуешь</b>. Идёт?', function () {
        opts([
          { label: 'Ой, давай 🙈', cls: 'vqb-prime', fn: function () { me('Ой, давай 🙈'); qSphere(); } },
          { label: 'Я просто смотрю', cls: 'vqb-ghost', fn: justLooking },
          { label: 'Сразу оформить →', cls: 'vqb-ghost', fn: function () { me('Сразу оформить'); openCheckout(P.full); } }
        ]);
      });
    });
  }

  function justLooking() {
    me('Я просто смотрю');
    clearOpts();
    bot('Понимаю, посмотри спокойно 🤍 Но раз уж ты здесь… дай мне 30 секунд — и я скажу тебе одну вещь про тебя, от которой обычно мурашки. Не понравится — закроешь, я не обижусь.', function () {
      opts([
        { label: 'Ну давай, удиви ✦', cls: 'vqb-prime', fn: function () { me('Ну давай, удиви ✦'); qSphere(); } },
        { label: 'В другой раз', cls: 'vqb-ghost', fn: closePanel }
      ]);
    });
  }

  function qSphere() {
    clearOpts();
    bot('Скажи честно, только между нами — <b>что сейчас откликается в тебе сильнее всего?</b>', function () {
      opts([
        { label: '💸 Деньги — будто упираюсь в стену', fn: function () { pick('money', '💸 Деньги'); } },
        { label: '💔 Любовь — снова по кругу', fn: function () { pick('love', '💔 Любовь'); } },
        { label: '🚀 Я и моё дело, реализация', fn: function () { pick('realize', '🚀 Реализация'); } },
        { label: '🤍 Просто хочу понять себя', fn: function () { pick('self', '🤍 Понять себя'); } }
      ]);
    });
    function pick(s, label) { state.sphere = s; me(label); qDepth(); }
  }

  var DEPTH = {
    money: ['Деньги есть, но утекают сквозь пальцы', 'Уперлась в потолок и не пробить', 'Не могу брать достойно за свою работу'],
    love: ['Один и тот же сценарий по кругу', 'Не могу выбрать / решиться', 'Опять тяну всё на себе'],
    realize: ['Не знаю, чего хочу по-настоящему', 'Знаю, но почему-то не делаю', 'Распыляюсь на всё и сразу'],
    self: ['Хочу понять, кто я на самом деле', 'Свериться с собой', 'Чувствую, что живу не свою жизнь']
  };
  function qDepth() {
    clearOpts();
    bot('Так я и почувствовала 🤍 А если заглянуть чуть глубже — что из этого <b>по-настоящему твоё</b>?', function () {
      opts(DEPTH[state.sphere].map(function (txt) {
        return { label: txt, fn: function () { state.depth = txt; me(txt); (state.seeded ? qIntentSeeded : qDate)(); } };
      }));
    });
  }

  function startSeeded() {
    if (englishMode()) {
      startEnglish();
      return;
    }
    body.innerHTML = ''; clearOpts();
    var hi = state.name ? (state.name + ', это снова я 🤍 ') : 'Привет, моя хорошая 🤍 ';
    bot(hi + 'Я уже вижу твою дату — карта совсем не пустая. Дай пару штрихов про себя — и покажу то, от чего обычно мурашки.', function () {
      opts([
        { label: 'Давай, я готова ✦', cls: 'vqb-prime', fn: function () { me('Давай ✦'); qSphere(); } },
        { label: 'Сразу оформить →', cls: 'vqb-ghost', fn: function () { me('Сразу оформить'); openCheckout(P.full); } },
        { label: 'Чуть позже', cls: 'vqb-ghost', fn: closePanel }
      ]);
    });
  }
  function qIntentSeeded() {
    clearOpts();
    bot('Спасибо, что так честно 🤍 Я уже вижу твою карту — и это правда нечто. Последнее, только ты и я: ты сейчас хочешь просто <b>понять, что с тобой</b> — или уже <b>готова это менять</b>?', function () {
      opts([
        { label: 'Хочу понять себя', fn: function () { state.intent = 'understand'; me('Хочу понять себя'); result(); } },
        { label: 'Я уже готова менять', fn: function () { state.intent = 'change'; me('Готова менять'); result(); } },
        { label: 'Пока присматриваюсь', fn: function () { state.intent = 'curious'; me('Присматриваюсь'); result(); } }
      ]);
    });
  }

  function qDate() {
    clearOpts();
    bot('Спасибо, что так честно. Ты вообще не из тех, кто прячется от себя — это, поверь, умеют единицы.', function () {
      bot('Теперь покажи мне <b>дату рождения</b> — и я тебе кое-что про тебя скажу 🔢', function () {
      var months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      var wrap = document.createElement('div'); wrap.className = 'vqb-dates';
      var dd = '<select id="vqb-d">';
      for (var i = 1; i <= 31; i++) dd += '<option' + (i === 15 ? ' selected' : '') + '>' + i + '</option>';
      dd += '</select>';
      var mm = '<select id="vqb-m">';
      months.forEach(function (mo, k) { mm += '<option value="' + (k + 1) + '"' + (k === 5 ? ' selected' : '') + '>' + mo + '</option>'; });
      mm += '</select>';
      var yy = '<select id="vqb-y">';
      for (var y = 2010; y >= 1955; y--) yy += '<option' + (y === 1995 ? ' selected' : '') + '>' + y + '</option>';
      yy += '</select>';
      wrap.innerHTML = dd + mm + yy;
      foot.innerHTML = '';
      foot.appendChild(wrap);
      var go = document.createElement('button');
      go.className = 'vqb-opt vqb-prime'; go.textContent = 'Посчитать моё число ✦';
      go.onclick = function () {
        state.d = +document.getElementById('vqb-d').value;
        state.m = +document.getElementById('vqb-m').value;
        state.y = +document.getElementById('vqb-y').value;
        me(state.d + '.' + state.m + '.' + state.y);
        afterDate();
      };
      foot.appendChild(go);
      });
    });
  }

  function afterDate() {
    clearOpts();
    state.num = lifePath(state.d, state.m, state.y);
    bot('Вижу твою дату 🤍 Красивая карта, честно. Совсем не пустая.', function () {
      bot('И последнее, по-честному, только ты и я: ты сейчас хочешь просто <b>понять, что с тобой</b> — или ты уже на той точке, где <b>готова это менять</b>?', function () {
        opts([
          { label: 'Хочу понять себя', fn: function () { setIntent('understand', 'Хочу понять себя'); } },
          { label: 'Я уже готова менять', fn: function () { setIntent('change', 'Готова менять'); } },
          { label: 'Пока просто присматриваюсь', fn: function () { setIntent('curious', 'Присматриваюсь'); } }
        ]);
      });
    });
    function setIntent(i, label) { state.intent = i; me(label); result(); }
  }

  function result() {
    clearOpts();
    var a = ARCH[state.num] || ARCH[9];
    bot('Секунду, смотрю твою карту… 🔮', function () {
      bot('Ты — <b>' + state.num + '</b>. ' + a.a + '.', function () {
        bot(a.soul, function () {
          bot(SPHERE_SOUL[state.sphere], function () {
            var km = karmaOf(state.d, state.m, state.y);
            var openLoop = function () {
              bot('И есть ещё один слой — про то, что держит тебя сильнее всего. Вот его я в чате не разворачиваю. Но именно с него начинается твой личный разбор 🤍', function () {
                setTimeout(function () {
                  showTyping();
                  setTimeout(function () { hideTyping(); recommend(); }, 3500);
                }, 1800);
              });
            };
            if (km) bot(KARMA[km], openLoop); else openLoop();
          });
        });
      });
    });
  }

  function startTimerBot(id) {
    var KEY = 'vqDeadline', dl = 0;
    try { dl = +sessionStorage.getItem(KEY) || 0; } catch (e) {}
    if (!dl || dl < Date.now()) { dl = Date.now() + 15 * 60 * 1000; try { sessionStorage.setItem(KEY, dl); } catch (e) {} }
    (function tick() {
      var el = document.getElementById(id); if (!el) return;
      var left = Math.max(0, dl - Date.now());
      var mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
      el.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
      if (left > 0) setTimeout(tick, 1000);
    })();
  }

  function recommend() {
    var prod = (state.sphere === 'self') ? P.full : (P[state.sphere] || P.full);
    var intro = (state.intent === 'change')
      ? 'Тогда вот что тебе нужно в первую очередь — точно в твою тему:'
      : (state.intent === 'curious')
        ? 'Не буду грузить всем сразу. Вот мягкий первый шаг — прямо про то, что ты мне описала:'
        : 'Вот что я бы дала тебе в руки прямо сейчас — это <b>точно про то</b>, что ты мне описала:';

    function makeCard(p, primary) {
      var card = document.createElement('div');
      card.className = 'vqb-row';
      var inner = document.createElement('div'); inner.style.cssText = 'max-width:88%;';
      var btnId = primary ? 'vqb-buy' : 'vqb-buy2';
      var tmrId = primary ? 'vqb-tmr' : 'vqb-tmr2';
      inner.innerHTML =
        '<div class="vqb-card">' +
        '<div class="vqb-tag">' + (primary ? 'подобрано под тебя · ' + a0() : 'или сразу всё целиком') + '</div>' +
        '<h4>' + p.prod + '</h4>' +
        '<p>' + p.why + ' Написан вручную под твою дату, PDF в Telegram за 2–3 часа.</p>' +
        '<div class="vqb-price"><b>' +
        (window.VelunaMoney ? window.VelunaMoney.format(p.price) : p.price.toLocaleString('ru') + ' ₸') +
        '</b><s>' +
        (window.VelunaMoney ? window.VelunaMoney.format(p.price * 3) : (p.price * 3).toLocaleString('ru') + ' ₸') +
        '</s></div>' +
        '<div class="vqb-timer">⏳ <b id="' + tmrId + '">15:00</b> · −67% · цена держится</div>' +
        '<button class="vqb-cta" id="' + btnId + '">' + (primary ? 'Хочу этот разбор →' : 'Взять полный разбор →') + '</button>' +
        '<div class="vqb-trust">Не откликнётся — вернём деньги за 7 дней</div>' +
        '</div>';
      card.innerHTML = '<div class="vqb-mini">✦</div>';
      card.appendChild(inner);
      body.appendChild(card); scrollDown();
      startTimerBot(tmrId);
      document.getElementById(btnId).onclick = function () { openCheckout(p); };
    }

    bot(intro, function () {
      makeCard(prod, true);
      if (state.intent === 'change' && prod !== P.full) {
        bot('А если хочешь не один слой, а <b>всю картину разом</b> — есть полный разбор. Выходит дешевле, чем собирать по частям 🤍', function () {
          makeCard(P.full, false);
          opts([{ label: 'Показать все разборы', cls: 'vqb-ghost', fn: function () { gotoProducts(); } }]);
        });
      } else {
        opts([{ label: 'Показать все разборы', cls: 'vqb-ghost', fn: function () { gotoProducts(); } }]);
      }
    });
    function a0() { return (ARCH[state.num] || ARCH[9]).a; }
  }

  function openCheckout(prod) {
    if (typeof window.velunaSaveLeadDraft === 'function') {
      window.velunaSaveLeadDraft({
        name: state.name || '',
        day: state.d,
        month: state.m,
        year: state.y
      });
    }
    if (typeof window.velunaOpenOrder === 'function') {
      window.velunaOpenOrder(prod.prod);
      closePanel(true);
    } else {
      gotoProducts();
    }
  }
  function gotoProducts() {
    var t = document.getElementById('products') || document.getElementById('calc');
    if (t) t.scrollIntoView({ behavior: 'smooth' });
    closePanel(true);
  }

  var started = false;
  function openPanel() {
    document.getElementById('vqb-bubble').classList.remove('on');
    launch.style.display = 'none';
    scrim.classList.add('on');
    panel.classList.add('on');
    if (!started) { started = true; start(); }
  }
  function closePanel(silent) {
    panel.classList.remove('on');
    scrim.classList.remove('on');
    launch.style.display = 'flex';
    document.body.style.overflow = '';
    try { sessionStorage.setItem('vqbClosed', '1'); } catch (e) {}
  }
  launch.onclick = openPanel;
  panel.querySelector('#vqb-x').onclick = function () { closePanel(); };
  scrim.onclick = function () { closePanel(); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('on')) closePanel();
  });

  window.velunaOpenBot = openPanel;
  if (window.VelunaI18n && window.VelunaI18n.onChange) {
    window.VelunaI18n.onChange(function () {
      if (panel.classList.contains('on')) start();
      else started = false;
    });
  }

  window.vqbStartSeeded = function (seed) {
    seed = seed || {};
    state.seeded = true;
    if (seed.name) state.name = String(seed.name).trim().split(' ')[0];
    if (seed.d) state.d = +seed.d;
    if (seed.m) state.m = +seed.m;
    if (seed.y) state.y = +seed.y;
    state.num = seed.num || lifePath(state.d, state.m, state.y);
    var b = document.getElementById('vqb-bubble'); if (b) b.classList.remove('on');
    launch.style.display = 'none';
    scrim.classList.add('on');
    panel.classList.add('on');
    started = true;
    startSeeded();
  };

  var closedBefore = false;
  try { closedBefore = sessionStorage.getItem('vqbClosed') === '1'; } catch (e) {}
  function bubbleOn(delay, life) {
    if (closedBefore) return;
    setTimeout(function () { var b = document.getElementById('vqb-bubble'); if (b && !panel.classList.contains('on')) b.classList.add('on'); }, delay);
    setTimeout(function () { var b = document.getElementById('vqb-bubble'); if (b) b.classList.remove('on'); }, life);
  }
  bubbleOn(5500, 16000);
})();

/* ═══════════════════════════════════════════════════════════════
   VELUNA · подарок + таймер в навбаре (мобилка).
   Рядом с переключателем темы, общий дедлайн, клик → бот.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  if (window.__vgiftLoaded) return;
  window.__vgiftLoaded = true;

  function openGift() {
    if (typeof window.velunaOpenBot === 'function') {
      window.velunaOpenBot();
      return;
    }
    var t = document.getElementById('calc') || document.getElementById('products');
    if (t) t.scrollIntoView({ behavior: 'smooth' });
  }

  function wireNavPromo() {
    var promo = document.getElementById('navPromo');
    if (!promo) return;
    promo.addEventListener('click', function (e) {
      e.preventDefault();
      openGift();
    });
    promo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openGift();
      }
    });
  }
  wireNavPromo();

  var closed = false;
  try { closed = sessionStorage.getItem('vgiftClosed') === '1'; } catch (e) {}
  if (closed) {
    document.body.classList.add('vgift-hidden');
    return;
  }

  var aside = document.querySelector('.nav__aside');
  var theme = document.getElementById('themeToggle');
  if (!aside || !theme) return;

  var el = document.createElement('div');
  el.className = 'vgift';
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', 'Открыть подарок со скидкой −67%');
  el.innerHTML =
    '<span class="vgift-emo" aria-hidden="true">🎁</span>' +
    '<span class="vgift-t">−67%<span class="vgift-full"> в подарок</span> ·</span>' +
    '<b class="vgift-tmr promo-timer" id="vgift-tmr">15:00</b>' +
    '<button type="button" class="vgift-x" aria-label="Закрыть">✕</button>';
  aside.insertBefore(el, theme);

  function dismiss(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    el.style.display = 'none';
    document.body.classList.add('vgift-hidden');
    try { sessionStorage.setItem('vgiftClosed', '1'); } catch (er) {}
  }

  el.querySelector('.vgift-x').addEventListener('click', dismiss);

  el.addEventListener('click', function (e) {
    if (e.target.closest('.vgift-x')) return;
    openGift();
  });
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openGift();
    }
  });
})();

/* ═══════════════════════════════════════════════════════════════
   VELUNA · ВСТРОЕННЫЙ мини-квиз (окно) — запускается из результата
   бесплатного расчёта кнопкой «Получить мини-разбор».
   ═══════════════════════════════════════════════════════════════ */
(function () {
  if (window.__vqInlineLoaded) return;
  window.__vqInlineLoaded = true;

  var SOUL = {
    1: 'Снаружи ты та, что всё держит и решает за всех. А внутри давно ждёшь, чтобы кто-то спросил «а ты как?». И ты скорее сделаешь сама, чем попросишь — даже когда падаешь.',
    2: 'Ты заходишь в комнату и за секунду считываешь настроение каждого. Подстраиваешься так мягко, что к вечеру не помнишь, чего хотела ты сама. Тебя легко любить — и слишком легко не замечать.',
    3: 'В тебе фонтан идей, но ты первая говоришь «да у всех так». Загораешься ярко — и гаснешь у самого финиша. Ты боишься не провала, а того, что получится — и придётся быть на виду.',
    4: 'Ты держишь всё под контролем, потому что однажды земля ушла из-под ног — и ты решила «больше никогда». Отпустить и довериться тебе почти физически тяжело. Ты выдыхаешь, только когда всё проверено дважды.',
    5: 'Тебе тесно везде — в графике, в планах, иногда и в самих отношениях. Рвёшься к новому, а ночью винишь себя за брошенное на полпути. Свобода нужна тебе как воздух — и она же тебя пугает.',
    6: 'К тебе идут со всем — ты опора, жилетка и спасатель в одном лице. А когда падаешь сама, вдруг оказывается, что держать тебя некому. Ты привыкла, что твоя очередь — всегда последняя.',
    7: 'Ты чувствуешь людей насквозь, но держишь их на расстоянии вытянутой руки. Не потому что холодная — один раз подпустила близко, и было больно. Тебе проще побыть одной, чем объяснять, что у тебя внутри.',
    8: 'Ты сильная — и тебя за это привыкли нагружать: «ты же справишься». А внутри живёт та, что хочет наконец прислониться к кому-то сильнее. Только показать этого себе не разрешаешь.',
    9: 'Ты отдаёшь так легко, что давно перестала считать. А потом сидишь опустошённая и не понимаешь, почему так пусто. Тебе проще спасать других, чем признать, что спасать пора бы тебя.',
    11: 'Ты чувствуешь то, что другие даже не замечают — фальшь, чужую боль, беду до того, как она случилась. Тебе с детства говорили «ты всё драматизируешь». Нет. Ты правда так видишь — просто носить это тяжело.',
    22: 'В тебе масштаб, который ты сама от себя прячешь. Каждый раз, когда замахиваешься на большое, внутри шепчет «а вдруг не потяну» — и ты делаешь меньше, чем можешь. Ты боишься не неудачи, а своего размера.',
    33: 'Ты лечишь словом и одним присутствием — к тебе тянутся за теплом. А себе помогаешь в последнюю очередь, по остаточному. Ты столько отдаёшь, что забываешь: у тебя тоже есть дно.'
  };
  var ARCH = { 1:'Первопроходец',2:'Дипломат',3:'Творец',4:'Строитель',5:'Искатель',6:'Хранитель',7:'Мудрец',8:'Магнат',9:'Просветлённый',11:'Визионер',22:'Строитель',33:'Наставник' };

  var SPHERES = [
    { k:'money',   label:'💸 Деньги — будто упираюсь в стену' },
    { k:'love',    label:'💔 Любовь — снова по кругу' },
    { k:'realize', label:'🚀 Я и моё дело, реализация' },
    { k:'self',    label:'🤍 Просто хочу понять себя' }
  ];
  var DEPTH = {
    money: ['Деньги есть, но утекают сквозь пальцы', 'Уперлась в потолок и не пробить', 'Не могу брать достойно за свою работу'],
    love: ['Один и тот же сценарий по кругу', 'Не могу выбрать / решиться', 'Опять тяну всё на себе'],
    realize: ['Не знаю, чего хочу по-настоящему', 'Знаю, но почему-то не делаю', 'Распыляюсь на всё и сразу'],
    self: ['Хочу понять, кто я на самом деле', 'Свериться с собой', 'Чувствую, что живу не свою жизнь']
  };
  var SPHERE_SOUL = {
    money: 'А в деньгах — тот же узор: они идут к тебе, и ты будто сама тормозишь у самого порога. Крупный заказ, повышение, лёгкие деньги — и внутри щёлкает «потом», «это не точно». Где именно включается этот тормоз — видно по твоей дате, но отсюда не разглядеть.',
    love: 'А в любви ты раз за разом попадаешь в один и тот же сюжет — лица меняются, финал тот же. Это не «не те мужчины» и не невезение. Это сценарий, который включается в конкретный момент близости — и ты, скорее всего, уже вспомнила, о ком речь.',
    realize: 'А в деле ты стоишь у самой двери — идей сто, а делаешь меньше, чем можешь. И каждый раз находишь разумное «ещё не время». Где именно ты сливаешь свою силу — отсюда не видно, но в карте это первое, что бросается в глаза.',
    self: 'И знаешь, что цепляет сильнее всего? Ты читаешь это и киваешь. Всё это ты про себя давно знала — просто никто не собирал это в одну ясную картину. А когда увидишь её целиком — себя уже не «развидеть».'
  };
  var KARMA = {
    13: 'А вот это уже только про твою дату: у тебя кармический узел «13» — родовое «работай или умри». Ты не умеешь отдыхать без чувства вины, и деньги даются только через «упахаться» до изнеможения. Это снимается — но сначала это надо увидеть.',
    14: 'И отдельно по твоей дате — кармический узел «14»: деньги утекают сквозь пальцы, а внутри сидит «беги, пока не привязали». Стабильность ты сама же тихо и разрушаешь — каждый раз не замечая, как.',
    16: 'А ещё в твоей дате — кармический узел «16»: стоит подняться, как что-то обваливается. Это не злой рок. Это узор «взлёт и обвал» из рода, и у него есть конкретная точка, где он включается.',
    19: 'И вот что важно: у тебя кармический узел «19» — «всё сама, в одиночку». Просить, опираться, делегировать почти невыносимо — и это твой главный денежный тормоз.'
  };
  function karmaOf(d, m, y) {
    if (!d || !m || !y) return null;
    var full = ('' + d + m + y).split('').reduce(function (a, c) { return a + (+c); }, 0);
    var checks = [d, d + m, full, m + (y % 100)];
    for (var i = 0; i < checks.length; i++) { if (KARMA[checks[i]]) return checks[i]; }
    return null;
  }
  var PROD = {
    money:   { prod:'Денежный код',   price:3990,  bul:['Полная расшифровка числа по 9 системам','Где именно твой денежный блок и как его убрать','3–5 конкретных шагов под твою ситуацию','PDF в Telegram за 2–3 часа'] },
    love:    { prod:'Сценарий любви', price:4990,  bul:['Почему повторяется один и тот же сценарий','Кого ты притягиваешь и почему','Как выйти из круга — по шагам','PDF в Telegram за 2–3 часа'] },
    realize: { prod:'Реализация',     price:3990,  bul:['Твоя настоящая сила и путь','Что тебя тормозит у самой двери','Точки, где ты сливаешь энергию','PDF в Telegram за 2–3 часа'] },
    self:    { prod:'Число судьбы',   price:1990,  bul:['Кто ты под всеми ролями','Твоя сила и твой урок','С чего начать менять','PDF в Telegram за 2–3 часа'] },
    full:    { prod:'Полный разбор',  price:9900,  bul:['Все 12 глав про тебя','Характер, деньги, любовь, блоки','Прогноз 2026 + горизонт 5 лет','PDF в Telegram за 2–4 часа'] }
  };

  var css = `
  .vqm-ov{position:fixed;inset:0;z-index:101;background:rgba(20,15,35,.66);backdrop-filter:blur(7px);display:none;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .25s;font-family:'Nunito','Manrope',sans-serif;overflow:hidden;-webkit-overflow-scrolling:touch;}
  .vqm-ov.on{display:flex;opacity:1;}
  .vqm-win{background:#FBF6EC;border-radius:24px;width:560px;max-width:100%;height:min(90vh,720px);max-height:90dvh;max-height:90vh;min-height:0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(36,27,46,.4);transform:translateY(16px) scale(.97);transition:transform .3s cubic-bezier(.2,1,.3,1);}
  .vqm-ov.on .vqm-win{transform:none;}
  .vqm-head{display:flex;align-items:center;gap:12px;padding:16px 18px;background:radial-gradient(120% 140% at 0% 0%,#FFE9F0 0%,#fff 60%);border-bottom:1px solid rgba(196,96,122,.12);flex:none;}
  .vqm-head-av{width:44px;height:44px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff;background:radial-gradient(circle at 32% 28%,#E08CA0,#C4607A 70%);position:relative;box-shadow:0 6px 16px rgba(196,96,122,.4);}
  .vqm-head-av::after{content:'';position:absolute;right:0;bottom:1px;width:11px;height:11px;border-radius:50%;background:#5BC57A;border:2px solid #fff;}
  .vqm-head-t b{font-family:'Playfair Display',serif;font-size:18px;color:#241B2E;display:block;line-height:1.1;}
  .vqm-head-t span{font-size:12px;color:#6E8C63;font-weight:600;}
  .vqm-x{margin-left:auto;border:none;background:rgba(36,27,46,.07);width:34px;height:34px;border-radius:50%;cursor:pointer;color:#857A92;font-size:17px;flex:none;transition:.2s;}
  .vqm-x:hover{background:rgba(36,27,46,.14);transform:rotate(90deg);}
  .vqm-prog{height:5px;background:rgba(196,96,122,.14);flex:none;}
  .vqm-prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,#F06E9C,#C4607A);border-radius:0 4px 4px 0;transition:width .45s cubic-bezier(.2,1,.3,1);}
  .vq{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding:20px 20px 22px;text-align:left;}
  .vq::-webkit-scrollbar{width:6px;}.vq::-webkit-scrollbar-thumb{background:rgba(196,96,122,.25);border-radius:3px;}
  @media (max-width:640px){
    .vqm-ov{padding:0;align-items:stretch;justify-content:stretch;}
    .vqm-win{width:100%;max-width:100%;height:100dvh;height:100vh;max-height:100dvh;max-height:100vh;border-radius:0;transform:none;}
    .vqm-ov.on .vqm-win{transform:none;}
  }
  .vq-row{display:flex;gap:9px;align-items:flex-end;margin-bottom:11px;animation:vqIn .3s cubic-bezier(.2,1,.3,1);}
  .vq-row.me{flex-direction:row-reverse;}
  .vq-av{width:30px;height:30px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;background:radial-gradient(circle at 32% 28%,#E08CA0,#C4607A 70%);}
  .vq-msg{max-width:80%;padding:11px 14px;border-radius:16px 16px 16px 4px;background:#fff;color:#241B2E;font-size:15px;line-height:1.45;box-shadow:0 4px 14px rgba(36,27,46,.07);}
  .vq-row.me .vq-msg{border-radius:16px 16px 4px 16px;background:linear-gradient(135deg,#F06E9C,#C4607A);color:#fff;}
  .vq-msg b{color:#C4607A;}.vq-row.me .vq-msg b{color:#fff;}
  @keyframes vqIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .vq-typing span{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:#E08CA0;animation:vqBl 1.2s infinite;}
  .vq-typing span:nth-child(2){animation-delay:.2s}.vq-typing span:nth-child(3){animation-delay:.4s}
  @keyframes vqBl{0%,60%,100%{opacity:.3}30%{opacity:1}}
  .vq-opts{display:flex;flex-direction:column;gap:9px;margin:4px 0 6px 39px;}
  .vq-opt{display:flex;align-items:center;gap:10px;border:1.5px solid rgba(196,96,122,.28);background:#fff;color:#241B2E;padding:14px 15px;border-radius:16px;cursor:pointer;font-family:inherit;font-size:15px;font-weight:700;text-align:left;box-shadow:0 4px 14px rgba(36,27,46,.05);transition:transform .15s,box-shadow .15s,background .15s,border-color .15s;}
  .vq-opt::after{content:'›';margin-left:auto;color:#C4607A;font-size:23px;font-weight:700;line-height:1;opacity:.5;transition:.15s;}
  .vq-opt:hover{border-color:#C4607A;background:linear-gradient(135deg,#FFF4F7,#FFE6EF);transform:translateY(-2px) translateX(2px);box-shadow:0 12px 26px rgba(196,96,122,.22);}
  .vq-opt:hover::after{opacity:1;transform:translateX(3px);}
  .vq-opt:active{transform:scale(.985);}
  .vq-final{margin:14px 0 0;background:#FBE1E7;border:2px solid #E08CA0;border-radius:22px;padding:24px 22px;animation:vqIn .4s;}
  .vq-final .vq-kick{display:inline-block;background:#fff;border-radius:100px;padding:5px 14px;font-family:'Caveat',cursive;color:#C4607A;font-size:16px;font-weight:700;margin-bottom:10px;}
  .vq-final h3{font-family:'Playfair Display',serif;font-size:24px;color:#241B2E;margin-bottom:10px;line-height:1.15;}
  .vq-final p{color:#4A3F58;font-size:15px;line-height:1.5;margin-bottom:10px;}
  .vq-lock{background:rgba(255,255,255,.65);border:1.5px dashed rgba(196,96,122,.5);border-radius:14px;padding:12px 14px;color:#4A3F58;font-size:13.5px;line-height:1.45;margin:12px 0;text-align:center;}
  .vq-lock b{color:#C4607A;}
  .vq-prod{background:#fff;border-radius:16px;padding:16px 16px 4px;margin-top:6px;}
  .vq-prod h4{font-family:'Playfair Display',serif;font-size:20px;color:#241B2E;margin-bottom:10px;}
  .vq-prod ul{list-style:none;margin:0 0 12px;padding:0;}
  .vq-prod li{font-size:14px;color:#4A3F58;padding-left:22px;position:relative;margin-bottom:7px;line-height:1.35;}
  .vq-prod li::before{content:'✦';position:absolute;left:0;color:#C4607A;}
  .vq-price{display:flex;align-items:baseline;gap:9px;margin-bottom:12px;flex-wrap:wrap;}
  .vq-price b{font-family:'Playfair Display',serif;font-size:27px;color:#0E7A50;white-space:nowrap;}
  .vq-price s{color:#CF5A52;font-size:14px;text-decoration-color:rgba(207,90,82,.75);font-weight:600;}
  .vq-timer{display:flex;align-items:center;justify-content:center;gap:6px;background:#E7F5EE;border:1px solid rgba(14,122,80,.30);border-radius:12px;padding:9px 12px;margin-bottom:11px;font-size:13.5px;color:#0E7A50;font-weight:700;}
  .vq-timer b{font-family:'Playfair Display',serif;font-size:17px;color:#0E7A50;font-variant-numeric:tabular-nums;}
  .vq-cta{display:block;width:100%;border:none;color:#fff;background:linear-gradient(135deg,#F06E9C 0%,#D45E83 48%,#B23E66 100%);padding:15px;border-radius:14px;cursor:pointer;font-family:inherit;font-size:16px;font-weight:800;box-shadow:0 10px 26px rgba(196,96,122,.5),inset 0 1px 0 rgba(255,255,255,.45);transition:transform .15s,filter .15s;margin-bottom:8px;}
  .vq-cta:hover{transform:translateY(-2px) scale(1.01);filter:brightness(1.07) saturate(1.1);}
  .vq-trust{text-align:center;font-size:12.5px;color:#857A92;padding-bottom:8px;}
  .vq-up{margin-top:12px;text-align:center;}
  .vq-up button{border:none;background:transparent;color:#C4607A;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}
  `;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var state = { sphere:null, depth:null, intent:null, num:9, name:'', arch:'', d:0, m:0, y:0 };
  var host = null, ov = null;

  function buildModal() {
    if (ov) return;
    ov = document.createElement('div');
    ov.className = 'vqm-ov';
    ov.innerHTML =
      '<div class="vqm-win">' +
      '<div class="vqm-head"><div class="vqm-head-av">✦</div><div class="vqm-head-t"><b>SoulMetrica</b><span>составляю твой мини-разбор…</span></div><button class="vqm-x" id="vqm-x">✕</button></div>' +
      '<div class="vqm-prog"><i id="vqm-prog-bar"></i></div>' +
      '<div class="vq" id="vq-inline"></div>' +
      '</div>';
    document.body.appendChild(ov);
    host = ov.querySelector('#vq-inline');
    ov.querySelector('#vqm-x').onclick = closeModal;
    ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
  }
  function openModal() { buildModal(); ov.classList.add('on'); document.body.style.overflow = 'hidden'; }
  function closeModal() { if (ov) ov.classList.remove('on'); document.body.style.overflow = ''; }
  function setProgress(pct) { var b = ov && ov.querySelector('#vqm-prog-bar'); if (b) b.style.width = pct + '%'; }

  function scrollHostBottom() {
    if (host) { var r = host.lastChild; if (r && r.scrollIntoView) r.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
  }
  function bot(html, cb) {
    var t = document.createElement('div'); t.className = 'vq-row';
    t.innerHTML = '<div class="vq-av">✦</div><div class="vq-msg vq-typing"><span></span><span></span><span></span></div>';
    host.appendChild(t); scrollHostBottom();
    setTimeout(function () {
      t.querySelector('.vq-msg').classList.remove('vq-typing');
      t.querySelector('.vq-msg').innerHTML = html; scrollHostBottom();
      if (cb) cb();
    }, Math.min(500 + html.length * 6, 1100));
  }
  function me(txt) {
    var r = document.createElement('div'); r.className = 'vq-row me';
    r.innerHTML = '<div class="vq-msg">' + txt + '</div>'; host.appendChild(r); scrollHostBottom();
  }
  function opts(list) {
    var box = document.createElement('div'); box.className = 'vq-opts';
    list.forEach(function (o) {
      var b = document.createElement('button'); b.className = 'vq-opt'; b.innerHTML = o.label;
      b.onclick = function () { box.remove(); me(o.say || o.label); o.fn(); };
      box.appendChild(b);
    });
    host.appendChild(box); scrollHostBottom();
  }

  function start() {
    host.innerHTML = '';
    setProgress(10);
    var hi = state.name ? (state.name + ', ') : '';
    bot(hi + 'я уже вижу твоё число — и карта у тебя совсем не пустая 🤍 Давай пару честных штрихов, и я покажу точно про тебя.', function () {
      qSphere();
    });
  }
  function qSphere() {
    setProgress(33);
    bot('Скажи честно, только между нами — <b>что сейчас откликается сильнее всего?</b>', function () {
      opts(SPHERES.map(function (s) {
        return { label: s.label, say: s.label, fn: function () { state.sphere = s.k; qDepth(); } };
      }));
    });
  }
  function qDepth() {
    setProgress(66);
    bot('Так я и почувствовала. А если чуть глубже — что из этого <b>по-настоящему твоё</b>?', function () {
      opts(DEPTH[state.sphere].map(function (txt) {
        return { label: txt, fn: function () { state.depth = txt; qIntent(); } };
      }));
    });
  }
  function qIntent() {
    setProgress(88);
    bot('Спасибо, что так честно 🤍 Я уже вижу твою карту — и это правда нечто. Последнее: ты сейчас хочешь просто <b>понять, что с тобой</b> — или уже <b>готова менять</b>?', function () {
      opts([
        { label:'Хочу понять себя', fn:function(){ state.intent='understand'; reveal(); } },
        { label:'Я уже готова менять', fn:function(){ state.intent='change'; reveal(); } },
        { label:'Пока присматриваюсь', fn:function(){ state.intent='curious'; reveal(); } }
      ]);
    });
  }

  function startTimer(id) {
    var KEY = 'vqDeadline', dl = 0;
    try { dl = +sessionStorage.getItem(KEY) || 0; } catch (e) {}
    if (!dl || dl < Date.now()) { dl = Date.now() + 15 * 60 * 1000; try { sessionStorage.setItem(KEY, dl); } catch (e) {} }
    (function tick() {
      var el = document.getElementById(id); if (!el) return;
      var left = Math.max(0, dl - Date.now());
      var mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
      el.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
      if (left > 0) setTimeout(tick, 1000);
    })();
  }

  function reveal() {
    setProgress(100);
    bot('Секунду, свожу всё воедино… 🔮', function () {
      showFinal();
    });
  }

  function showFinal() {
    setProgress(100);
    var n = state.num, soul = SOUL[n] || SOUL[9], arch = state.arch || ARCH[n] || '';
    var km = karmaOf(state.d, state.m, state.y);
    if (!state.sphere) state.sphere = 'self';
    if (!state.intent) state.intent = 'understand';
    var key = state.sphere;
    if (state.sphere === 'self') key = 'full';
    if (state.intent === 'change') key = 'full';
    var p = PROD[key] || PROD.full;
    var nm = state.name ? (state.name + ', вот что я вижу') : 'Вот что я вижу';
    var sphereLine = SPHERE_SOUL[state.sphere] || SPHERE_SOUL.self;

    var card = document.createElement('div');
    card.className = 'vq-final';
    card.innerHTML =
      '<div class="vq-kick">✦ это про тебя · ' + (arch || ('число ' + n)) + '</div>' +
      '<h3>' + nm + ' по твоей карте:</h3>' +
      '<p>' + soul + '</p>' +
      '<p>' + sphereLine + '</p>' +
      (km ? '<p>' + KARMA[km] + '</p>' : '') +
      '<div class="vq-lock">🔒 А <b>самое точное</b> — где именно ты себя тормозишь и как это развернуть по шагам — раскрывается в твоём личном разборе.</div>' +
      '<div class="vq-prod">' +
      '<h4>' + p.prod + '</h4>' +
      '<ul>' + p.bul.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>' +
      '<div class="vq-price"><b>' +
      (window.VelunaMoney ? window.VelunaMoney.format(p.price) : p.price.toLocaleString('ru') + ' ₸') +
      '</b><s>' +
      (window.VelunaMoney ? window.VelunaMoney.format(p.price * 3) : (p.price * 3).toLocaleString('ru') + ' ₸') +
      '</s></div>' +
      '<div class="vq-timer">⏳ <b id="vq-tmr">15:00</b> · −67% · цена держится</div>' +
      '<button class="vq-cta" id="vq-buy">Взять разбор →</button>' +
      '<div class="vq-trust">Не откликнётся — вернём деньги за 7 дней</div>' +
      '</div>' +
      (state.intent === 'change' || key === 'full' ? '' :
        '<div class="vq-up"><button id="vq-up">или сразу всё целиком — Полный разбор ' +
        (window.VelunaMoney ? window.VelunaMoney.format(9900) : '9 900 ₸') +
        ' →</button></div>') +
      '';
    host.appendChild(card); scrollHostBottom();
    startTimer('vq-tmr');
    document.getElementById('vq-buy').onclick = function () { checkout(p); };
    var up = document.getElementById('vq-up'); if (up) up.onclick = function () { checkout(PROD.full); };
  }

  function checkout(p) {
    if (typeof window.velunaSaveLeadDraft === 'function') {
      window.velunaSaveLeadDraft({
        name: state.name || '',
        day: state.d,
        month: state.m,
        year: state.y
      });
    }
    if (typeof window.velunaOpenOrder === 'function') {
      closeModal();
      window.velunaOpenOrder(p.prod);
    } else {
      closeModal();
      var t = document.getElementById('products'); if (t) t.scrollIntoView({ behavior: 'smooth' });
    }
  }

  window.vqInlineStart = function (seed) {
    seed = seed || {};
    state = {
      sphere: seed.sphere || 'self',
      depth: seed.depth || 'Хочу понять, кто я на самом деле',
      intent: seed.intent || 'understand',
      num: seed.num || 9,
      name: (seed.name || '').trim().split(' ')[0],
      arch: seed.arch || '',
      d: +seed.d || 0, m: +seed.m || 0, y: +seed.y || 0
    };
    openModal();
    host.innerHTML = '';
    var sub = ov.querySelector('.vqm-head-t span');
    if (sub) sub.textContent = 'твой мини-разбор готов';
    /* Из калькулятора — сразу финал, без вопросов квиза */
    showFinal();
  };
})();
