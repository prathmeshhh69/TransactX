require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"TransactX" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

async function sendRegisteremail(userEmail,name){
   const subject='Welcome to TransactX Team'
   const text=`Hello ${name}, \n\nWelcome to TransactX! We're thrilled to have you on board. Your account has been successfully created, and you can now start using our platform to manage your transactions efficiently.\n\nIf you have any questions or need assistance, feel free to reach out to our support team. We're here to help!\n\nThank you for choosing TransactX.\n\nBest regards,\nThe TransactX Team`
   const html=`<p>Hello ${name},</p><p>Welcome to TransactX! We're thrilled to have you on board. Your account has been successfully created, and you can now start using our platform to manage your transactions efficiently.</p><p>If you have any questions or need assistance, feel free to reach out to our support team. We're here to help!</p><p>Thank you for choosing TransactX.</p><p>Best regards,<br>The TransactX Team</p>`
   await sendEmail(userEmail,subject,text,html)
}

module.exports = {sendRegisteremail};