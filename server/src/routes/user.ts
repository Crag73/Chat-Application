import express from "express";
import { editUser, getAllUsers } from "../controllers/usersController";
import { verifyJWT } from "../utils/verifyJWT";

const router = express.Router();

router.get("/", verifyJWT, getAllUsers);
router.put("/:userId", verifyJWT, editUser);

export default router;