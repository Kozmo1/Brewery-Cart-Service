import { CartController } from "../cartController";
import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import axios from "axios";
import { validationResult, ValidationError } from "express-validator";

// Mock axios for API calls
jest.mock("axios", () => ({
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
}));

// Mock express-validator
jest.mock("express-validator", () => ({
	validationResult: jest.fn(),
}));

// Type the mocked validationResult
const mockedValidationResult =
	validationResult as unknown as jest.MockedFunction<
		() => {
			isEmpty: () => boolean;
			array: () => ValidationError[];
		}
	>;

describe("CartController", () => {
	let cartController: CartController;
	let mockRequest: Partial<AuthRequest>;
	let mockResponse: Partial<Response>;
	let mockNext: jest.Mock;

	// Set up fresh controller and mocks before each test
	beforeEach(() => {
		cartController = new CartController();
		mockRequest = {
			body: {},
			params: {},
			headers: { authorization: "Bearer mock-token" },
			user: { id: 1, email: "test@example.com" },
		};
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		mockNext = jest.fn();

		// Clear mocks to keep tests isolated
		jest.clearAllMocks();
		// Quiet down console logs during tests
		jest.spyOn(console, "error").mockImplementation(() => {});
		jest.spyOn(console, "log").mockImplementation(() => {});
	});

	describe("addToCart", () => {
		// Test adding to cart successfully
		it("should add to cart successfully", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock inventory check
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { stockQuantity: 10 },
			});
			// Mock cart add response
			(axios.post as jest.Mock).mockResolvedValue({
				data: { id: 1, user_id: 1, inventory_id: 1, quantity: 2 },
			});

			mockRequest.body = { user_id: "1", inventory_id: "1", quantity: 2 };

			await cartController.addToCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the API calls
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/inventory/1",
				expect.any(Object)
			);
			expect(axios.post).toHaveBeenCalledWith(
				"http://localhost:5089/api/cart/add",
				{ user_id: "1", inventory_id: "1", quantity: 2 },
				expect.any(Object)
			);
			// Expect the success response
			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.json).toHaveBeenCalledWith({
				id: 1,
				user_id: 1,
				inventory_id: 1,
				quantity: 2,
			});
		});

		// Test validation failure
		it("should return 400 if validation fails", async () => {
			// Mock validation failing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => false,
				array: () => [
					{ msg: "Quantity must be at least 1" } as ValidationError,
				],
			});

			mockRequest.body = { user_id: "1", inventory_id: "1", quantity: 0 };

			await cartController.addToCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				errors: [{ msg: "Quantity must be at least 1" }],
			});
		});

		// Test req.user undefined
		it("should return 403 if req.user is undefined", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			mockRequest.user = undefined;
			mockRequest.body = { user_id: "1", inventory_id: "1", quantity: 2 };

			await cartController.addToCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
			// No API calls should happen
			expect(axios.get).not.toHaveBeenCalled();
		});

		// Test unauthorized user
		it("should return 403 if user is unauthorized", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});

			mockRequest.body = { user_id: "2", inventory_id: "1", quantity: 2 }; // Different user_id

			await cartController.addToCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test insufficient stock
		it("should return 400 if stock is insufficient", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock low stock
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { stockQuantity: 1 },
			});

			mockRequest.body = { user_id: "1", inventory_id: "1", quantity: 2 };

			await cartController.addToCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the stock error
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Insufficient stock",
			});
		});

		// Test API error on inventory check
		it("should handle API error on inventory check", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock inventory check error
			(axios.get as jest.Mock).mockRejectedValue({
				response: {
					status: 404,
					data: { message: "Inventory not found" },
				},
			});

			mockRequest.body = { user_id: "1", inventory_id: "1", quantity: 2 };

			await cartController.addToCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Inventory not found",
				error: undefined,
			});
		});

		// Test API error on cart add
		it("should handle API error on cart add", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock inventory check
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { stockQuantity: 10 },
			});
			// Mock cart add error
			(axios.post as jest.Mock).mockRejectedValue({
				response: { status: 500, data: { message: "Server error" } },
			});

			mockRequest.body = { user_id: "1", inventory_id: "1", quantity: 2 };

			await cartController.addToCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Server error",
				error: undefined,
			});
		});

		// Test error without response
		it("should handle error without response", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock a raw error on inventory check
			(axios.get as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			mockRequest.body = { user_id: "1", inventory_id: "1", quantity: 2 };

			await cartController.addToCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the fallback error response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error adding to cart",
				error: "Network error",
			});
		});
	});

	describe("getCart", () => {
		// Test getting cart successfully
		it("should get cart successfully", async () => {
			// Mock API response
			(axios.get as jest.Mock).mockResolvedValue({
				data: [{ id: 1, user_id: 1, inventory_id: 1, quantity: 2 }],
			});

			mockRequest.params = { user_id: "1" };

			await cartController.getCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the API call
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/cart/1",
				expect.any(Object)
			);
			// Expect the success response
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith([
				{ id: 1, user_id: 1, inventory_id: 1, quantity: 2 },
			]);
		});

		// Test req.user undefined
		it("should return 403 if req.user is undefined", async () => {
			mockRequest.user = undefined;
			mockRequest.params = { user_id: "1" };

			await cartController.getCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
			// No API calls should happen
			expect(axios.get).not.toHaveBeenCalled();
		});

		// Test unauthorized user
		it("should return 403 if user is unauthorized", async () => {
			mockRequest.params = { user_id: "2" }; // Different user_id

			await cartController.getCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test API error
		it("should handle API error", async () => {
			// Mock API error
			(axios.get as jest.Mock).mockRejectedValue({
				response: { status: 404, data: { message: "Cart not found" } },
			});

			mockRequest.params = { user_id: "1" };

			await cartController.getCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Cart not found",
				error: undefined,
			});
		});

		// Test error without response
		it("should handle error without response", async () => {
			// Mock a raw error
			(axios.get as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			mockRequest.params = { user_id: "1" };

			await cartController.getCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the fallback error response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error getting cart",
				error: "Network error",
			});
		});
	});

	describe("updateCart", () => {
		// Test updating cart successfully
		it("should update cart successfully", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock cart item fetch
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({
					data: { user_id: 1, inventory_id: 1 },
				})
				.mockResolvedValueOnce({ data: { stockQuantity: 10 } });
			// Mock update response
			(axios.put as jest.Mock).mockResolvedValue({
				data: { id: 1, quantity: 3 },
			});

			mockRequest.params = { id: "1" };
			mockRequest.body = { quantity: 3 };

			await cartController.updateCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the API calls
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/cart/item/1",
				expect.any(Object)
			);
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/inventory/1",
				expect.any(Object)
			);
			expect(axios.put).toHaveBeenCalledWith(
				"http://localhost:5089/api/cart/update/1",
				{ quantity: 3 },
				expect.any(Object)
			);
			// Expect the success response
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				id: 1,
				quantity: 3,
			});
		});

		// Test validation failure
		it("should return 400 if validation fails", async () => {
			// Mock validation failing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => false,
				array: () => [
					{ msg: "Quantity must be at least 1" } as ValidationError,
				],
			});

			mockRequest.params = { id: "1" };
			mockRequest.body = { quantity: 0 };

			await cartController.updateCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				errors: [{ msg: "Quantity must be at least 1" }],
			});
		});

		// Test req.user undefined
		it("should return 403 if req.user is undefined", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock cart item fetch
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { user_id: 1, inventory_id: 1 },
			});

			mockRequest.user = undefined;
			mockRequest.params = { id: "1" };
			mockRequest.body = { quantity: 3 };

			await cartController.updateCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test unauthorized user
		it("should return 403 if user is unauthorized", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock cart item fetch with different user
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { user_id: 2, inventory_id: 1 },
			});

			mockRequest.params = { id: "1" };
			mockRequest.body = { quantity: 3 };

			await cartController.updateCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test insufficient stock
		it("should return 400 if stock is insufficient", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock cart item and low stock
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({
					data: { user_id: 1, inventory_id: 1 },
				})
				.mockResolvedValueOnce({ data: { stockQuantity: 2 } });

			mockRequest.params = { id: "1" };
			mockRequest.body = { quantity: 3 };

			await cartController.updateCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the stock error
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Insufficient stock",
			});
		});

		// Test API error on cart item fetch
		it("should handle API error on cart item fetch", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock an API error
			(axios.get as jest.Mock).mockRejectedValue({
				response: {
					status: 404,
					data: { message: "Cart item not found" },
				},
			});

			mockRequest.params = { id: "1" };
			mockRequest.body = { quantity: 3 };

			await cartController.updateCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Cart item not found",
				error: undefined,
			});
		});

		// Test API error on inventory fetch
		it("should handle API error on inventory fetch", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock cart item fetch, then inventory error
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({
					data: { user_id: 1, inventory_id: 1 },
				})
				.mockRejectedValueOnce({
					response: {
						status: 404,
						data: { message: "Inventory not found" },
					},
				});

			mockRequest.params = { id: "1" };
			mockRequest.body = { quantity: 3 };

			await cartController.updateCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Inventory not found",
				error: undefined,
			});
		});

		// Test error without response
		it("should handle error without response", async () => {
			// Mock validation passing
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			// Mock a raw error on cart item fetch
			(axios.get as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			mockRequest.params = { id: "1" };
			mockRequest.body = { quantity: 3 };

			await cartController.updateCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the fallback error response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error updating cart",
				error: "Network error",
			});
		});
	});

	describe("removeFromCart", () => {
		// Test removing from cart successfully
		it("should remove from cart successfully", async () => {
			// Mock cart item fetch
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { user_id: 1 },
			});
			// Mock delete response
			(axios.delete as jest.Mock).mockResolvedValue({
				data: { message: "Item removed" },
			});

			mockRequest.params = { id: "1" };

			await cartController.removeFromCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the API calls
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/cart/item/1",
				expect.any(Object)
			);
			expect(axios.delete).toHaveBeenCalledWith(
				"http://localhost:5089/api/cart/remove/1",
				expect.any(Object)
			);
			// Expect the success response
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Item removed",
			});
		});

		// Test req.user undefined
		it("should return 403 if req.user is undefined", async () => {
			// Mock cart item fetch
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { user_id: 1 },
			});

			mockRequest.user = undefined;
			mockRequest.params = { id: "1" };

			await cartController.removeFromCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test unauthorized user
		it("should return 403 if user is unauthorized", async () => {
			// Mock cart item fetch with different user
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { user_id: 2 },
			});

			mockRequest.params = { id: "1" };

			await cartController.removeFromCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test API error on cart item fetch
		it("should handle API error on cart item fetch", async () => {
			// Mock an API error
			(axios.get as jest.Mock).mockRejectedValue({
				response: {
					status: 404,
					data: { message: "Cart item not found" },
				},
			});

			mockRequest.params = { id: "1" };

			await cartController.removeFromCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Cart item not found",
				error: undefined,
			});
		});

		// Test error without response
		it("should handle error without response", async () => {
			// Mock a raw error on cart item fetch
			(axios.get as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			mockRequest.params = { id: "1" };

			await cartController.removeFromCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the fallback error response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error removing from cart",
				error: "Network error",
			});
		});
	});

	describe("clearCart", () => {
		// Test clearing cart successfully
		it("should clear cart successfully", async () => {
			// Mock delete response
			(axios.delete as jest.Mock).mockResolvedValue({
				data: {},
			});

			mockRequest.params = { user_id: "1" };

			await cartController.clearCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the API call
			expect(axios.delete).toHaveBeenCalledWith(
				"http://localhost:5089/api/cart/clear/1",
				expect.any(Object)
			);
			// Expect the success response
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Cart cleared successfully",
			});
		});

		// Test req.user undefined
		it("should return 403 if req.user is undefined", async () => {
			mockRequest.user = undefined;
			mockRequest.params = { user_id: "1" };

			await cartController.clearCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
			// No API calls should happen
			expect(axios.delete).not.toHaveBeenCalled();
		});

		// Test unauthorized user
		it("should return 403 if user is unauthorized", async () => {
			mockRequest.params = { user_id: "2" }; // Different user_id

			await cartController.clearCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test API error
		it("should handle API error", async () => {
			// Mock an API error
			(axios.delete as jest.Mock).mockRejectedValue({
				response: { status: 500, data: { message: "Server error" } },
			});

			mockRequest.params = { user_id: "1" };

			await cartController.clearCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Server error",
				error: undefined,
			});
		});

		// Test error without response
		it("should handle error without response", async () => {
			// Mock a raw error
			(axios.delete as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			mockRequest.params = { user_id: "1" };

			await cartController.clearCart(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the fallback error response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error clearing cart",
				error: "Network error",
			});
		});
	});

	describe("getCartTotal", () => {
		// Test getting cart total successfully
		it("should get cart total successfully", async () => {
			// Mock cart fetch
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({
					data: [
						{ inventory_id: 1, quantity: 2 },
						{ inventory_id: 2, quantity: 1 },
					],
				})
				.mockResolvedValueOnce({ data: { price: 5.99 } }) // First item
				.mockResolvedValueOnce({ data: { price: 3.99 } }); // Second item

			mockRequest.params = { user_id: "1" };

			await cartController.getCartTotal(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the API calls
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/cart/1",
				expect.any(Object)
			);
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/inventory/1",
				expect.any(Object)
			);
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/inventory/2",
				expect.any(Object)
			);
			// Expect the total (2 * 5.99 + 1 * 3.99 = 15.97)
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({ total: 15.97 });
		});

		// Test req.user undefined
		it("should return 403 if req.user is undefined", async () => {
			mockRequest.user = undefined;
			mockRequest.params = { user_id: "1" };

			await cartController.getCartTotal(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
			// No API calls should happen
			expect(axios.get).not.toHaveBeenCalled();
		});

		// Test unauthorized user
		it("should return 403 if user is unauthorized", async () => {
			mockRequest.params = { user_id: "2" }; // Different user_id

			await cartController.getCartTotal(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the auth error
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test API error on cart fetch
		it("should handle API error on cart fetch", async () => {
			// Mock an API error
			(axios.get as jest.Mock).mockRejectedValue({
				response: { status: 404, data: { message: "Cart not found" } },
			});

			mockRequest.params = { user_id: "1" };

			await cartController.getCartTotal(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Cart not found",
				error: undefined,
			});
		});

		// Test API error on inventory fetch
		it("should handle API error on inventory fetch", async () => {
			// Mock cart fetch
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({
					data: [{ inventory_id: 1, quantity: 2 }],
				})
				.mockRejectedValueOnce({
					response: {
						status: 404,
						data: { message: "Inventory not found" },
					},
				});

			mockRequest.params = { user_id: "1" };

			await cartController.getCartTotal(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the error response
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Inventory not found",
				error: undefined,
			});
		});

		// Test error without response
		it("should handle error without response", async () => {
			// Mock a raw error on cart fetch
			(axios.get as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			mockRequest.params = { user_id: "1" };

			await cartController.getCartTotal(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Expect the fallback error response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error calculating cart total",
				error: "Network error",
			});
		});
	});
});
