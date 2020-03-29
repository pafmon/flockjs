require("dotenv").config();
var express = require("express");
const router = express.Router();
const Papa = require("papaparse");
const fs = require("fs");
const nodemailer = require("nodemailer");

router.post("/login", async (req, res) => {
  const file = "users.csv";
  const content = fs.readFileSync(file, "utf8");
  const results = await Papa.parse(content);

  let responseBody = {
    found: false,
    room: null,
    user: null
  };

  for (i = 0; i < results.data.length; i++) {
    if (
      results.data[i][1] == req.body.mail &&
      results.data[i][5] == req.body.code
    ) {
      responseBody.found = true;
      responseBody.room = results.data[i][2];
      responseBody.user = req.body;
      break;
    }
  }

  res.status(responseBody.found ? 200 : 401).send(responseBody);
});

router.post("/signup", async (req, res) => {
  const code = Math.floor(Math.random() * 1000 + 1);

  fs.writeFileSync(
    "users.csv",
    `${req.body.fullName},${req.body.mail},${req.body.nameOfStudies},${req.body.gender},${req.body.age},${code}\n`,
    { flag: "a+" }
  );

  let transporter = nodemailer.createTransport({
    host: "mail.us.es",
    port: 587,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  let info = await transporter.sendMail({
    from: '"FlockJS Team 👨🏽‍💻" <no-reply@flockjs.com>', // sender address
    to: "agununare@alum.us.es", // list of receivers
    subject: "Welcome to FlockJS ✔", // Subject line
    text: "Welcome to FlockJS", // plain text body
    html: `<h1>Welcome to FlockJS</h1><br/><p>Your code in order to participate in the session is the following: <b>${code}</b></p>` // html body
  });

  console.log("Message sent: %s", info.messageId);

  res.sendStatus(200);
});

module.exports = router;
