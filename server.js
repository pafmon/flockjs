require("dotenv").config();
var express = require("express");
var bodyParser = require("body-parser");
const Logger = require("./logger.js");

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
});

module.exports = app;
