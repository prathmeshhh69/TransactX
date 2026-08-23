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

async function sendTransactionEmail(userEmail,name,amount,fromAccount,toAccount){
  const subject='Transaction Notification from TransactX'
  const text=`Hello ${name}, \n\nWe would like to inform you that a transaction has been successfully processed on your account. Here are the details:\n\nAmount: ${amount}\nFrom Account: ${fromAccount}\nTo Account: ${toAccount}\n\nIf you have any questions or concerns regarding this transaction, please contact our support team.\n\nThank you for using TransactX.\n\nBest regards,\nThe TransactX Team`
  const html=`<p>Hello ${name},</p><p>We would like to inform you that a transaction has been successfully processed on your account. Here are the details:</p><ul><li>Amount: ${amount}</li><li>From Account: ${fromAccount}</li><li>To Account: ${toAccount}</li></ul><p>If you have any questions or concerns regarding this transaction, please contact our support team.</p><p>Thank you for using TransactX.</p><p>Best regards,<br>The TransactX Team</p>`
  await sendEmail(userEmail,subject,text,html)
}

async function sendTransactionFailureEmail(userEmail,name,amount,fromAccount,toAccount){
  const subject='Transaction Failure Notification from TransactX'
  const text=`Hello ${name}, \n\nWe regret to inform you that a transaction attempt on your account has failed. Here are the details:\n\nAmount: ${amount}\nFrom Account: ${fromAccount}\nTo Account: ${toAccount}\n\nPlease review the transaction details and ensure that all information is correct. If you continue to experience issues, please contact our support team for assistance.\n\nThank you for using TransactX.\n\nBest regards,\nThe TransactX Team`
  const html=`<p>Hello ${name},</p><p>We regret to inform you that a transaction attempt on your account has failed. Here are the details:</p><ul><li>Amount: ${amount}</li><li>From Account: ${fromAccount}</li><li>To Account: ${toAccount}</li></ul><p>Please review the transaction details and ensure that all information is correct. If you continue to experience issues, please contact our support team for assistance.</p><p>Thank you for using TransactX.</p><p>Best regards,<br>The TransactX Team</p>`
  await sendEmail(userEmail,subject,text,html)
}

module.exports = {sendRegisteremail, sendTransactionEmail, sendTransactionFailureEmail};