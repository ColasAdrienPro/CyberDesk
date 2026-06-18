import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Configure l'adapter MariaDB utilise par Prisma 7. Les valeurs sensibles
// sont lues depuis .env pour eviter de les coder en dur.
const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

// Exporte une instance Prisma partagee par les routers et middlewares.
// Cela centralise l'acces base de donnees dans tout le projet.
export const prisma = new PrismaClient({ adapter });
