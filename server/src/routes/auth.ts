import express from "express"

import { handleLogout, handlePersistentLogin, handleRefreshToken, loginUser, registerNewUser } from "../controllers/authController";

const router = express.Router();

router.post("/signup", registerNewUser);
router.get("/signup", (req, res) => {
    res.send("hello")
})
router.post("/login", loginUser);
router.get("/refresh", handleRefreshToken);
router.get("/login/persist", handlePersistentLogin);
router.post("/logout", handleLogout);

export default router;