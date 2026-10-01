import express from "express";
import cors from "cors";
import helmet from "helmet";
import adminRoutes from "./routes/adminRoutes";
import eventRoutes from "./routes/eventRoutes";
import mediaRoutes from "./routes/mediaRoutes";
import errorHandler from "./middlewares/errorHandler";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({ message: "API is running" });
});

app.use("/api/admin", adminRoutes);
app.use("/api/event", eventRoutes);
app.use("/api/media", mediaRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

export default app;
