import express from "express";
import { deleteMessage, editMessage, getMessagesInConversation, newMessage } from "../controllers/chatController";
import { verifyJWT } from "../utils/verifyJWT";

const router = express.Router();

router.get("/", verifyJWT, getMessagesInConversation);
router.post("/new", verifyJWT, newMessage);
router.route("/:id").delete(verifyJWT, deleteMessage).put(verifyJWT, editMessage);

export default router;