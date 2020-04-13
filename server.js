require("dotenv").config();
var express = require("express");
var bodyParser = require("body-parser");
const Logger = require("./logger.js");
const Session = require("./models/Session.js");
const User = require("./models/User.js");

var app = express();

app.use("/static", express.static("static"));
app.use("/assets", express.static("assets"));
app.use(bodyParser.json());

const fileDirectory = __dirname + "/assets/";

const auth = require("./routes/auth");
app.use(auth);

app.get("/", (req, res) => {
  res.sendFile("login.html", { root: fileDirectory });
});

app.get("/signup", (req, res) => {
  res.sendFile("signup.html", { root: fileDirectory });
});

app.get("/rooms/:mode/:rid/", (req, res) => {
  Session.findOne({
    name: req.query.session,
    environment: process.env.NODE_ENV,
  })
    .then((session) => {
      if (session) {
        User.findOne({
          code: req.query.code,
          environment: process.env.NODE_ENV,
        })
          .then((user) => {
            if (user && user.subject == req.query.session) {
              res.sendFile(
                "index.html",
                {
                  root: fileDirectory,
                },
                (err) => {
                  res.end();
                  if (err) throw err;
                }
              );
            } else {
              res.sendStatus(401);
            }
          })
          .catch((err) => {
            res.sendStatus(500);
          });
      } else {
        res.sendStatus(401);
      }
    })
    .catch((err) => {
      res.sendStatus(500);
    });
});

module.exports = app;
