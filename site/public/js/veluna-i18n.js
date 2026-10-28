(function () {
  'use strict';

  var STORAGE_KEY = 'soulmetrica-lang';
  var SUPPORTED = ['ru', 'en'];
  var listeners = [];

  var PRODUCT_ALIAS = {
    'Ты — целиком': 'full',
    'Ты - целиком': 'full',
    'Полный разбор': 'full',
    'Совместимость пары': 'compatibility',
    'Прогноз 2026': 'forecast',
    'Денежный код': 'money',
    'Реализация': 'realization',
    'Сценарий любви': 'love',
    'Скрытые блоки': 'blocks',
    'Детский разбор': 'child',
    'Число судьбы': 'destiny'
  };

  var DICT = {
    ru: {
      'nav.systems': 'Темы',
      'nav.calc': 'Число',
      'nav.reviews': 'Записи',
      'nav.products': 'Разборы',
      'nav.profile': 'Профиль',
      'nav.promo': '−67% в подарок ·',
      'nav.lang': 'Язык',
      'nav.theme': 'Сменить тему',
      'nav.menu': 'Меню',
      'nav.currency': 'Валюта',

      'hero.badge': '2 100+ открыли свою страницу',
      'hero.title': 'Твоя карта личности, собранная целиком',
      'hero.sub':
        'Читаем тебя по 9 системам сразу — от нумерологии до Дизайна человека. Не «звёзды скажут» — точный портрет про тебя',
      'hero.cta': 'Открыть свою страницу',
      'hero.card_label': 'твой разбор',
      'hero.card_arch': 'Мудрец',
      'hero.card_meta': '📄 PDF в Telegram · за 2–3 ч',
      'hero.user_a_meta': 'Астана · сегодня',
      'hero.user_a_prod': 'Сценарий любви · 70%',
      'hero.user_k_meta': 'Алматы · 2 дня назад',
      'hero.user_k_prod': 'Денежный код · прочитан',

      'systems.eyebrow': 'Как мы тебя читаем',
      'systems.title': 'Исследуйте 9 систем самопознания в одном путешествии',
      'systems.title_mobile': 'Исследуйте 9 систем самопознания',
      'systems.hint_strong': 'Наведи на любую карточку',
      'systems.hint_p': 'Расскажу по-человечески, что эта наука открывает про тебя',
      'systems.hint_mobile': 'Нажми на любую карточку, чтобы узнать подробнее',
      'systems.open': 'Открыть',

      'products.eyebrow': 'Разборы',
      'products.title_desk': 'Выбери свой вопрос — я найду ответ в твоей карте',
      'products.title_m_dark': 'Выбери свой вопрос',
      'products.title_m_light': 'Выбери свой вопрос — я найду ответ',
      'products.sub_desk': 'Каждый разбор пишется вручную под твою дату. Не шаблон — живой текст про тебя',
      'products.sub_m': 'Персональный PDF на 40+ страниц',
      'products.timer': 'цена держится',
      'products.more': 'Подробнее',
      'products.order': 'Заказать разбор',
      'products.best': 'ЛУЧШИЙ ВЫБОР',
      'products.full_label': 'Полный разбор',
      'products.prev': 'Назад',
      'products.next': 'Вперёд',

      'product.compatibility.title': 'Совместимость пары',
      'product.compatibility.desc':
        'Подходите ли вы — по двум датам. Где притяжение, а где трещина и как её пройти.',
      'product.forecast.title': 'Прогноз 2026',
      'product.forecast.desc':
        'Что несёт этот год именно тебе — по кварталам. Твои главные задачи и возможности.',
      'product.full.title': 'Ты - целиком',
      'product.full.desc':
        '12 глав вручную под твою дату. Характер, деньги, любовь, блоки, прогноз 2026 и горизонт 5 лет.',
      'product.full.li1': 'Ядро личности - кто ты под всеми ролями',
      'product.full.li2': 'Денежная карта - каналы, потолок и блоки',
      'product.full.li3': 'Любовная карта - сценарий и твой урок',
      'product.full.li4': 'Прогноз 2026 по кварталам + горизонт 5 лет',
      'product.money.title': 'Денежный код',
      'product.money.desc': 'Твой денежный канал, потолок и блоки — честно.',
      'product.realization.title': 'Реализация',
      'product.realization.desc': 'Твоя настоящая сила и путь — без чужих советов.',
      'product.love.title': 'Сценарий любви',
      'product.love.desc': 'Почему повторяется один круг — и как из него выйти по шагам.',
      'product.blocks.title': 'Скрытые блоки',
      'product.blocks.desc': 'Что именно тормозит тебя — в деньгах, в любви и в выборе.',
      'product.child.title': 'Детский разбор',
      'product.child.desc': 'Характер, таланты и мягкие зоны роста ребёнка — по дате рождения.',
      'product.destiny.title': 'Число судьбы',
      'product.destiny.desc': 'Первый слой про тебя: характер, сила и урок. С него удобно начать.',

      'pricing.eyebrow': 'оформление',
      'pricing.title_a': 'Взять',
      'pricing.title_b': 'разбор',
      'pricing.money_h': 'Личный разбор · Денежный код',
      'pricing.full_h': 'Полный разбор · Ты — целиком',
      'pricing.full_desc': '37 страниц про тебя · PDF в Telegram за 2–4 часа',
      'pricing.cta_money': 'Взять разбор →',
      'pricing.cta_full': 'Взять полный разбор →',
      'pricing.note_money': '✦ Не откликнется — вернём деньги за 7 дней',
      'pricing.note_full': 'Пишем вручную — берём до 15 разборов в неделю',
      'pricing.badge': '✦ флагман',
      'pricing.timer': 'цена держится',

      'footer.nav': 'Навигация',
      'footer.info': 'Информация',
      'footer.social': 'Мы в соцсетях',
      'footer.offer': 'Договор оферты',
      'footer.privacy': 'Политика конфиденциальности',
      'footer.phone': 'Телефон:',
      'footer.address': 'Адрес:',
      'footer.copy': '© 2026 SoulMetrica · ТОО «НЕЙРОКИДС» · БИН 260540017173',
      'footer.cabinet': 'Кабинет',
      'footer.destiny': 'Число судьбы',
      'footer.wheel': 'Колесо сфер',
      'footer.products': 'Разборы',
      'footer.systems': 'Темы',
      'footer.reviews': 'Записи',

      'order.title': 'Оформить разбор',
      'order.close': 'Закрыть',
      'order.your_order': 'Твой заказ',
      'order.total': 'Итого',
      'order.deal_badge': 'Выгоднее всего',
      'order.deal_title': 'Всё в одном — Полный разбор',
      'order.deal_desc': '12 глав: характер, деньги, любовь, блоки, прогноз 2026 и горизонт 5 лет',
      'order.deal_note': 'нажми — заменит заказ сверху',
      'order.name': 'Твоё имя',
      'order.name_ph': 'Имя',
      'order.dob': 'Дата рождения',
      'order.birth_extra': 'Время и город рождения',
      'order.city_ph': 'Город рождения',
      'order.phone': 'Телефон',
      'order.phone_hint': 'Выбери код страны — пробелы поставятся сами',
      'order.telegram': 'Telegram @ник',
      'order.addons': 'Добавить к разбору',
      'order.pay_card': 'Оплата картой',
      'order.pay_kaspi': 'Kaspi · счёт по телефону',
      'order.pay_prodamus': 'Prodamus · карта и рассрочка',
      'order.pay': 'Оплатить',
      'order.done': 'Готово',
      'order.remove': 'Убрать',

      'sys.0.name': 'Нумерология',
      'sys.0.cat': 'Система чисел',
      'sys.0.txt':
        'Твоя дата рождения — это код. По числам видно твой характер, сильные стороны и тот самый урок, который жизнь повторяет по кругу, пока ты его не пройдёшь.',
      'sys.1.name': 'Матрица судьбы',
      'sys.1.cat': 'Предназначение',
      'sys.1.txt':
        'Раскладываем твою дату в карту из чисел: где деньги, где любовь, где родовая программа. Видно, что досталось «по наследству» — и что с этим наконец можно сделать.',
      'sys.2.name': 'Ба-цзы',
      'sys.2.cat': 'Энергия времени',
      'sys.2.txt':
        'Китайская карта по дате и времени рождения. Показывает твои сильные стихии и периоды, когда жизнь будто открывает двери — а когда лучше не дёргаться и переждать.',
      'sys.3.name': 'Астрология',
      'sys.3.cat': 'Небо и характер',
      'sys.3.txt':
        'Солнце, Луна и Асцендент — три твои разные «я»: какая ты для мира, какая внутри и какой тебя видят при первой встрече.',
      'sys.4.name': 'Дизайн человека',
      'sys.4.cat': 'Энергия решений',
      'sys.4.txt':
        'Как ты устроена для решений и энергии: тебе действовать с разбега или дождаться приглашения? Когда живёшь против своей природы — отсюда и та самая усталость.',
      'sys.5.name': 'Эннеаграмма',
      'sys.5.cat': 'Тип личности',
      'sys.5.txt':
        'Девять типов личности. Твой тип — это про то, чего ты на самом деле боишься и чего больше всего хочешь.',
      'sys.6.name': 'Психология сценариев',
      'sys.6.cat': 'Повторы',
      'sys.6.txt':
        'У каждой из нас есть «любимые» сценарии — в деньгах, в любви. Лица меняются, сюжет тот же. Мы находим твой и показываем, в какой момент он включается.',
      'sys.7.name': 'Ранние сценарии',
      'sys.7.cat': 'Детский код',
      'sys.7.txt':
        'То, что ты решила про себя в детстве, до сих пор тихо рулит взрослой жизнью. Достаём эти установки на свет — и они теряют власть.',
      'sys.8.name': 'Реакция на стресс',
      'sys.8.cat': 'Под давлением',
      'sys.8.txt':
        'Как ты ведёшь себя, когда припекло: бьёшь, бежишь, замираешь или угождаешь? Зная это, ты впервые можешь выбрать иначе.'
    },

    en: {
      'nav.systems': 'Themes',
      'nav.calc': 'Number',
      'nav.reviews': 'Stories',
      'nav.products': 'Readings',
      'nav.profile': 'Profile',
      'nav.promo': '−67% gift ·',
      'nav.lang': 'Language',
      'nav.theme': 'Toggle theme',
      'nav.menu': 'Menu',
      'nav.currency': 'Currency',

      'hero.badge': '2,100+ opened their page',
      'hero.title': 'Your personality map — gathered as one',
      'hero.sub':
        'We read you through 9 systems at once — from numerology to Human Design. Not “the stars said so” — a precise portrait of you',
      'hero.cta': 'Open your page',
      'hero.card_label': 'your reading',
      'hero.card_arch': 'Sage',
      'hero.card_meta': '📄 PDF in Telegram · in 2–3 hrs',
      'hero.user_a_meta': 'Astana · today',
      'hero.user_a_prod': 'Love scenario · 70%',
      'hero.user_k_meta': 'Almaty · 2 days ago',
      'hero.user_k_prod': 'Money code · read',

      'systems.eyebrow': 'How we read you',
      'systems.title': 'Explore 9 self-knowledge systems in one journey',
      'systems.title_mobile': 'Explore 9 self-knowledge systems',
      'systems.hint_strong': 'Hover any card',
      'systems.hint_p': 'I’ll explain in plain words what this system reveals about you',
      'systems.hint_mobile': 'Tap any card to learn more',
      'systems.open': 'Open',

      'products.eyebrow': 'Readings',
      'products.title_desk': 'Pick your question — I’ll find the answer in your chart',
      'products.title_m_dark': 'Pick your question',
      'products.title_m_light': 'Pick your question — I’ll find the answer',
      'products.sub_desk': 'Every reading is written by hand for your date. Not a template — living text about you',
      'products.sub_m': 'Personal PDF, 40+ pages',
      'products.timer': 'price holds for',
      'products.more': 'Details',
      'products.order': 'Order reading',
      'products.best': 'BEST CHOICE',
      'products.full_label': 'Full reading',
      'products.prev': 'Back',
      'products.next': 'Next',

      'product.compatibility.title': 'Couple compatibility',
      'product.compatibility.desc':
        'Do you fit — by two dates. Where the pull is, where the crack is, and how to walk through it.',
      'product.forecast.title': '2026 forecast',
      'product.forecast.desc':
        'What this year brings specifically for you — by quarters. Your main tasks and openings.',
      'product.full.title': 'You — entirely',
      'product.full.desc':
        '12 chapters handmade for your date. Character, money, love, blocks, 2026 forecast and a 5-year horizon.',
      'product.full.li1': 'Core self — who you are under every role',
      'product.full.li2': 'Money map — channels, ceiling and blocks',
      'product.full.li3': 'Love map — your scenario and lesson',
      'product.full.li4': '2026 by quarters + 5-year horizon',
      'product.money.title': 'Money code',
      'product.money.desc': 'Your money channel, ceiling and blocks — honestly.',
      'product.realization.title': 'Realization',
      'product.realization.desc': 'Your real power and path — without other people’s advice.',
      'product.love.title': 'Love scenario',
      'product.love.desc': 'Why the same loop repeats — and how to exit it step by step.',
      'product.blocks.title': 'Hidden blocks',
      'product.blocks.desc': 'What exactly holds you back — in money, love and choice.',
      'product.child.title': 'Child reading',
      'product.child.desc': 'Character, talents and gentle growth edges of a child — by birth date.',
      'product.destiny.title': 'Destiny number',
      'product.destiny.desc': 'Your first layer: character, strength and lesson. A good place to start.',

      'pricing.eyebrow': 'checkout',
      'pricing.title_a': 'Get a',
      'pricing.title_b': 'reading',
      'pricing.money_h': 'Personal reading · Money code',
      'pricing.full_h': 'Full reading · You — entirely',
      'pricing.full_desc': '37 pages about you · PDF in Telegram in 2–4 hours',
      'pricing.cta_money': 'Get reading →',
      'pricing.cta_full': 'Get full reading →',
      'pricing.note_money': '✦ If it doesn’t land — money back in 7 days',
      'pricing.note_full': 'Written by hand — up to 15 readings a week',
      'pricing.badge': '✦ flagship',
      'pricing.timer': 'price holds for',

      'footer.nav': 'Navigation',
      'footer.info': 'Information',
      'footer.social': 'Social',
      'footer.offer': 'Public offer',
      'footer.privacy': 'Privacy policy',
      'footer.phone': 'Phone:',
      'footer.address': 'Address:',
      'footer.copy': '© 2026 SoulMetrica · NEUROKIDS LLP · BIN 260540017173',
      'footer.cabinet': 'Cabinet',
      'footer.destiny': 'Destiny number',
      'footer.wheel': 'Sphere wheel',
      'footer.products': 'Readings',
      'footer.systems': 'Themes',
      'footer.reviews': 'Stories',

      'order.title': 'Order a reading',
      'order.close': 'Close',
      'order.your_order': 'Your order',
      'order.total': 'Total',
      'order.deal_badge': 'Best value',
      'order.deal_title': 'All in one — Full reading',
      'order.deal_desc': '12 chapters: character, money, love, blocks, 2026 forecast and 5-year horizon',
      'order.deal_note': 'tap — replaces the order above',
      'order.name': 'Your name',
      'order.name_ph': 'Name',
      'order.dob': 'Date of birth',
      'order.birth_extra': 'Birth time and city',
      'order.city_ph': 'Birth city',
      'order.phone': 'Phone',
      'order.phone_hint': 'Pick a country code — spaces are added for you',
      'order.telegram': 'Telegram @handle',
      'order.addons': 'Add to reading',
      'order.pay_card': 'Pay by card',
      'order.pay_kaspi': 'Kaspi · invoice by phone',
      'order.pay_prodamus': 'Prodamus · card and installments',
      'order.pay': 'Pay',
      'order.done': 'Done',
      'order.remove': 'Remove',

      'sys.0.name': 'Numerology',
      'sys.0.cat': 'Number system',
      'sys.0.txt':
        'Your birth date is a code. Numbers show your character, strengths and the lesson life repeats until you complete it.',
      'sys.1.name': 'Destiny matrix',
      'sys.1.cat': 'Purpose',
      'sys.1.txt':
        'We unfold your date into a number map: money, love, family patterns — what you inherited and what you can finally change.',
      'sys.2.name': 'BaZi',
      'sys.2.cat': 'Time energy',
      'sys.2.txt':
        'A Chinese chart by birth date and time. It shows your strong elements and periods when life opens doors — or asks you to wait.',
      'sys.3.name': 'Astrology',
      'sys.3.cat': 'Sky & character',
      'sys.3.txt':
        'Sun, Moon and Ascendant — three different “yous”: who you are to the world, inside, and at first glance.',
      'sys.4.name': 'Human Design',
      'sys.4.cat': 'Decision energy',
      'sys.4.txt':
        'How you’re built for decisions and energy: act fast or wait for the invitation? Living against your nature is where fatigue comes from.',
      'sys.5.name': 'Enneagram',
      'sys.5.cat': 'Personality type',
      'sys.5.txt':
        'Nine personality types. Yours is about what you truly fear and what you want most.',
      'sys.6.name': 'Script psychology',
      'sys.6.cat': 'Loops',
      'sys.6.txt':
        'We all have “favorite” scripts — in money, in love. Faces change, the plot stays. We find yours and show when it switches on.',
      'sys.7.name': 'Early scripts',
      'sys.7.cat': 'Childhood code',
      'sys.7.txt':
        'What you decided about yourself as a child still quietly runs adult life. We bring those beliefs into the light — and they lose power.',
      'sys.8.name': 'Stress response',
      'sys.8.cat': 'Under pressure',
      'sys.8.txt':
        'How you act when it heats up: fight, flee, freeze or please? Knowing this, you can finally choose differently.'
    },

    kk: {
      'nav.systems': 'Тақырыптар',
      'nav.calc': 'Сан',
      'nav.reviews': 'Жазбалар',
      'nav.products': 'Талдаулар',
      'nav.profile': 'Профиль',
      'nav.promo': '−67% сыйлық ·',
      'nav.lang': 'Тіл',
      'nav.theme': 'Тақырыпты ауыстыру',
      'nav.menu': 'Мәзір',
      'nav.currency': 'Валюта',

      'hero.badge': '2 100+ өз бетін ашты',
      'hero.title': 'Тұлға картаң — толық жиналған',
      'hero.sub':
        'Сені бірден 9 жүйе бойынша оқимыз — нумерологиядан Human Design-ға дейін. «Жұлдыздар айтты» емес — сен туралы нақты портрет',
      'hero.cta': 'Өз бетіңді ашу',
      'hero.card_label': 'сенің талдауың',
      'hero.card_arch': 'Дана',
      'hero.card_meta': '📄 PDF Telegram-да · 2–3 сағ',
      'hero.user_a_meta': 'Астана · бүгін',
      'hero.user_a_prod': 'Махаббат сценарийі · 70%',
      'hero.user_k_meta': 'Алматы · 2 күн бұрын',
      'hero.user_k_prod': 'Ақша коды · оқылды',

      'systems.eyebrow': 'Сені қалай оқимыз',
      'systems.title': 'Бір саяхатта 9 өзін-өзі тану жүйесін зертте',
      'systems.hint_strong': 'Кез келген картаға апар',
      'systems.hint_p': 'Бұл ғылым сен туралы не ашатынын қарапайым тілмен айтамын',
      'systems.open': 'Ашу',

      'products.eyebrow': 'Талдаулар',
      'products.title_desk': 'Сұрағыңды таңда — картаңнан жауап табамын',
      'products.title_m_dark': 'Сұрағыңды таңда',
      'products.title_m_light': 'Сұрағыңды таңда — жауап табамын',
      'products.sub_desk': 'Әр талдау сенің күніңе қолмен жазылады. Шаблон емес — тірі мәтін',
      'products.sub_m': 'Жеке PDF, 40+ бет',
      'products.timer': 'баға сақталады',
      'products.more': 'Толығырақ',
      'products.order': 'Талдауға тапсырыс',
      'products.best': 'ЕҢ ЖАҚСЫ ТАҢДАУ',
      'products.full_label': 'Толық талдау',
      'products.prev': 'Артқа',
      'products.next': 'Алға',

      'product.compatibility.title': 'Жұп үйлесімділігі',
      'product.compatibility.desc':
        'Екі күн бойынша сәйкессіз бе? Қайда тартылыс, қайда жарықшақ және қалай өту керек.',
      'product.forecast.title': '2026 болжамы',
      'product.forecast.desc':
        'Бұл жыл саған не әкеледі — тоқсан бойынша. Негізгі міндеттерің мен мүмкіндіктерің.',
      'product.full.title': 'Сен — толығымен',
      'product.full.desc':
        'Күніңе 12 тарау қолмен. Мінез, ақша, махаббат, блоктар, 2026 болжамы және 5 жылдық горизонт.',
      'product.full.li1': 'Тұлға өзегі — рөлдердің астындағы сен',
      'product.full.li2': 'Ақша картасы — арналар, төбе және блоктар',
      'product.full.li3': 'Махаббат картасы — сценарий және сабақ',
      'product.full.li4': '2026 тоқсан бойынша + 5 жылдық горизонт',
      'product.money.title': 'Ақша коды',
      'product.money.desc': 'Ақша арнаң, төбең және блоктарың — шынайы.',
      'product.realization.title': 'Іске асыру',
      'product.realization.desc': 'Нағыз күшің мен жолың — бөтен кеңессіз.',
      'product.love.title': 'Махаббат сценарийі',
      'product.love.desc': 'Неге бір шеңбер қайталанады — және қалай шығу керек.',
      'product.blocks.title': 'Жасырын блоктар',
      'product.blocks.desc': 'Не тежейді — ақшада, махаббатта және таңдауда.',
      'product.child.title': 'Бала талдауы',
      'product.child.desc': 'Баланың мінезі, таланты және жұмсақ өсу аймақтары — туған күн бойынша.',
      'product.destiny.title': 'Тағдыр саны',
      'product.destiny.desc': 'Алғашқы қабат: мінез, күш және сабақ. Бастауға ыңғайлы.',

      'pricing.eyebrow': 'рәсімдеу',
      'pricing.title_a': 'Алу',
      'pricing.title_b': 'талдау',
      'pricing.money_h': 'Жеке талдау · Ақша коды',
      'pricing.full_h': 'Толық талдау · Сен — толығымен',
      'pricing.full_desc': '37 бет сен туралы · PDF Telegram-да 2–4 сағатта',
      'pricing.cta_money': 'Талдау алу →',
      'pricing.cta_full': 'Толық талдау алу →',
      'pricing.note_money': '✦ Үн қатпаса — 7 күнде ақшаны қайтарамыз',
      'pricing.note_full': 'Қолмен жазамыз — аптасына 15 талдауға дейін',
      'pricing.badge': '✦ флагман',
      'pricing.timer': 'баға сақталады',

      'footer.nav': 'Навигация',
      'footer.info': 'Ақпарат',
      'footer.social': 'Әлеуметтік желілер',
      'footer.offer': 'Оферта шарты',
      'footer.privacy': 'Құпиялылық саясаты',
      'footer.phone': 'Телефон:',
      'footer.address': 'Мекенжай:',
      'footer.copy': '© 2026 SoulMetrica · «НЕЙРОКИДС» ЖШС · БСН 260540017173',
      'footer.cabinet': 'Кабинет',
      'footer.destiny': 'Тағдыр саны',
      'footer.wheel': 'Сфералар дөңгелегі',
      'footer.products': 'Талдаулар',
      'footer.systems': 'Тақырыптар',
      'footer.reviews': 'Жазбалар',

      'order.title': 'Талдауға тапсырыс',
      'order.close': 'Жабу',
      'order.your_order': 'Тапсырысың',
      'order.total': 'Барлығы',
      'order.deal_badge': 'Ең тиімді',
      'order.deal_title': 'Бәрі бірге — Толық талдау',
      'order.deal_desc': '12 тарау: мінез, ақша, махаббат, блоктар, 2026 болжамы және 5 жылдық горизонт',
      'order.deal_note': 'бас — жоғарыдағы тапсырысты ауыстырады',
      'order.name': 'Атың',
      'order.name_ph': 'Аты',
      'order.dob': 'Туған күні',
      'order.birth_extra': 'Туған уақыты мен қаласы',
      'order.city_ph': 'Туған қала',
      'order.phone': 'Телефон',
      'order.phone_hint': 'Выбери код страны — пробелы поставятся сами',
      'order.telegram': 'Telegram @ник',
      'order.addons': 'Талдауға қосу',
      'order.pay_card': 'Картамен төлеу',
      'order.pay_kaspi': 'Kaspi · телефонға шот',
      'order.pay_prodamus': 'Prodamus · карта және бөліп төлеу',
      'order.pay': 'Төлеу',
      'order.done': 'Дайын',
      'order.remove': 'Алып тастау',

      'sys.0.name': 'Нумерология',
      'sys.0.cat': 'Сан жүйесі',
      'sys.0.txt':
        'Туған күнің — код. Сандар мінезіңді, күшті жақтарыңды және өмір қайталайтын сабақты көрсетеді.',
      'sys.1.name': 'Тағдыр матрицасы',
      'sys.1.cat': 'Мақсат',
      'sys.1.txt':
        'Күніңді сан картасына жаямыз: ақша, махаббат, рулық бағдарлама — не мұра болды және не істеуге болады.',
      'sys.2.name': 'Ба-цзы',
      'sys.2.cat': 'Уақыт энергиясы',
      'sys.2.txt':
        'Туған күн мен уақыт бойынша қытай картасы. Күшті элементтеріңді және есік ашылатын / күту керек кезеңдерді көрсетеді.',
      'sys.3.name': 'Астрология',
      'sys.3.cat': 'Аспан және мінез',
      'sys.3.txt':
        'Күн, Ай және Асцендент — үш түрлі «мен»: әлемге, ішке және алғашқы кездесуде.',
      'sys.4.name': 'Human Design',
      'sys.4.cat': 'Шешім энергиясы',
      'sys.4.txt':
        'Шешім мен энергияға қалай жаралғаның: жүгіріп әрекет пе, әлде шақыруды күту ме? Табиғатыңа қарсы өмір — шаршаудың көзі.',
      'sys.5.name': 'Эннеаграмма',
      'sys.5.cat': 'Тұлға типі',
      'sys.5.txt':
        'Тоғыз тұлға типі. Сенікі — неден қорқатының және не қалайтының туралы.',
      'sys.6.name': 'Сценарий психологиясы',
      'sys.6.cat': 'Қайталаулар',
      'sys.6.txt':
        'Әрқайсымызда «сүйікті» сценарийлер бар — ақшада, махаббатта. Беттер өзгереді, сюжет сол. Біз сенікін тауып, қашан қосылатынын көрсетеміз.',
      'sys.7.name': 'Ерте сценарийлер',
      'sys.7.cat': 'Балалық код',
      'sys.7.txt':
        'Бала кезде өзің туралы шешкенің әлі де ересек өмірді басқарады. Сол сенімдерді жарыққа шығарамыз — және олар күшін жояды.',
      'sys.8.name': 'Стресс реакциясы',
      'sys.8.cat': 'Қысымда',
      'sys.8.txt':
        'Қиын сәтте қалай әрекет етесің: соғасың, қашасың, қатып қаласың ба, әлде ұнамды боласың ба? Білсең — басқаша таңдай аласың.'
    }
  };

  // Exact text fallback covers legacy markup and UI created dynamically by scripts.
  // Explicit data-i18n keys above remain the primary source.
  var TEXT_EN = {
    'Бесплатно · Два инструмента': 'Free · Two tools',
    'Открой': 'Open',
    'свою страницу': 'your page',
    'Введи дату рождения — и я покажу твоё число жизни и то, что оно говорит о тебе прямо сейчас.':
      'Enter your birth date and I’ll show your life-path number and what it says about you right now.',
    'Как тебя зовут,': 'What is your name,',
    'что тебя беспокоит?': 'what is on your mind?',
    'Твоё имя': 'Your name',
    'Как тебя зовут...': 'Your name...',
    'Дата рождения': 'Date of birth',
    'Показать моё число': 'Show my number',
    'Только дата — без созвонов и регистраций · данные не передаём':
      'Just your date — no calls or registration · your data stays private',
    'ИЛИ': 'OR',
    'Три числа': 'Three numbers',
    'о тебе': 'about you',
    'Ядро личности, денежный канал и сценарий любви — всё из одной даты. Введи свою и посмотри.':
      'Your core personality, money channel and love scenario — all from one date. Enter yours and see.',
    'Твоя матрица судьбы,': 'Your destiny matrix,',
    'узнай себя...': 'discover yourself...',
    'Показать': 'Show',
    'Ядро': 'Core',
    'Деньги': 'Money',
    'Любовь': 'Love',
    'Получить мини-разбор →': 'Get a mini reading →',
    'Только дата рождения — без регистраций': 'Birth date only — no registration',
    'Что живёт': 'What lives',
    'в этом дневнике': 'in this journal',
    'Выбери то, что сейчас болит или просто интересует — и найдёшь запись именно про это.':
      'Choose what hurts or simply interests you right now — and find the entry written for it.',
    'Числа твоей судьбы': 'The numbers of your destiny',
    'Код твоей личности': 'Your personality code',
    'Четыре столпа': 'Four pillars',
    'Звёзды о тебе': 'What the stars reveal',
    'Энергетический тип': 'Your energy type',
    '9 масок личности': 'Nine personality masks',
    'Психология': 'Psychology',
    'Модели поведения': 'Behavior patterns',
    'Детские установки': 'Childhood beliefs',
    'Как ты справляешься': 'How you cope',
    'Наведите': 'Hover',
    'Про тебя': 'About you',
    'Не общие слова, а твоя дата рождения': 'Not general words — your own birth date',
    'За 2–3 часа': 'In 2–3 hours',
    'PDF приходит прямо в Telegram': 'The PDF arrives directly in Telegram',
    'По 9 системам': 'Across 9 systems',
    'Глубина, а не гадание': 'Depth, not fortune-telling',
    'Открыть свою страницу ✦': 'Open your page ✦',
    'SoulMetrica · Отзывы': 'SoulMetrica · Reviews',
    'После разбора': 'After the reading',
    'что меняется': 'what changes',
    'Это всё про меня. Перечитала и один раз расплакалась 😍':
      'This is all about me. I reread it and cried once 😍',
    'Думала развод на деньги. А перестала себя винить.':
      'I thought it was a scam. Instead, I stopped blaming myself.',
    'Показала мужу — он впервые меня понял 🥹': 'I showed my husband — he understood me for the first time 🥹',
    'Просто в точку 😭': 'Exactly right 😭',
    'Боже, я плачу': 'Oh my God, I’m crying',
    'Нереально точно про меня 😍': 'Unbelievably accurate about me 😍',
    'Лучшее объяснение себя': 'The best explanation of who I am',
    'Хочу полный разбор!': 'I want the full reading!',
    'Перечитываю каждый месяц': 'I reread it every month',
    'Идеально 🤩': 'Perfect 🤩',
    'Просто в точку 🥹': 'Exactly right 🥹',
    'Хочу так же': 'I want this too',
    'Маленький инструмент': 'A small tool',
    'Где ты сейчас': 'Where are you now',
    'на самом деле?': 'really?',
    'Выставь оценку по каждой сфере — и посмотри, где твой настоящий дисбаланс. Честнее, чем кажется.':
      'Rate each area and see where your real imbalance is. It is more honest than it seems.',
    'Финансы': 'Finances',
    'Карьера': 'Career',
    'Отношения': 'Relationships',
    'Окружение': 'Social circle',
    'Творчество': 'Creativity',
    'Духовность': 'Spirituality',
    'Рост': 'Growth',
    'Здоровье': 'Health',
    '← сбросить': '← reset',
    'Интересная картина.': 'Interesting picture.',
    'Подвигай ползунки': 'Move the sliders',
    '— я покажу, что вижу.': '— I’ll show you what I see.',
    'Собрать мой результат ✦': 'Build my result ✦',
    'Полная расшифровка числа по 9 системам': 'Full interpretation across 9 systems',
    'Где именно твой блок и как его убрать': 'Where your block is and how to remove it',
    '3–5 конкретных шагов под твою ситуацию': '3–5 concrete steps for your situation',
    'PDF в Telegram за 2–3 часа': 'PDF in Telegram in 2–3 hours',
    'Время и город рождения': 'Birth time and city',
    'Готово': 'Done',
    'Знаешь время и город — посчитаем Асцендент и Дизайн точно. Не знаешь — сделаем по дате 🤍':
      'If you know the time and city, we can calculate the Ascendant and Human Design precisely. If not, we’ll work from the date 🤍',
    'Телефон': 'Phone',
    'Telegram @ник': 'Telegram @handle',
    'Обязательно. Разбор и вход — через Telegram. Телефон сохраняем для связи.':
      'Required. Your reading and access arrive through Telegram. We keep the phone number for contact.',
    '+ Добавь ещё разбор – выгоднее вместе': '+ Add another reading — better value together',
    'Добавь ещё разбор – выгоднее вместе': 'Add another reading — better value together',
    'Выбирайте дополнительные сферы для более глубокого погружения':
      'Choose extra areas for a deeper reading',
    'Карта · ссылка': 'Card · payment link',
    'Демо без оплаты': 'Demo without payment',
    'Разбор в боте': 'Reading in the bot',
    'г. Алматы, ул. Алишера Навои, 280': '280 Alisher Navoi St., Almaty',
    'Январь': 'January',
    'Февраль': 'February',
    'Март': 'March',
    'Апрель': 'April',
    'Май': 'May',
    'Июнь': 'June',
    'Июль': 'July',
    'Август': 'August',
    'Сентябрь': 'September',
    'Октябрь': 'October',
    'Ноябрь': 'November',
    'Декабрь': 'December',
    'Пн': 'Mon',
    'Вт': 'Tue',
    'Ср': 'Wed',
    'Чт': 'Thu',
    'Пт': 'Fri',
    'Сб': 'Sat',
    'Вс': 'Sun'
    ,
    'ДД': 'DD',
    'ММ': 'MM',
    'ГГГГ': 'YYYY',
    'ЧЧ': 'HH',
    'Привет, дорогая 🤍 Иди сюда — расскажу тебе про тебя': 'Hi 🤍 Come here — I’ll tell you',
    'кое-что интересное': 'something interesting about you',
    '…': '…',
    'чат-виджет · можно скрыть': 'chat widget · can be hidden',
    'Скрыть чат': 'Hide chat',
    '−67% в подарок': '−67% gift',
    'Закрыть': 'Close'
    ,
    'Д': 'D',
    'А': 'A',
    'К': 'K',
    'М': 'M',
    'Аружан, 28': 'Aruzhan, 28',
    'Камила, 31': 'Kamila, 31',
    'Имя': 'Name',
    'Город рождения': 'Birth city'
  };

  var ATTR_EN = {
    'Главный экран': 'Hero section',
    'Колесо сфер': 'Life-area wheel',
    'Колесо баланса': 'Balance wheel',
    'День': 'Day',
    'Месяц': 'Month',
    'Год': 'Year',
    'Часы': 'Hours',
    'Минуты': 'Minutes',
    'Время рождения': 'Birth time',
    'Выбрать дату': 'Choose date',
    'Выбрать время': 'Choose time',
    'Предыдущий месяц': 'Previous month',
    'Следующий месяц': 'Next month',
    'Календарь': 'Calendar',
    'Город': 'City',
    'Дополнительные разборы': 'Additional readings',
    'Закрыть': 'Close',
    'Убрать': 'Remove',
    'Тенге': 'Tenge',
    'Рубли': 'Rubles',
    'Открыть подарок со скидкой −67%': 'Open the −67% gift',
    'Язык': 'Language',
    'Валюта': 'Currency',
    'Сменить тему': 'Switch theme',
    'Меню': 'Menu',
    'Назад': 'Previous',
    'Вперёд': 'Next'
    ,
    'Чат SoulMetrica': 'SoulMetrica chat'
  };

  function normalize(lang) {
    lang = String(lang || '').toLowerCase().slice(0, 2);
    return SUPPORTED.indexOf(lang) !== -1 ? lang : 'ru';
  }

  function detect() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalize(saved);
    } catch (e) {}
    var nav = (navigator.language || navigator.userLanguage || 'ru').toLowerCase();
    if (nav.indexOf('en') === 0) return 'en';
    return 'ru';
  }

  var current = detect();

  function t(key, lang) {
    lang = normalize(lang || current);
    var pack = DICT[lang] || DICT.ru;
    if (pack[key] != null) return pack[key];
    if (DICT.ru[key] != null) return DICT.ru[key];
    return key;
  }

  function productKey(name) {
    return PRODUCT_ALIAS[name] || null;
  }

  function productTitle(name, lang) {
    var key = productKey(name);
    if (!key) return name;
    return t('product.' + key + '.title', lang);
  }

  var translating = false;

  function dynamicEnglish(text) {
    if (TEXT_EN[text] != null) return TEXT_EN[text];
    var out = text;
    out = out.replace(/^Укажи номер телефона$/, 'Enter your phone number');
    out = out.replace(
      /^Укажи Telegram @ник \(от 5 символов\) — WhatsApp сюда не подходит$/,
      'Enter a Telegram @handle (at least 5 characters) — WhatsApp cannot be used here'
    );
    out = out.replace(/^Переходим к оплате…$/, 'Opening payment…');
    out = out.replace(/^Создаём счёт…$/, 'Creating invoice…');
    out = out.replace(/^Оплатить →$/, 'Pay →');
    out = out.replace(/^Открываем оплату…$/, 'Opening payment…');
    out = out.replace(/^Оплата прошла! Открываем бота…$/, 'Payment received! Opening the bot…');
    out = out.replace(/^Ждём оплату в Kaspi…$/, 'Waiting for payment in Kaspi…');
    out = out.replace(/^Сервер оплаты временно недоступен$/, 'The payment server is temporarily unavailable');
    out = out.replace(/^Сеть недоступна\.?$/, 'Network unavailable.');
    out = out.replace(/^Не удалось создать оплату$/, 'Could not create payment');
    out = out.replace(
      /^Счёт создан\. Открой Kaspi и оплати — статус обновим автоматически\.$/,
      'Invoice created. Open Kaspi and pay — the status will update automatically.'
    );
    out = out.replace(
      /^Счёт отправлен в Kaspi\. Открой приложение и оплати — ждём подтверждение…$/,
      'The invoice was sent to Kaspi. Open the app and pay — we are waiting for confirmation…'
    );
    out = out.replace(
      /^Пожалуйста, введи полную дату рождения\.$/,
      'Please enter your complete birth date.'
    );
    out = out.replace(/^Получить мини-разбор →$/, 'Get a mini reading →');
    out = out.replace(/^Посчитать моё число ✦$/, 'Calculate my number ✦');
    out = out.replace(/^такое число у /, 'this number appears in ');
    out = out.replace(/ людей$/, ' of people');
    out = out.replace(/^Сильная сторона$/, 'Strength');
    out = out.replace(/^Твой урок$/, 'Your lesson');
    out = out.replace(/^Архетип «(.+)»$/, 'Archetype “$1”');
    out = out.replace(/^(.+), твоё число жизни$/, '$1, your life-path number');
    out = out.replace(/^Твоё число жизни$/, 'Your life-path number');
    out = out.replace(/^По числу (\d+) видно, что /, 'Number $1 shows that ');
    out = out.replace(
      /Полная расшифровка по 9 системам — в разборе\./,
      'The full interpretation across 9 systems is in your reading.'
    );
    return out;
  }

  function translateLegacy(root) {
    root = root || document;
    translating = true;
    try {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          var parent = node.parentElement;
          if (!parent || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return node.nodeValue && node.nodeValue.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      });
      var nodes = [];
      var node;
      while ((node = walker.nextNode())) nodes.push(node);
      nodes.forEach(function (textNode) {
        var raw = textNode.nodeValue;
        if (textNode.__velunaRu == null) textNode.__velunaRu = raw;
        if (current === 'ru') {
          if (textNode.nodeValue !== textNode.__velunaRu) textNode.nodeValue = textNode.__velunaRu;
          return;
        }
        var trimmed = String(textNode.__velunaRu).trim();
        var translated = dynamicEnglish(trimmed);
        if (translated !== trimmed) {
          var lead = String(textNode.__velunaRu).match(/^\s*/)[0];
          var tail = String(textNode.__velunaRu).match(/\s*$/)[0];
          var nextText = lead + translated + tail;
          if (textNode.nodeValue !== nextText) textNode.nodeValue = nextText;
        }
      });

      root.querySelectorAll('[aria-label],[title],[placeholder]').forEach(function (el) {
        ['aria-label', 'title', 'placeholder'].forEach(function (attr) {
          if (!el.hasAttribute(attr)) return;
          var store = 'data-i18n-original-' + attr;
          if (!el.hasAttribute(store)) el.setAttribute(store, el.getAttribute(attr));
          var original = el.getAttribute(store);
          if (current === 'ru') {
            el.setAttribute(attr, original);
          } else {
            el.setAttribute(attr, ATTR_EN[original] || TEXT_EN[original] || dynamicEnglish(original));
          }
        });
      });
    } finally {
      translating = false;
    }
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var val = t(key);
      if (el.getAttribute('data-i18n-html') === '1') el.innerHTML = val;
      else el.textContent = val;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });

    document.documentElement.setAttribute('lang', current);
    document.title =
      current === 'en'
        ? 'Your Personality Map · SoulMetrica'
        : 'Твоя карта личности · SoulMetrica';
    var description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        current === 'en'
          ? 'Personal SoulMetrica readings from your birth date: personality, love, money, forecast and a complete reading delivered in Telegram.'
          : 'Дневник про нумерологию и выбор. Персональные разборы SoulMetrica — полный разбор, любовь, деньги, прогноз. Доставка в Telegram.'
      );
    }
    document.querySelectorAll('[data-lang-switch]').forEach(function (sw) {
      sw.setAttribute('data-active', current);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      var lang = btn.getAttribute('data-lang-btn');
      var on = lang === current;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    translateLegacy(root);
  }

  function setLang(lang) {
    current = normalize(lang);
    try {
      localStorage.setItem(STORAGE_KEY, current);
    } catch (e) {}
    apply(document);
    listeners.forEach(function (fn) {
      try {
        fn(current);
      } catch (e) {}
    });
    if (typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('veluna:lang', { detail: { lang: current } }));
    }
  }

  function wire() {
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLang(btn.getAttribute('data-lang-btn'));
      });
    });
    apply(document);
    if (window.MutationObserver) {
      var observer = new MutationObserver(function (mutations) {
        if (translating) return;
        mutations.forEach(function (mutation) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(function (added) {
              if (added.nodeType === 1) translateLegacy(added);
              else if (added.nodeType === 3 && added.parentElement) translateLegacy(added.parentElement);
            });
          } else if (mutation.type === 'characterData' && mutation.target.parentElement) {
            translateLegacy(mutation.target.parentElement);
          }
        });
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  window.VelunaI18n = {
    t: t,
    getLang: function () {
      return current;
    },
    setLang: setLang,
    apply: apply,
    onChange: onChange,
    productTitle: productTitle,
    productKey: productKey,
    SUPPORTED: SUPPORTED.slice()
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
