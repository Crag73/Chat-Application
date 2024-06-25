import express from "express";
import {getAllConversations,newConversation,readConversation,} from "../controllers/conversationsController";
import { verifyJWT } from "../utils/verifyJWT";

const router = express.Router();

router.post("/new", verifyJWT, newConversation);
router.get("/:userId", verifyJWT, getAllConversations);
router.put("/:conversationId/read", verifyJWT, readConversation);

export default router;