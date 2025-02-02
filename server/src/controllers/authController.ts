import bcrypt from "bcrypt";
import { db } from "../db"
import jwt from "jsonwebtoken";

interface Token{
    userId: string
}

export const registerNewUser = async (req, res) => {
    const { display_name, username, password } = req.body;
    if (!display_name || display_name === "") {
        return res.status(400).json({ message: "Display name is required" })
    }
    if (!username || username === "") {
        return res.status(400).json({ message: "Username is required" });
    }
    if (!password || password === "") {
        return res.status(400).json({ message: "Password is required" });
    }
    try {
        const hashPassword = await bcrypt.hash(password, 5);
        const user = await db.user.create({
            data: {
                display_name,
                username,
                password: hashPassword
            }
        });

        const accessToken = jwt.sign(
            { userId: user.id },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "900000" }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_TOKEN_SECRET as string,
            { expiresIn: "7d" }
        );

        await db.user.update({
            where: { id: user.id },
            data: {
                refresh_token: refreshToken
            }
        });

        const response = {
            id: user.id,
            display_name: user.display_name,
            username: user.username,
            accessToken
        }

        res.cookie("jwt", refreshToken, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(200).json(response);
    }
    catch (err:any) {
        if (err.code === "P2002") {
            return res.status(403).json({ message: "Username is already in use" });
        }
        res.status(500).json(err);
    }
};

export const loginUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || username === "") {
        return res.status(400).json({ message: "Username is required" });
    }
    if (!password || password === "") {
        return res.status(400).json({ message: "Password is required" });
    }
    try {
        const user = await db.user.findFirst({ where: { username } });
        if (!user) {
            return res.status(404).json({message:"User not found"})
        }
        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({message:"Incorrect password"})
        }
        const accessToken = jwt.sign(
            { userId: user.id },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "900000" }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_TOKEN_SECRET as string,
            { expiresIn: "7d" }
        );
        await db.user.update({
            where: { id: user.id },
            data:{refresh_token:refreshToken}
        })

        const response = {
            id: user.id,
            display_name: user.display_name,
            username: user.username,
            accessToken,
            profile_picture: user?.profile_picture
        }
        res.cookie("jwt", refreshToken, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json(response)
    }
    catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
}

export const handleRefreshToken = async (req, res)=>{
    try {
        const cookies = res.cookies;
        if (!cookies?.jwt) {
            return res.status(400).json({ message: "Unauthorized" });
        }

        const refreshToken = cookies.jwt as string;
        const user = await db.user.findFirst(
            {
                where: { refresh_token: refreshToken }
            });
        if (!user) {
            return res.status(403).json({ message: "Forbidden" });
        }

        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET as string,
            (err, decoded) => {
                const userId = (decoded as Token).userId;
                if (err || user.id.toString() !== userId.toString()) {
                    return res.status(403).json({ message: "Forbidden" })
                }
                const accessToken = jwt.sign(
                    { userId: userId },
                    process.env.ACCESS_TOKEN_SECRET as string,
                    { expiresIn: "900000" }
                )
                res.status(200).json({ accessToken });
            }
        );
    } catch (err) {
        console.log(err);
    }
}

export const handlePersistentLogin = async (req, res) => {
    try {
        const cookies = req.cookies;
        if (!cookies?.jwt) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const refreshToken = cookies.jwt as string;
        const user = await db.user.findFirst({
            where: {
                refresh_token: refreshToken
            }
        });
        if (!user) return res.status(403).json({ message: "Forbidden" });
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET as string,
            (err, decoded) => {
                const userId = (decoded as Token).userId;
                if (err || user.id.toString() !== userId.toString()) {
                    return res.status(403).json({ message: "Forbidden" });
                }
                const accessToken = jwt.sign(
                    { userId: userId },
                    process.env.ACCESS_TOKEN_SECRET as string,
                    { expiresIn: "900000" }
                );
                const response = {
                    id: user.id,
                    display_name: user.display_name,
                    username: user.username,
                    accessToken,
                    profile_picture: user?.profile_picture,
                };
                res.status(200).json(response);
            }
        );
    }
    catch (err) {
        console.error(err);
    }
};

export const handleLogout = async (req, res) => {
    try {
        const cookies = req.cookies;
        if (!cookies?.jwt) return res.status(204);
        const refreshToken = cookies.jwt;
        const user = await db.user.findFirst({
            where: { refresh_token: refreshToken },
        });
        if (!user) {
            res.clearCookie("jwt", {
                httpOnly: true,
                sameSite: "none",
                secure: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            return res.status(204);
        }
        await db.user.update({
        where: { id: user.id },
            data: { refresh_token: "" },
        });
        res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "none",
        secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
    }
};