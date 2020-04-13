require("dotenv").config();
var express = require("express");
const router = express.Router();
const User = require("../models/User.js");
const nodemailer = require("nodemailer");
const Logger = require("../logger.js");

router.post("/login", (req, res) => {
  let responseBody = {
    found: false,
    room: null,
    code: null,
  };

  console.log(req.body.code);

  User.findOne(
    { code: req.body.code, environment: process.env.NODE_ENV },
    (err, user) => {
      if (user && !err) {
        responseBody.found = true;
        responseBody.room = user.room;
        responseBody.code = user.code;
      }
      res.status(responseBody.found ? 200 : 401).send(responseBody);
    }
  );
});

router.post("/signup", async (req, res) => {
  const code = Math.floor(Math.random() * 1000 + 1);

  const newUser = new User(req.body);
  newUser.code = code;

  try {
    await newUser.save();
  } catch (e) {
    Logger.monitorLog(e);
  }

  let transporter = nodemailer.createTransport({
    host: "mail.us.es",
    port: 587,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  let info = await transporter.sendMail({
    from: '"FlockJS Team 👨🏽‍💻" <no-reply@flockjs.com>', // sender address
    to: "agununare@alum.us.es", // list of receivers
    subject: "Welcome to FlockJS ✔", // Subject line
    text: "Welcome to FlockJS", // plain text body
    html: `<h1>Welcome to FlockJS</h1><br/><p>Your code in order to participate in the session is the following: <b>${code}</b></p>`, // html body
  });

  console.log("Message sent: %s", info.messageId);

  res.sendStatus(200);
});

module.exports = router;
