import app from "./src/app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT;

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});