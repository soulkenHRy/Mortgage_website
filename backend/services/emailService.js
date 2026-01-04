const sgMail = require('@sendgrid/mail');

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ Sendgrid email service configured');
  console.log(`📧 Emails will be sent from: ${FROM_EMAIL}`);
} else {
  console.warn('⚠️  WARNING: SENDGRID_API_KEY not set. Email service disabled.');
}

const sendVerificationEmail = async (email, username, verificationCode) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️ Email not sent - Sendgrid not configured');
    return false;
  }

  try {
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject: 'Verify Your Email - Mortgage Calculator',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Verification</h2>
          <p>Hello ${username},</p>
          <p>Thank you for signing up! Please use the following verification code to verify your email address:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1f2937; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">Mortgage Calculator Team</p>
        </div>
      `
    });
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending error:', error.response?.body || error);
    return false;
  }
};

module.exports = { sendVerificationEmail };
