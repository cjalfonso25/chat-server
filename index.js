const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const { addUser, getUser, getUsersInRoom, removeUser } = require("./src/users");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketio(server, {
  handlePreflightRequest: (req, res) => {
    const headers = {
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept",
      "Access-Control-Allow-Origin": "*", //or the specific origin you want to give access to,
    };
    res.writeHead(200, headers);
    res.end();
  },
});

// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

const port = process.env.PORT;

io.on("connection", (socket) => {
  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    socket.join(user.room);

    socket.emit("message", {
      username: "Admin",
      text: `Welcome to room: ${room}!`,
    });
    socket.broadcast.to(user.room).emit("message", {
      username: "Admin",
      text: `${user.username} has joined!`,
      createdAt: new Date().getTime(),
    });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    io.emit("rooms", { room: user.room, users: getUsersInRoom(user.room) });

    if (!user) {
      return {
        error,
      };
    }

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit("message", {
      username: user.username,
      text: message,
      createdAt: new Date().getTime(),
    });
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        username: "Admin",
        text: `${user.username} has left!`,
      });

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
