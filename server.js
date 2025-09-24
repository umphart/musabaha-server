const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Admin = require('./models/Admin');
const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created');
}
// Load env vars
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5000",
  "https://musabaha-home-ltd.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const userSubsequentPaymentsRoutes = require("./routes/userSubsequentPayments");
app.use("/api/user-subsequent-payments", userSubsequentPaymentsRoutes);

const plotRoutes = require('./routes/plots');
app.use('/api/plots', plotRoutes);
const subscriptionRoutes = require('./routes/subscriptions');
app.use('/api/subscriptions', subscriptionRoutes);
const userPaymentRoutes = require('./routes/UserPayment');
app.use('/api/user-payments', userPaymentRoutes);



// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// ====================== AUTHENTICATION ENDPOINTS ======================

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields' 
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }
    
    // Check if user already exists
    const userExists = await User.findByEmail(email);
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          token: generateToken(user.id),
        },
        message: 'User registered successfully'
      });
    } else {
      res.status(400).json({ 
        success: false,
        message: 'Invalid user data' 
      });
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration' 
    });
  }
});

// User login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide both email and password' 
      });
    }
    
    // Check for user email
    const user = await User.findByEmail(email);

    if (user && (await User.verifyPassword(password, user.password))) {
      res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          token: generateToken(user.id),
        },
        message: 'Login successful'
      });
    } else {
      res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
});
// Get all users
app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({
      success: true,
      data: users,
      message: 'Users fetched successfully'
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// Admin registration endpoint
app.post('/api/admin/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }
    
    // Check if admin already exists
    const adminExists = await Admin.findByEmail(email);
    if (adminExists) {
      return res.status(400).json({ 
        success: false,
        message: 'Admin already exists with this email' 
      });
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password,
    });

    if (admin) {
      res.status(201).json({
        success: true,
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
        },
        message: 'Admin registered successfully'
      });
    } else {
      res.status(400).json({ 
        success: false,
        message: 'Invalid admin data' 
      });
    }
    
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during admin registration' 
    });
  }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide both email and password' 
      });
    }
    
    // Check for admin email
    const admin = await Admin.findByEmail(email);

    if (admin && (await Admin.verifyPassword(password, admin.password))) {
      res.json({
        success: true,
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          token: generateToken(admin.id),
        },
        message: 'Admin login successful'
      });
    } else {
      res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during admin login' 
    });
  }
});

// User profile endpoint (protected)
app.get('/api/auth/me', async (req, res) => {
  try {
    // Check for token
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }
    
    // Verify token
    const jwtToken = token.split(' ')[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, user not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      message: 'User profile retrieved successfully'
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Admin profile endpoint (protected)
app.get('/api/admin/me', async (req, res) => {
  try {
    // Check for token
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }
    
    // Verify token
    const jwtToken = token.split(' ')[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    
    // Get admin from database
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, admin not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      },
      message: 'Admin profile retrieved successfully'
    });
    
  } catch (error) {
    console.error('Get admin profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ====================== USER MANAGEMENT ENDPOINTS ======================

// Get all users (protected - admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    // Check for token
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }
    
    // Verify token
    const jwtToken = token.split(' ')[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    
    // Verify admin exists
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, admin not found' 
      });
    }

    // Get all users
    const users = await Admin.getAllUsers();
    
    res.json({
      success: true,
      data: users,
      message: 'Users retrieved successfully'
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get user by ID (protected - admin only)
app.get('/api/admin/users/:id', async (req, res) => {
  try {
    // Check for token
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }
    
    // Verify token
    const jwtToken = token.split(' ')[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    
    // Verify admin exists
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, admin not found' 
      });
    }

    // Get user by ID
    const user = await Admin.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Create user (protected - admin only)
app.post('/api/admin/users', async (req, res) => {
  try {
    // Check for token
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }
    
    // Verify token
    const jwtToken = token.split(' ')[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    
    // Verify admin exists
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, admin not found' 
      });
    }

    const {
      name,
      contact,
      plot_taken,
      date_taken,
      initial_deposit,
      price_per_plot,
      payment_schedule,
      total_balance,
      status
    } = req.body;

    // Validation
    if (!name || !contact || !plot_taken || !date_taken || !initial_deposit || 
        !price_per_plot || !payment_schedule || !total_balance) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields' 
      });
    }

    // Calculate total_money_to_pay
    const total_money_to_pay = await Admin.calculateTotalMoneyToPay(plot_taken, price_per_plot);

    // Create user
    const user = await Admin.createUser({
      name,
      contact,
      plot_taken,
      date_taken,
      initial_deposit,
      price_per_plot,
      payment_schedule,
      total_balance,
      total_money_to_pay,
      status: status || 'Active'
    });

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
    
  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ====================== PAYMENT MANAGEMENT ENDPOINTS ======================

// Create payment (protected - admin only)
app.post('/api/admin/payments', async (req, res) => {
  try {
    // Check for token
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }
    
    // Verify token
    const jwtToken = token.split(' ')[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    
    // Verify admin exists
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, admin not found' 
      });
    }

    const {
      user_id,
      amount,
      date,
      note,
      admin: adminName
    } = req.body;

    // Validation
    if (!user_id || !amount || !date) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide user_id, amount, and date' 
      });
    }

    // Create payment
    const payment = await Admin.createPayment({
      user_id,
      amount,
      date,
      note,
      admin: adminName || admin.email
    });

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment created successfully'
    });
    
  } catch (error) {
    console.error('Create payment error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get payments by user ID (protected - admin only)
app.get('/api/admin/payments/user/:id', async (req, res) => {
  try {
    // Check for token
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }
    
    // Verify token
    const jwtToken = token.split(' ')[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    
    // Verify admin exists
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, admin not found' 
      });
    }

    // Get payments by user ID
    const payments = await Admin.getPaymentsByUser(req.params.id);
    
    res.json({
      success: true,
      data: payments,
      message: 'Payments retrieved successfully'
    });
    
  } catch (error) {
    console.error('Get payments error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ====================== HEALTH CHECK ENDPOINT ======================

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Musabaha Homes API server is running!',
    timestamp: new Date().toISOString()
  });
});
// DB connection test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now, current_database() as db');
    res.json({
      success: true,
      time: result.rows[0].now,
      database: result.rows[0].db
    });
  } catch (err) {
    console.error('DB test error:', err);
    res.status(500).json({
      success: false,
      message: 'DB connection failed',
      error: err.message
    });
  }
});
// ====================== ERROR HANDLING MIDDLEWARE ======================

// Handle 404 - This should be AFTER all other routes
app.all('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'API endpoint not found' 
  });
});

// Error handling middleware - This should be AFTER all other routes
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false,
    message: 'Internal server error' 
  });
});

// ====================== SERVER START ======================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

});