require("dotenv").config();
var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const Logger = require("./logger.js");
const Session = require("./models/Session.js");
const User = require("./models/User.js");

var app = express();

app.use("/static", express.static("static"));
app.use("/assets", express.static("assets"));
app.use(bodyParser.json());
app.use(cookieParser());

const fileDirectory = __dirname + "/assets/";

const auth = require("./routes/auth");
app.use(auth);

app.get("/", (req, res) => {
  res.sendFile("login.html", { root: fileDirectory });
});

app.get("/signup", (req, res) => {
  res.sendFile("signup.html", { root: fileDirectory });
});

app.post("/registerUser", async (req, res) => {
  try {
    const user = await User.findOne({
      code: req.cookies.code,
      environment: process.env.NODE_ENV,
    });
    const session = await Session.findOne({
      name: user.subject,
      environment: process.env.NODE_ENV,
    });

    if (session && session.tokens.indexOf(req.body.tokenId) > -1) {
      user.token = req.body.tokenId;
      await user.save();
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/joinSession", async (req, res) => {
  User.findOne({
    code: req.query.code,
    environment: process.env.NODE_ENV,
  })
    .then((user) => {
      if (user) {
        Session.findOne({
          name: user.subject,
          environment: process.env.NODE_ENV,
        })
          .then((session) => {
            if (session) {
              if (session.active) {
                res.header({ "Set-Cookie": `code=${req.query.code}` });
                res.sendFile("lobby.html", { root: fileDirectory });
              } else {
                res.send(
                  "Session is not active yet. If you think it is an error, contact with your professor."
                );
              }
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

app.get("/rooms/:mode/:rid/", (req, res) => {
  res.sendFile(
    "main.html",
    {
      root: fileDirectory,
    },
    (err) => {
      res.end();
      if (err) throw err;
    }
  );
});

module.exports = app;
