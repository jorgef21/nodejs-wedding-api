var nodemailer = require('nodemailer');
var hbs= require('nodemailer-express-handlebars');
// Configuracion de SMTP Server
let transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true, 
    auth: {
      user: "info@perlayjorge.com", 
      pass: process.env.EMAIL_PSW // Environment variable from Heroku
    }
  });

const handlebarOptions = {
    viewEngine: {
      extName: '.handlebars',
      partialsDir: './views/',
      layoutsDir: './views/',
      defaultLayout: 'index.handlebars',
    },
    viewPath: './views/',
    extName: '.handlebars',
};

transporter.use('compile',hbs(handlebarOptions));

module.exports = transporter;
