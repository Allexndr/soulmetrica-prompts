import Link from 'next/link';

export const metadata = {
  title: 'Договор публичной оферты · SoulMetrica',
  robots: { index: false }
};

export default function OfferPage() {
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
        <h1>Публичная оферта</h1>
        <p className="meta">
          по оказанию цифровых услуг платформы SoulMetrica
          <br />
          г. Алматы · ТОО «НЕЙРОКИДС» · БИН: 260540017173
        </p>
        <h2>1. Общие положения</h2>
        <p>
          1.1. Настоящий документ является официальным публичным предложением (публичной офертой) ТОО
          «НЕЙРОКИДС», БИН 260540017173 (далее — «Исполнитель») в соответствии со статьями 395–397
          Гражданского кодекса Республики Казахстан.
        </p>
        <p>
          1.2. Оферта регулирует цифровые услуги SoulMetrica: разборы и доступ к личному
          кабинету.
        </p>
        <p>
          1.3. Акцепт — оплата / оформление заказа / вход в кабинет / использование Услуг.
        </p>
        <h2>2. Предмет договора</h2>
        <p>
          Исполнитель оказывает выбранную цифровую Услугу. Услуга информационно-развлекательная и не
          является медицинской или юридической.
        </p>
        <h2>3. Стоимость и расчёты</h2>
        <p>
          Стоимость на Сайте и/или в платёжном документе. Оплата — с момента поступления средств.
        </p>
        <h2>4. Персональные данные</h2>
        <p>
          По <Link href="/privacy">Политике конфиденциальности</Link> и законодательству РК.
        </p>
        <h2>5. Подсудность</h2>
        <p>Претензия 10 рабочих дней, затем суд по месту Исполнителя в г. Алматы.</p>
        <div className="box">
          <h3>Реквизиты Исполнителя</h3>
          <div className="row">
            <span>Наименование</span>
            <span>ТОО «НЕЙРОКИДС»</span>
            <span>БИН</span>
            <span>260540017173</span>
            <span>Адрес</span>
            <span>г. Алматы, ул. Алишера Навои, 280</span>
            <span>Банк</span>
            <span>АО «Kaspi Bank»</span>
            <span>БИК</span>
            <span>CASPKZKA</span>
            <span>IBAN</span>
            <span>KZ81722S000053806030</span>
            <span>Телефон</span>
            <span>+7 (707) 932 21 93</span>
            <span>Email</span>
            <span>info@neurokids.kz</span>
          </div>
        </div>
        <p style={{ marginTop: 24 }}>
          <Link href="/privacy">→ Политика конфиденциальности</Link>
        </p>
      </main>
    </>
  );
}
