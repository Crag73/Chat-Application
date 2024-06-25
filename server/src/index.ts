import express from 'express'
import { Server } from 'socket.io';
import http from "http";
import cors from "cors"
import { corsOptions } from "./config/corsOptions";
import { credentials } from "./utils/credentials";
import dotenv from 'dotenv'
import chatRoute from "./routes/chat"
import userRoute from "./routes/user"
import authRoute from "./routes/auth";
import conversationRoute from "./routes/conversations";
import cookieParser from "cookie-parser";


dotenv.config();

const app = express();
const PORT = process.env.PORT;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174"
    ]
  }
});

app.use(credentials);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/messages", chatRoute);
app.use("/api/conversations", conversationRoute);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})

const activeUsers = new Set<number>();

io.on("connection", (socket) => {
  const id = socket.handshake.query.id_sent as string;
  socket.join(id);
  activeUsers.add(parseInt(id));
  io.to(socket.id).emit("Online-Users", Array.from(activeUsers));
  socket.broadcast.emit("user-connected", parseInt(id));

  socket.on(
    "send-message",
    ({
      id,
      authorId,
      recipientId,
      conversationId,
      message,
      timeSent,
    }: {
      id: number;
      authorId: number;
      recipientId: number;
      conversationId: number;
      message: string;
      timeSent: Date;
    }) => {
      socket.broadcast.to(recipientId.toString()).emit("Receive-message", {
        id,
        authorId,
        recipientId,
        conversationId,
        message,
        timeSent,
      });
    }
  );

  socket.on("disconnect", () => {
    activeUsers.delete(parseInt(id));
    socket.broadcast.emit("User-disconnected", parseInt(id));
  })
})
