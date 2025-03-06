import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

export interface AuthRequest extends Request {
	user?: { id: string; email: string };
}

export const verifyToken = (
	req: AuthRequest,
	res: Response,
	next: NextFunction
): void => {
	const token = req.headers.authorization?.split(" ")[1];
	if (!token) {
		next();
		return;
	}
	try {
		const decoded = jwt.verify(token, config.jwtSecret) as {
			id: string;
			email: string;
		};
		req.user = decoded;
		next();
	} catch (error) {
		res.status(401).json({ message: "Invalid or expired token" });
	}
};
