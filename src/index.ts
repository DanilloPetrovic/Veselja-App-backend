import http from "http";
import { Server } from "socket.io";
import app from "./app";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  socket.on("join_event_room", (eventId: string) => {
    socket.join(eventId);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});
