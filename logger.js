require("dotenv").config();
const db = require("./db.js");
const Log = require("./models/Log.js");

class Logger {
  static log(category, userId, msg) {
    console.log(msg);
    let log = Log({
      environment: process.env.NODE_ENV,
      category: category,
      createdBy: userId,
      message: msg,
    });
    log.save((err) => {
      if (err) {
        console.log("There has been an error logging to Mongo: " + err);
      }
    });
  }
}
module.exports = Logger;
