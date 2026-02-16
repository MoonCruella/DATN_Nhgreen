import nodemailer from "nodemailer";
import { config } from "./env.js";

const transporter = nodemailer.createTransport({
  host: config.smtpServer,
  post: 587,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPassword,
  },
});
transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server is ready to send emails");
  }
});

const sendMail = async (to, subject, text) => {
  try {
    const result = await transporter.sendMail({
      from: config.emailSender,
      to,
      subject,
      text,
    });
    console.log("Email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Send mail error:", error);
    throw error;
  }
};

export default sendMail;
