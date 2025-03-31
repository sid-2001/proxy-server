require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 5000;

// Create an Axios instance that ignores SSL certificate validation & sets a timeout
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // Ignore SSL verification
  }),
  timeout: 90000, // Increase timeout to 30 seconds
});

// Middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  if (req.method === "POST" || req.method === "PUT") {
    console.log("Body:", JSON.stringify(req.body, null, 2)); // Log formatted body
  }
  next();
});

// Enable CORS for frontend requests
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json()); // Parse JSON request body

// Middleware to forward all requests to the Spring Boot backend
app.use("/api", async (req, res) => {
  try {
    // const backendURL = `https://13e7-220-158-136-242.ngrok-free.app${req.originalUrl}`;
 
    const backendURL = `http://64.227.139.142:9091${req.originalUrl}`;

  
    // Remove the `host` header to prevent SSL issues
    const headers = { ...req.headers };
    delete headers.host;

    // Forward request to the Spring Boot backend
    const response = await axiosInstance({
      method: req.method, // Forward the same HTTP method (GET, POST, etc.)
      url: backendURL, // Forward the request to the backend
      data: req.body, // Forward the request body
      headers, // Forward necessary headers
    });

    console.log(`Response from backend (${response.status}):`, response.data);

    // Send backend's response to the client
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error forwarding request:", error.message);

    if (error.code === "ECONNRESET") {
      console.error("Connection reset by peer (backend may be down).");
      return res.status(502).json({ error: "Backend server is not responding." });
    }

    if (error.code === "ETIMEDOUT") {
      console.error("Request timed out.");
      return res.status(504).json({ error: "Backend server took too long to respond." });
    }

    if (error.response) {
      console.error("Backend error:", error.response.status, error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({ error: "An unknown error occurred while processing your request." });
  }
});

// app.use("/api/bop", async (req, res) => {
//   try {
//     const backendURL = `http://64.227.139.142:9000/${req.originalUrl}`;

//     // Remove the `host` header to prevent SSL issues
//     const headers = { ...req.headers };
//     delete headers.host;

//     // Forward request to the Spring Boot backend
//     const response = await axiosInstance({
//       method: req.method, // Forward the same HTTP method (GET, POST, etc.)
//       url: backendURL, // Forward the request to the backend
//       data: req.body, // Forward the request body
//       headers, // Forward necessary headers
//     });

//     console.log(`Response from backend (${response.status}):`, response.data);

//     // Send backend's response to the client
//     res.status(response.status).json(response.data);
//   } catch (error) {
//     console.error("Error forwarding request:", error.message);

//     if (error.code === "ECONNRESET") {
//       console.error("Connection reset by peer (backend may be down).");
//       return res.status(502).json({ error: "Backend server is not responding." });
//     }

//     if (error.code === "ETIMEDOUT") {
//       console.error("Request timed out.");
//       return res.status(504).json({ error: "Backend server took too long to respond." });
//     }

//     if (error.response) {
//       console.error("Backend error:", error.response.status, error.response.data);
//       return res.status(error.response.status).json(error.response.data);
//     }

//     res.status(500).json({ error: "An unknown error occurred while processing your request." });
//   }
// });

// Start the server
app.use("/api2/bob", async (req, res) => {
  try {
    // Remove "/api/bob" from req.originalUrl
    const newPath = req.originalUrl.replace(/^\/api2\/bob/, "");

    // Construct new backend URL

  
    const backendURL = `http://64.227.139.142:9000${newPath}`;
console.log("origanl url",backendURL)
    // Remove the `host` header to prevent SSL issues
    const headers = { ...req.headers };
    delete headers.host;

    // Forward request to the Spring Boot backend
    const response = await axios({
      method: req.method, // Forward the same HTTP method (GET, POST, etc.)
      url: backendURL, // New backend URL without "/api/bob"
      data: req.body, // Forward the request body
      headers, // Forward necessary headers
    });

    console.log(`Response from backend (${response.status}):`, response.data);

    // Send backend's response to the client
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error forwarding request:", error.message);

    if (error.code === "ECONNRESET") {
      console.error("Connection reset by peer (backend may be down).");
      return res.status(502).json({ error: "Backend server is not responding." });
    }

    if (error.code === "ETIMEDOUT") {
      console.error("Request timed out.");
      return res.status(504).json({ error: "Backend server took too long to respond." });
    }

    if (error.response) {
      console.error("Backend error:", error.response.status, error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({ error: "An unknown error occurred while processing your request." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${5000}`);
});
