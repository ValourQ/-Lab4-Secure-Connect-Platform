
const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/", async (req, res) => {
    try {
        const { title, content } = req.body;

        const note = new Note({
            title,
            content,
            owner: req.user.id
        });

        await note.save();

        req.app.get("eventEmitter").emit("noteCreated", note);

        res.status(201).json(note);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const notes = await Note.find({
            owner: req.user.id
        });

        res.status(200).json(notes);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get("/admin/all", adminMiddleware, async (req, res) => {
    try {
        const notes = await Note.find().populate("owner", "username email");

        res.status(200).json(notes);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const note = await Note.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!note) {
            return res.status(404).json({
                message: "Note not found"
            });
        }

        res.status(200).json(note);

    } catch (error) {
        res.status(400).json({
            message: "Invalid Note ID"
        });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate(
            {
                _id: req.params.id,
                owner: req.user.id
            },
            {
                title: req.body.title,
                content: req.body.content
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!note) {
            return res.status(404).json({
                message: "Note not found"
            });
        }

        req.app.get("eventEmitter").emit("noteUpdated", note);

        res.status(200).json(note);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!note) {
            return res.status(404).json({
                message: "Note not found"
            });
        }

        req.app.get("eventEmitter").emit("noteDeleted", note);

        res.status(200).json({
            message: "Note deleted successfully"
        });

    } catch (error) {
        res.status(400).json({
            message: "Invalid Note ID"
        });
    }
});

module.exports = router;
