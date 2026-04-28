import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// POST data sensor
app.post("/api/sensor", async (req, res) => {
    const { temperature, humidity } = req.body;

    const data = await prisma.sensor.create({
        data: { temperature, humidity }
    });

    res.json(data);
});

// GET latest
app.get("/api/sensor", async (req, res) => {
    const data = await prisma.sensor.findFirst({
        orderBy: { createdAt: "desc" }
    });

    res.json(data);
});

// GET history
app.get("/api/sensor/history", async (req, res) => {
    const data = await prisma.sensor.findMany({
        orderBy: { createdAt: "desc" }
    });

    res.json(data);
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});