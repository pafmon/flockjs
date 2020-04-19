require("dotenv").config();

const Logger = require("./logger.js");
const Session = require("./models/Session.js");
const User = require("./models/User.js");

let uids = new Map();
let rooms = new Map();

function toJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

async function changeNameOfUsers() {
  let users = await User.find({
    environment: process.env.NODE_ENV,
  });

  for (const user of users) {
    if (user.firstName === "Agustín") {
      user.testing = "Demo";
    }

    await user.save();
  }
}

async function pairing(session, io) {
  let usersWaitingForRoom = await User.find({
    subject: "TFM",
    token: { $exists: true },
    room: { $exists: false },
    environment: process.env.NODE_ENV,
  });

  for (const user of usersWaitingForRoom) {
    const numberOfMaxRoom = await User.aggregate([
      {
        $match: {
          subject: session.name,
          environment: process.env.NODE_ENV,
        },
      },
      { $group: { _id: null, max: { $max: "$room" } } },
    ]);

    if (typeof user.room === "undefined") {
      const pairedUser = await User.findOne({
        subject: "TFM",
        gender: !user.gender,
        token: session.tokenPairing
          ? { $nin: [user.token], $exists: true }
          : { $exists: true },
        room: { $exists: false },
        environment: process.env.NODE_ENV,
      });

      if (pairedUser) {
        if (numberOfMaxRoom.max >= 0) {
          user.room = numberOfMaxRoom.max + 1;
          pairedUser.room = numberOfMaxRoom.max + 1;
        } else {
          user.room = 0;
          pairedUser.room = 0;
        }
        await user.save().then(() => {
          console.log("Saved!");
        });
        await pairedUser.save();

        io.to(user.socketId).emit("sessionStart", {
          room: session.name + user.room,
        });
        io.to(pairedUser.socketId).emit("sessionStart", {
          room: session.name + pairedUser.room,
        });
      } else {
        const anyOtherUser = await User.findOne({
          subject: "TFM",
          code: !user.code,
          token: session.tokenPairing
            ? { $nin: [user.token], $exists: true }
            : { $exists: true },
          room: { $exists: false },
          environment: process.env.NODE_ENV,
        });

        if (anyOtherUser) {
          if (numberOfMaxRoom.max >= 0) {
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
          if (numberOfMaxRoom.max >= 0) {
            console.log("Entro con max");
            user.room = numberOfMaxRoom.max + 1;
          } else {
            console.log("Entró en 0");
            user.room = 0;
          }
          user.room = 0;
          await user.save().then(() => {
            console.log("Saved!");
          });
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
        if (session && session.active) {
          user.socketId = socket.id; // TODO: Will be placed outside this function at some point
          await user.save();

          Logger.log(
            "NewConn",
            user.code,
            "Client " + user.code + " is ready!"
          );

          let usersCountSupposedToConnectNotReady = await User.countDocuments({
            subject: "TFM",
            token: { $exists: false },
            room: { $exists: false },
            environment: process.env.NODE_ENV,
          });

          if (usersCountSupposedToConnectNotReady == 0) {
            console.log("Pairing...");
            await changeNameOfUsers();
            await pairing(session, io);
          }
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
    }

    io.on("connection", connection);
  },
};
