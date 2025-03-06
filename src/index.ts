import express from "express";
import cors from "cors";
import dotenv from "dotenv-safe";
import cartRoutes from "./ports/rest/routes/cart";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

dotenv.config({
	allowEmptyValues: true,
	path: `.env.${process.env.NODE_ENV || "local"}`,
	example: ".env.example",
});

const port = process.env.PORT || 3009;
app.use("/healthcheck", (req, res) => {
	res.status(200).send("The Cart Service is ALIVE!");
});

app.use("/cart", cartRoutes);

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
