const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static frontend UI
app.use(express.static(path.join(__dirname, "..", "public")));

// REST API
app.use("/api", apiRoutes);

// Fallback for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`NDRF RESILIENT-HABITAT GIS DECISION PLATFORM`);
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Command Center Web GIS active.`);
  console.log(`================================================================`);
});
