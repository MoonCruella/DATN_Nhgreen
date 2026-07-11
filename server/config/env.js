import dotenv from "dotenv";
dotenv.config();

export const config = {
  mongodbUri: process.env.MONGODB_CONN,
  port: process.env.PORT,
  accessTokenKey: process.env.ACCESS_TOKEN_KEY,
  accessTokenLife: process.env.ACCESS_TOKEN_LIFE,
  refreshTokenKey: process.env.REFRESH_TOKEN_KEY,
  refreshTokenLife: process.env.REFRESH_TOKEN_LIFE,
  smtpServer: process.env.SMTP_SERVER,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  emailSender: process.env.EMAIL_SENDER,

  // thêm Cloudinary
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  }
};
