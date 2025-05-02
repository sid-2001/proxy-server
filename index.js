require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const https = require("https");
// import uuid4 from "uuid4";
const { uuid } = require('uuidv4');
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

const CASHFREE_CLIENT_ID = "TEST10519198243d4682810b3bfed9e089191501";
const CASHFREE_CLIENT_SECRET = "cfsk_ma_test_fe290b8369b63297ce2f22449d3da5fe_c7b74c08";
const CASHFREE_API_URL = "https://sandbox.cashfree.com/pg/orders";

const generateZapperSessionIdApi = async ({ amount, currency }) => {
  try {
    const formattedUuid = uuid(); // Already UUID v4 format

    const payload = {
      merchantOrderId: '462b4933-de01-4e2e-bc4d-481bf5f9c6a8',
      amount: Number(amount.toFixed(2))*100,
      // amount:'1000',
      currencyISOCode: currency,
      notificationUrl: 'https://merchantstore.com/somePaymentNotificationPath',
      returnUrl: 'https://forex-impro-test.netlify.app/transaction/create',
      cancelUrl: 'https://forex-impro-test.netlify.app/transaction/create',

      returnUrl: 'https://forex-impro-test.netlify.app/transaction',

      requestId: uuid(), // Unique ID for request
      origin: 'https://merchantstore.com',
      customFields: [
        {
          key: 'FieldLabel',
          value: 'FieldValue',
        },
      ],
    };

    console.log('🔄 Zapper Payload:', payload);

    const headers = {
      merchantId: '69482',
      merchantSiteId: '88108',
      'x-api-key': '2386a2059c484119b01c446f60b8bf62',
      'Content-Type': 'application/json',
      Authorization: 'Bearer 2386a2059c484119b01c446f60b8bf62',
    };

    console.log(payload)

    const response = await axios.post(
      'https://gateway.zapper.com/api/v3.1/sessions',
      payload,
      { headers }
    );

  

    console.log('✅ Zapper Response:', response);
    return response.data;
  } catch (error) {
  
    console.error('❌ Zapper API Error:', error.response?.data || error.message);
    throw error;
  }
};


app.use("/api", async (req, res) => {
  try {


    console.log("backend url",req.originalUrl)
    // const backendURL = `https://e0ff-220-158-136-242.ngrok-free.app${req.originalUrl}`;
 
    const backendURL = `http://64.227.139.142:9091${req.originalUrl}`;


    if(req.originalUrl=='/api/create-order'){


      try {

        console.log('create oreder')
        const { amount } = req.body;
        
    
        const orderPayload = {
          order_amount: amount,
          order_currency: "INR",
          order_id: `order_${Date.now()}`,
          customer_details: {
            customer_id: "user_12345",
            customer_phone: "8474090589",
          },
          order_meta: {
            return_url:
              "https://forex-impro-test.netlify.app/transaction/create",
          },
        };
    
        const response = await axios.post(CASHFREE_API_URL, orderPayload, {
          headers: {
            "x-client-id": CASHFREE_CLIENT_ID,
            "x-client-secret": CASHFREE_CLIENT_SECRET,
            Accept: "application/json",
            "Content-Type": "application/json",
            "x-api-version": "2025-01-01",
          },
        });
    
     return   res.json(response.data);
      } catch (error) {
        console.error("Error creating Cashfree order:", error.response?.data || error);
       return res.status(500).json({ error: "Failed to create order" });
      }

      
    }



    if(req.originalUrl=='/api/zaphier/generate-uuid'){

      console.log("In th zaphiere requesrt")
     const {amount,currency}= req.body
let data= await generateZapperSessionIdApi({amount,currency})


res.status(200).json(data)
return
    }
  
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



app.post("/cashfree/api/create-order", async (req, res) => {
  try {

    console.log('create oreder')
    const { amount } = req.body;
    console.log("amount")
    console.log( `${process.env.FRONTEND_URL}/transaction/create`)

    const orderPayload = {
      order_amount: amount,
      order_currency: "INR",
      order_id: `order_${Date.now()}`,
      customer_details: {
        customer_id: "user_12345",
        customer_phone: "8474090589",
      },
      order_meta: {
        return_url:
          `${process.env.FRONTEND_URL}/transaction/create`,
      },
    };

    const response = await axios.post(CASHFREE_API_URL, orderPayload, {
      headers: {
        "x-client-id": CASHFREE_CLIENT_ID,
        "x-client-secret": CASHFREE_CLIENT_SECRET,
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-version": "2025-01-01",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error creating Cashfree order:", error.response?.data || error);
    res.status(500).json({ error: "Failed to create order" });
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



app.use("/api3/bsna", async (req, res) => {
  try {
    // Remove "/api/bob" from req.originalUrl
    const newPath = req.originalUrl.replace(/^\/api3\/bsna/, "");

    // Construct new backend URL

    // http://64.227.139.142:8000/api/v1/users/login

  
    const backendURL = `http://64.227.139.142:8000${newPath}`;
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
const url = `https://proxy-server-n7ib.onrender.com`; // Replace with your Render URL
const interval = 30000; // Interval in milliseconds (30 seconds)

//Reloader Function
function reloadWebsite() {
  axios.get(url)
    .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
      console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}

setInterval(reloadWebsite, interval);
