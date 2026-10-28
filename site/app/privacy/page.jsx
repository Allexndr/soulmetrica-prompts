import Link from 'next/link';

export const metadata = {
  title: 'Политика конфиденциальности · SoulMetrica',
  robots: { index: false }
};

export default function PrivacyPage() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Marcellus&family=Nunito:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/css/legal.css" />
      <main className="wrap">
        <Link href="/" className="back">
          ← На главную
        </Link>
        <h1>Политика конфиденциальности</h1>
        <p className="meta">SoulMetrica · ТОО «НЕЙРОКИДС» · БИН: 260540017173</p>
        <h2>1. Общие положения</h2>
        <p>
          Политика определяет обработку персональных данных пользователей платформы оператором ТОО
          «НЕЙРОКИДС» (БИН 260540017173) по Закону РК «О персональных данных и их защите».
        </p>
        <h2>2. Какие данные обрабатываются</h2>
        <ul>
          <li>имя, телефон, Telegram, email, дата рождения и данные форм;</li>
          <li>данные заказа и платежа (без хранения полных данных карт Оператором);</li>
          <li>технические данные: IP, cookie, браузер, устройство.</li>
        </ul>
        <h2>3. Цели</h2>
        <ul>
          <li>исполнение договора (оферты) и доставка услуг;</li>
          <li>кабинет, поддержка, улучшение сервиса;</li>
          <li>требования законодательства РК.</li>
        </ul>
        <h2>4. Передача третьим лицам</h2>
        <p>
          Только по закону, платёжным партнёрам, хостингу, CRM и подрядчикам для исполнения договора —
          при обязательствах конфиденциальности.
        </p>
        <h2>5. Контакты</h2>
        <p>
          <a href="mailto:info@neurokids.kz">info@neurokids.kz</a>, тел.{' '}
          <a href="tel:+77079322193">+7 (707) 932 21 93</a>
          <br />
          Адрес: г. Алматы, ул. Алишера Навои, 280.
        </p>
        <p style={{ marginTop: 24 }}>
          <Link href="/offer">← Договор оферты</Link>
        </p>
      </main>
    </>
  );
}
