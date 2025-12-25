import './Footer.scss'
import LinkOrganization from '@/components/LinkOrganization/LinkOrganization'

function Footer() {
  return(
    <footer className='footer'>
      <div className='footer__container'>
        <LinkOrganization classNamePart='footer'/>
        <p className="footer__copyright">
          © ФИЦ ЕГС РАН 1993-2025
        </p>
      </div>
    </footer>
  );
}

export default Footer;