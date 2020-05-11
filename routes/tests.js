require("dotenv").config();
var express = require("express");
const router = express.Router();
const Test = require("../models/Test.js");
const Logger = require("../logger.js");
const User = require("../models/User.js");
const Room = require("../models/Room.js");

router.get("/test", async (req, res) => {
  const user = await User.findOne({
    code: req.query.code,
    environment: process.env.NODE_ENV,
  });

  if (user) {
    let room = await Room.findOne({
      name: user.room,
      session: user.subject,
      environment: process.env.NODE_ENV,
    });

    if (room === null) {
      const newRoom = new Room({
        name: user.room,
        session: user.subject,
        environment: process.env.NODE_ENV,
        lastExercise: 0,
        currentTest: 0,
      });
      await newRoom.save();
      room = newRoom;
    }

    if (!room.finished) {
      const test = await Test.findOne({
        session: user.subject,
        environment: process.env.NODE_ENV,
        orderNumber: room.currentTest,
      });

      let exercise = {};

      if (test) {
        exercise = {
          description: test.exercises[room.lastExercise].description,
          time: test.exercises[room.lastExercise].time,
          type: test.exercises[room.lastExercise].type,
        };
      }

      res.send(exercise);
    } else {
      res.send({ finished: true });
    }
  } else {
    res.sendStatus(404);
  }
});

router.post("/verify", async (req, res) => {
  const user = await User.findOne({
    code: req.body.user,
    environment: process.env.NODE_ENV,
  });

  if (user) {
    let room = await Room.findOne({
      name: user.room,
      environment: process.env.NODE_ENV,
    });

    const test = await Test.findOne({
      orderNumber: room.currentTest,
      environment: process.env.NODE_ENV,
      session: user.subject,
    });

    const exercise = test.exercises[room.lastExercise];

    if (exercise) {
      const solution = exercise.solution;

      if (solution === req.body.solution) {
        // Right solution, now let's update the next exercise

        if (test.exercises[room.lastExercise + 1]) {
          room.lastExercise += 1;
          await room.save();
          res.send({ result: true });
        } else {
          const nextTest = await Test.findOne({
            orderNumber: room.currentTest + 1,
            environment: process.env.NODE_ENV,
            session: req.body.session,
          });
          if (nextTest) {
            room.lastExercise = 0;
            room.test += 1;
            await room.save();
            res.send({ result: true });
          } else {
            room.finished = true;
            await room.save();
            res.send({ result: true, finished: true });
          }
        }
      } else {
        res.send({ result: false });
      }
    } else {
      res.sendStatus(404);
    }
  } else {
    res.sendStatus(404);
  }
});

module.exports = router;
