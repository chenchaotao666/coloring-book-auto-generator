const nodemailer = require('nodemailer');

async function sendResetPasswordEmail(email, resetUrl) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'reset password',
    text: `Please click the following link to reset your password: ${resetUrl}`
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendResetPasswordEmail };