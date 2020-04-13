const Logger = require("./logger.js");

let uids = new Map();
let rooms = new Map();

function toJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

module.exports = {
  start: function (io) {
    function connection(socket) {
      Logger.log(
        "NewConn",
        socket.id,
        "New user with id " + socket.id + " has entered"
      );

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
