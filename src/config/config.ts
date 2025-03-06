import dotenv from "dotenv-safe";

dotenv.config({
	allowEmptyValues: true,
	path: `.env.${process.env.NODE_ENV || "local"}`,
	example: ".env.example",
});

const ENVIRONMENT = process.env.NODE_ENV || "development";
const BREWERY_API_URL = process.env.BREWERY_API_URL ?? "http://localhost:5089";
const PORT = process.env.PORT ?? "3009";
const JWT_SECRET = process.env.JWT_SECRET ?? "";

export interface Config {
	environment: string;
	breweryApiUrl: string;
	port: number;
	jwtSecret: string;
}

export const config: Config = {
	environment: ENVIRONMENT,
	breweryApiUrl: BREWERY_API_URL,
	port: parseInt(PORT, 10),
	jwtSecret: JWT_SECRET,
};
