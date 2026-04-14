// emailService.js – uses Nodemailer with an Ethereal test account
// No real SMTP credentials needed; a preview URL is logged to the console.

const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Create a one-time Ethereal test account
  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host:   'smtp.ethereal.email',
    port:   587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  return transporter;
}

/**
 * Sends a registration confirmation email.
 * @param {string} toEmail    – recipient email
 * @param {string} fullName   – recipient name
 * @param {string} eventTitle – name of the event
 * @param {string} slot       – chosen slot (may be empty)
 * @param {string} regId      – registration ID
 */
async function sendRegistrationConfirmation(toEmail, fullName, eventTitle, slot, regId) {
  try {
    const t = await getTransporter();

    const slotLine = slot ? `<p><strong>Your Slot:</strong> ${slot}</p>` : '';

    const info = await t.sendMail({
      from:    '"SpringBoard Mentor Hub" <no-reply@springboard.edu>',
      to:      toEmail,
      subject: `✅ Registration Confirmed – ${eventTitle}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px">
          <h2 style="color:#4f46e5">Registration Confirmed!</h2>
          <p>Hi <strong>${fullName}</strong>,</p>
          <p>You have successfully registered for <strong>${eventTitle}</strong>.</p>
          ${slotLine}
          <p><strong>Registration ID:</strong> ${regId}</p>
          <p>Your registration is currently <strong>Pending Approval</strong> by the organizer.</p>
          <p style="color:#6b7280;font-size:13px">This is an automated confirmation from SpringBoard Mentor Hub.</p>
        </div>
      `
    });

    console.log(`✉  Email sent to ${toEmail} | Preview: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (err) {
    // Email failure should never break registration
    console.error('Email send error:', err.message);
  }
}

module.exports = { sendRegistrationConfirmation };
