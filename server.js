
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const EventEmitter = require("events");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const eventEmitter = new EventEmitter();

app.set("eventEmitter", eventEmitter);

app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

app.get("/", (req, res) => {
    res.send("Secure Connect Server is running");
});

eventEmitter.on("noteCreated", (note) => {
    console.log("New note created:", note.title);
});

eventEmitter.on("noteUpdated", (note) => {
    console.log("Note updated:", note.title);
});

eventEmitter.on("noteDeleted", (note) => {
    console.log("Note deleted:", note.title);
});

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        socket.user = decoded;

        next();

    } catch (error) {
        next(new Error("Invalid token"));
    }
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.user.username);

    socket.on("joinRoom", (room) => {
        if (typeof room !== "string" || !room.trim()) {
            return;
        }

        socket.join(room);
        socket.currentRoom = room;

        console.log(socket.user.username, "joined room", room);
    });

    socket.on("chatMessage", (message) => {
        if (
            typeof message !== "string" ||
            !message.trim() ||
            !socket.currentRoom
        ) {
            return;
        }

        const chatData = {
            username: socket.user.username,
            message: message.trim(),
            room: socket.currentRoom,
            time: new Date()
        };

        io.to(socket.currentRoom).emit("chatMessage", chatData);

        console.log(
            `[${socket.currentRoom}] ${chatData.username}: ${chatData.message}`
        );
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.user.username);
    });
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully");

        server.listen(process.env.PORT, () => {
            console.log(`Server running on port ${process.env.PORT}`);
        });
    })
    .catch((error) => {
        console.log("MongoDB Connection Error:", error.message);
    });
