import express, { NextFunction, Request, Response } from "express";
import { body } from "express-validator";
import { CartController } from "../../../controllers/cartController";
import { verifyToken, AuthRequest } from "../../../middleware/auth";

const router = express.Router();
const cartController = new CartController();

router.post(
	"/add",
	verifyToken,
	body("user_id")
		.isInt({ min: 1 })
		.withMessage("User ID must be a positive integer"),
	body("inventory_id")
		.isInt({ min: 1 })
		.withMessage("Inventory ID must be a positive integer"),
	body("quantity")
		.isInt({ min: 1 })
		.withMessage("Quantity must be at least 1"),
	(req: AuthRequest, res: Response, next: NextFunction) =>
		cartController.addToCart(req, res, next)
);

router.get(
	"/:user_id",
	verifyToken,
	(req: AuthRequest, res: Response, next: NextFunction) =>
		cartController.getCart(req, res, next)
);

router.put(
	"/update/:id",
	verifyToken,
	body("quantity")
		.isInt({ min: 1 })
		.withMessage("Quantity must be at least 1"),
	(req: AuthRequest, res: Response, next: NextFunction) =>
		cartController.updateCart(req, res, next)
);

router.delete(
	"/remove/:id",
	verifyToken,
	(req: AuthRequest, res: Response, next: NextFunction) =>
		cartController.removeFromCart(req, res, next)
);

router.delete(
	"/clear/:user_id",
	verifyToken,
	(req: AuthRequest, res: Response, next: NextFunction) =>
		cartController.clearCart(req, res, next)
);

router.get(
	"/:user_id/total",
	verifyToken,
	(req: AuthRequest, res: Response, next: NextFunction) =>
		cartController.getCartTotal(req, res, next)
);

export = router;
