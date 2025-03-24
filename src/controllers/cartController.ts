import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import axios from "axios";
import { config } from "../config/config";
import { AuthRequest } from "../middleware/auth";

export class CartController {
	private readonly breweryApiUrl = config.breweryApiUrl;

	async addToCart(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		console.log("req.user:", req.user);
		console.log("req.body:", req.body);
		const userIdFromBody = parseInt(req.body.user_id, 10);
		if (!req.user || req.user.id !== userIdFromBody) {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		try {
			const inventoryResponse = await axios.get(
				`${this.breweryApiUrl}/api/inventory/${req.body.inventory_id}`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			if (inventoryResponse.data.stockQuantity < req.body.quantity) {
				res.status(400).json({ message: "Insufficient stock" });
				return;
			}
			const response = await axios.post(
				`${this.breweryApiUrl}/api/cart/add`,
				req.body,
				{ headers: { Authorization: req.headers.authorization } }
			);
			res.status(201).json(response.data);
		} catch (error: any) {
			console.error(
				"Error adding to cart:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message || "Error adding to cart",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async getCart(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		if (req.user?.id.toString() !== req.params.user_id) {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		try {
			const response = await axios.get(
				`${this.breweryApiUrl}/api/cart/${req.params.user_id}`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			res.status(200).json(response.data);
		} catch (error: any) {
			console.error(
				"Error getting cart:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message: error.response?.data?.message || "Error getting cart",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async updateCart(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		try {
			console.log(`Fetching cart item with id: ${req.params.id}`);
			const cartItemResponse = await axios.get(
				`${this.breweryApiUrl}/api/cart/item/${req.params.id}`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			console.log("Cart item response:", cartItemResponse.data);
			if (
				req.user?.id.toString() !==
				cartItemResponse.data.user_id.toString()
			) {
				res.status(403).json({ message: "Unauthorized" });
				return;
			}
			const inventoryResponse = await axios.get(
				`${this.breweryApiUrl}/api/inventory/${cartItemResponse.data.inventory_id}`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			if (inventoryResponse.data.stockQuantity < req.body.quantity) {
				res.status(400).json({ message: "Insufficient stock" });
				return;
			}
			console.log(
				`Updating cart item with id: ${req.params.id}, new quantity: ${req.body.quantity}`
			);
			const response = await axios.put(
				`${this.breweryApiUrl}/api/cart/update/${req.params.id}`,
				req.body,
				{ headers: { Authorization: req.headers.authorization } }
			);
			res.status(200).json(response.data);
		} catch (error: any) {
			console.error(
				"Error updating cart:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message: error.response?.data?.message || "Error updating cart",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async removeFromCart(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const cartItemResponse = await axios.get(
				`${this.breweryApiUrl}/api/cart/item/${req.params.id}`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			if (
				req.user?.id.toString() !==
				cartItemResponse.data.user_id.toString()
			) {
				res.status(403).json({ message: "Unauthorized" });
				return;
			}
			const response = await axios.delete(
				`${this.breweryApiUrl}/api/cart/remove/${req.params.id}`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			res.status(200).json(response.data);
		} catch (error: any) {
			console.error(
				"Error removing from cart:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message || "Error removing from cart",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async clearCart(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		if (req.user?.id.toString() !== req.params.user_id) {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		try {
			const response = await axios.delete(
				`${this.breweryApiUrl}/api/cart/clear/${req.params.user_id}`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			res.status(200).json({ message: "Cart cleared successfully" });
		} catch (error: any) {
			console.error(
				"Error clearing cart:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message: error.response?.data?.message || "Error clearing cart",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async getCartTotal(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		console.log("req.user:", req.user);
		console.log("req.params.user_id:", req.params.user_id);
		console.log(
			"Comparison:",
			req.user?.id.toString(),
			"vs",
			req.params.user_id
		);
		if (req.user?.id.toString() !== req.params.user_id) {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}
		try {
			const cartResponse = await axios.get(
				`${this.breweryApiUrl}/api/cart/${req.params.user_id}`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			const cartItems = cartResponse.data;
			let total = 0;
			for (const item of cartItems) {
				const inventoryResponse = await axios.get(
					`${this.breweryApiUrl}/api/inventory/${item.inventory_id}`,
					{ headers: { Authorization: req.headers.authorization } }
				);
				total += inventoryResponse.data.price * item.quantity;
			}
			res.status(200).json({ total });
		} catch (error: any) {
			console.error(
				"Error calculating cart total:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message ||
					"Error calculating cart total",
				error: error.response?.data?.errors || error.message,
			});
		}
	}
}
