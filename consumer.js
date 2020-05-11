require("dotenv").config();

const Logger = require("./logger.js");
const Session = require("./models/Session.js");
const User = require("./models/User.js");
const Room = require("./models/Room.js");
const Test = require("./models/Test.js");

let uids = new Map();
let rooms = new Map();

function toJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

async function pairing(session, io) {
  console.log("Starting the pairing of", session.name);
  let usersWaitingForRoom = await User.find({
    subject: session.name,
    token: { $exists: true },
    room: { $exists: false },
    environment: process.env.NODE_ENV,
  });

  for (const userTaken of usersWaitingForRoom) {
    const numberOfMaxRoomArray = await User.aggregate([
      {
        $match: {
          subject: session.name,
          environment: process.env.NODE_ENV,
        },
      },
      { $group: { _id: null, max: { $max: "$room" } } },
    ]);

    // Number of the last room that was assigned
    const numberOfMaxRoom = numberOfMaxRoomArray[0];

    // Update the user (Workaround)
    const user = await User.findById(userTaken.id);

    // If the user is not assigned to a room yet
    if (typeof user.room === "undefined") {
      // Take a user to pair with
      const pairedUser = await User.findOne({
        subject: session.name,
        gender: { $nin: [user.gender] },
        token: session.tokenPairing
          ? { $nin: [user.token], $exists: true }
          : { $exists: true },
        room: { $exists: false },
        environment: process.env.NODE_ENV,
      });

      if (pairedUser) {
        console.log("We found a great user to pair with!");
        if (numberOfMaxRoom.max != null) {
          user.room = numberOfMaxRoom.max + 1;
          pairedUser.room = numberOfMaxRoom.max + 1;
        } else {
          user.room = 0;
          pairedUser.room = 0;
        }
        await user.save();
        await pairedUser.save();

        io.to(user.socketId).emit("sessionStart", {
          room: session.name + user.room,
        });
        io.to(pairedUser.socketId).emit("sessionStart", {
          room: session.name + pairedUser.room,
        });
      } else {
        const anyOtherUser = await User.findOne({
          subject: session.name,
          code: { $nin: [user.code] },
          token: session.tokenPairing
            ? { $nin: [user.token], $exists: true }
            : { $exists: true },
          room: { $exists: false },
          environment: process.env.NODE_ENV,
        });

        if (anyOtherUser) {
          if (numberOfMaxRoom.max != null) {
            user.room = numberOfMaxRoom.max + 1;
            anyOtherUser.room = numberOfMaxRoom.max + 1;
          } else {
            user.room = 0;
            anyOtherUser.room = 0;
          }
          await user.save();
          await anyOtherUser.save();

          io.to(user.socketId).emit("sessionStart", {
            room: session.name + user.room,
          });
          io.to(anyOtherUser.socketId).emit("sessionStart", {
            room: session.name + anyOtherUser.room,
          });
        } else {
          if (numberOfMaxRoom.max !== null) {
            user.room = numberOfMaxRoom.max + 1;
          } else {
            user.room = 0;
          }

          await user.save();
          io.to(user.socketId).emit("sessionStart", {
            room: session.name + user.room,
          });
          console.log(
            "User " + user.socketId + " is paired alone in room " + user.room
          );
        }
      }
    }
  }

  console.log("Pairing done!");
}

async function exerciseTimeUp(id, description) {
  console.log("Friend ", id, " is out of time!");
  const user = await User.findOne({
    socketId: id,
    environment: process.env.NODE_ENV,
  });
  if (user) {
    const room = await Room.findOne({
      session: user.subject,
      name: user.room.toString(),
      environment: process.env.NODE_ENV,
    });
    if (room) {
      const test = await Test.findOne({
        orderNumber: room.currentTest,
        environment: process.env.NODE_ENV,
        session: user.subject,
      });

      const exercise = test.exercises[room.lastExercise];

      if (exercise) {
        if (test.exercises[room.lastExercise + 1]) {
          console.log("They are going to the next exercise");
          room.lastExercise += 1;
          await room.save();
        } else {
          const nextTest = await Test.findOne({
            orderNumber: room.currentTest + 1,
            environment: process.env.NODE_ENV,
            session: user.subject,
          });
          if (nextTest) {
            console.log("They got a new test (Prueba)");
            room.lastExercise = 0;
            room.test += 1;
            await room.save();
          } else {
            console.log("They finished");
            room.finished = true;
            await room.save();
          }
        }
      }
    }
  }
}

module.exports = {
  start: function (io) {
    function connection(socket) {
      Logger.log(
        "NewConn",
        socket.id,
        "New user with id " + socket.id + " has entered"
      );

      socket.on("clientReady", async (pack) => {
        const user = await User.findOne({
          code: pack,
          environment: process.env.NODE_ENV,
        });
        const session = await Session.findOne({
          name: user.subject,
          environment: process.env.NODE_ENV,
        });
        console.log(session);
        if (session && session.active) {
          user.socketId = socket.id; // TODO: Will be placed outside this function at some point
          await user.save();

          Logger.log(
            "NewConn",
            user.code,
            "Client " + user.code + " is ready!"
          );

          let usersCountSupposedToConnectNotReady = await User.countDocuments({
            subject: session.name,
            token: { $exists: false },
            room: { $exists: false },
            environment: process.env.NODE_ENV,
          });
          console.log(
            "Faltan " + usersCountSupposedToConnectNotReady + " usuarios..."
          );
          if (usersCountSupposedToConnectNotReady == 0) {
            console.log("Pairing...");
            await pairing(session, io);
          }
        }
      });

      socket.on("clientReconnection", async (pack) => {
        const user = await User.findOne({
          code: pack,
          environment: process.env.NODE_ENV,
        });
        if (user) {
          user.socketId = socket.id;
          await user.save();
        }
      });

      socket.on("text", (pack) => {
        io.sockets.emit("text", pack);
        lastText = pack.data;
        var uid = uids.get(socket.id);
        Logger.log(
          "Text",
          pack.token,
          "New text event by " +
            socket.id +
            "(" +
            uid +
            ") in room <" +
            pack.rid +
            ">:" +
            toJSON(pack)
        );
      });

      socket.on("msg", (pack) => {
        io.sockets.emit("msg", pack);
        var uid = uids.get(socket.id);
        Logger.log(
          "Msg",
          pack.token,
          "New msg event by " +
            socket.id +
            "(" +
            uid +
            ") in room <" +
            pack.rid +
            ">:" +
            toJSON(pack)
        );
      });

      socket.on("giveControl", (pack) => {
        io.sockets.emit("giveControl", pack);
        var uid = uids.get(socket.id);
        Logger.log(
          "giveControl",
          pack.token,
          "New giveControl event by " +
            socket.id +
            "(" +
            uid +
            ") in room <" +
            pack.rid +
            ">:" +
            toJSON(pack)
        );
      });

      socket.on("registry", (pack) => {
        uids.set(socket.id, pack.uid);

        var room = new Object();

        if (rooms.has(pack.rid)) {
          Logger.log(
            "Registry",
            pack.token,
            "Entering room " +
              socket.id +
              ": with <" +
              pack.uid +
              ">  of room <" +
              pack.rid +
              ">: " +
              pack.data
          );
          room = rooms.get(pack.rid);
          io.sockets.emit("giveControl", {
            uid: pack.uid,
            rid: pack.rid,
            sid: socket.id,
            data: "",
          });
        } else {
          Logger.log(
            "Registry",
            pack.token,
            "Registering " +
              socket.id +
              ": with <" +
              pack.uid +
              ">  of room <" +
              pack.rid +
              ">: " +
              pack.data
          );
          room.users = new Array();
          room.lastText = "";
        }

        room.users.push({
          uid: pack.uid,
          sid: socket.id,
        });
        rooms.set(pack.rid, room);

        Logger.log(
          "Registry",
          pack.token,
          "Updated room saved:" + toJSON(room)
        );

        socket.emit("userRegistered", {
          uid: pack.uid,
          rid: pack.rid,
          sid: socket.id,
          data: room.lastText,
        });
      });

      socket.on("nextExercise", async (pack) => {
        io.sockets.emit("nextExercise", {
          uid: pack.uid,
          rid: pack.rid,
          sid: socket.id,
          data: pack.data,
        });
        if (!pack.data.gotRight) {
          await exerciseTimeUp(socket.id, pack.data);
        }
      });
    }

    io.on("connection", connection);
  },
};
