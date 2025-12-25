// services/emailService.js
import {
  createTransport,
  createTestAccount,
  getTestMessageUrl
} from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
  }

  /**
   * Инициализация SMTP (продакшн) или Ethereal (dev)
   */
  async initialize() {
    try {
      let transporterConfig;

      if (process.env.SMTP_HOST) {
        console.log('Инициализация продакшн SMTP...');
        transporterConfig = {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true', // true для порта 465
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        };
      } else {
        // === РАЗРАБОТКА: Ethereal ===
        console.log('Инициализация тестового email (Ethereal)...');
        const testAccount = await createTestAccount();

        transporterConfig = {
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        };

        console.log('Тестовый аккаунт:');
        console.log(`   Email: ${testAccount.user}`);
        console.log(`   Pass: ${testAccount.pass}`);
        console.log(`   Веб: https://ethereal.email`);
      }

      // Создаём транспортер (nodemailer@7+)
      this.transporter = createTransport(transporterConfig);

      // Проверка соединения
      await this.transporter.verify();
      this.isInitialized = true;
      console.log('Email сервис успешно инициализирован');
    } catch (error) {
      console.error('Ошибка инициализации email сервиса:', error.message);
      throw error; // Критично — сервер не должен стартовать
    }
  }

  /**
   * Отправка письма для сброса пароля
   */
  async sendPasswordResetEmail(userEmail, userName, resetLink) {
    if (!this.isInitialized || !this.transporter) {
      throw new Error('Email сервис не инициализирован');
    }

    const mailOptions = {
      from: '"Система Аутентификации" <ghost1337likeghost@mail.ru>',
      to: userEmail,
      subject: 'Восстановление пароля - Система Аутентификации',
      html: this.getPasswordResetTemplate(userName, resetLink),
    };

    try {
      console.log(`Отправка письма на: ${userEmail}`);
      const info = await this.transporter.sendMail(mailOptions);

      const previewUrl = getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Предпросмотр (Ethereal):', previewUrl);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: previewUrl || null,
      };
    } catch (error) {
      console.error('Ошибка отправки email:', error.message);
      throw new Error(`Не удалось отправить письмо: ${error.message}`);
    }
  }

  /**
   * HTML-шаблон письма
   */
  getPasswordResetTemplate(userName, resetLink) {
    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Восстановление пароля</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 30px; }
          .greeting { font-size: 18px; margin-bottom: 20px; color: #333; }
          .message { margin-bottom: 25px; color: #666; font-size: 16px; }
          .reset-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center; margin: 20px 0; transition: transform 0.2s; }
          .reset-button:hover { transform: translateY(-2px); }
          .reset-link { word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea; margin: 20px 0; font-size: 14px; color: #666; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; color: #856404; }
          .info-box { background-color: #e7f3ff; border-radius: 6px; padding: 15px; margin: 20px 0; border-left: 4px solid #1890ff; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e9ecef; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Восстановление пароля</h1>
          </div>
          <div class="content">
            <div class="greeting">Здравствуйте, <strong>${userName}</strong>!</div>
            <div class="message">
              Вы запросили восстановление пароля для вашего аккаунта в системе аутентификации.
            </div>
            <div style="text-align: center;">
              <a href="${resetLink}" class="reset-button">Сбросить пароль</a>
            </div>
            <div class="info-box">
              <strong>Ссылка действительна в течение 1 часа.</strong><br>
              Если кнопка не работает, скопируйте и вставьте ссылку ниже в браузер:
            </div>
            <div class="reset-link">${resetLink}</div>
            <div class="warning">
              <strong>Внимание!</strong><br>
              Если вы не запрашивали восстановление пароля, проигнорируйте это письмо. 
              Ваш пароль останется без изменений.
            </div>
          </div>
          <div class="footer">
            <p>Это автоматическое сообщение, пожалуйста, не отвечайте на него.</p>
            <p>© ${new Date().getFullYear()} Система Аутентификации</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// === СИНГЛТОН: кэшируем инициализированный экземпляр ===
let emailServiceInstance = null;
let initPromise = null;

export const getEmailService = async () => {
  if (emailServiceInstance) return emailServiceInstance;

  if (!initPromise) {
    const service = new EmailService();
    initPromise = service.initialize().then(() => service);
  }

  emailServiceInstance = await initPromise;
  return emailServiceInstance;
};