import './LinkOrganization.scss'

interface LinkOrganizationProps {
  classNamePart: string;
}

function LinkOrganization({ classNamePart}: LinkOrganizationProps) {
  const links = [
    {
      href: 'http://www.gsras.ru/new/news/',
      content: 'Новости'
    },
    {
      href: 'http://www.gsras.ru/new/ssd.htm',
      content: 'ССД'
    },
    {
      href: 'http://www.gsras.ru/new/wf/',
      content: 'Сейсм.данные'
    },
    {
      href: 'http://www.gsras.ru/new/gncc/',
      content: 'ГНСС данные',
      active: '--active'
    },
    {
      href: 'http://www.gsras.ru/new/soft/',
      content: 'Продукты'
    },
    {
      href: 'http://www.gsras.ru/new/links.htm',
      content: 'Ссылки'
    },
    {
      href: 'http://www.gsras.ru/new/struct/',
      content: 'Структура'
    },
    {
      href: 'http://www.gsras.ru/new/public/',
      content: 'Публикации'
    },
    {
      href: 'http://www.gsras.ru/new/conf/',
      content: 'Конференции'
    },
    {
      href: 'http://www.gsras.ru/new/announ/',
      content: 'Объявления'
    },
    {
      href: 'http://www.gsras.ru/new/about.htm',
      content: 'О нас'
    },
  ]

  return (
    <>
      <div className={`${classNamePart}__links`}>
        {links.map((link) => (
          <a className={`${classNamePart}__link ${classNamePart}__link${link.active || ''}`} href={link.href}>{link.content}</a>
        ))}
      </div>
    </>
  );
}

export default LinkOrganization;