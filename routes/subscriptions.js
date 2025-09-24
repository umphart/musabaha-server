const express = require("express");
const router = express.Router();
const Subscription = require("../models/Subscription");
const upload = require("../middleware/upload");
const pool = require("../config/database"); // ADD THIS IMPORT

// Create subscription (with files)
router.post(
  "/",
  upload.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "identificationFile", maxCount: 1 },
    { name: "utilityBillFile", maxCount: 1 },
    { name: "signatureFile", maxCount: 1 },
  ]),
  async (req, res) => {
    const client = await pool.connect(); // Get a client for transaction
    
    try {
      await client.query('BEGIN'); // Start transaction

      const data = req.body;
      console.log("Received subscription with plotId:", data.plotId);

      // Attach file paths
      if (req.files["passportPhoto"]) {
        data.passportPhoto = req.files["passportPhoto"][0].path;
      }
      if (req.files["identificationFile"]) {
        data.identificationFile = req.files["identificationFile"][0].path;
      } // FIXED: Removed extra closing brace
      if (req.files["utilityBillFile"]) {
        data.utilityBillFile = req.files["utilityBillFile"][0].path;
      }
      if (req.files["signatureFile"]) {
        data.signatureFile = req.files["signatureFile"][0].path;
      }

      // Create subscription using the model
      const subscription = await Subscription.create(data);

      // Update plot status to "Reserved" if plotId exists
      if (data.plotId) {
        const updatePlotQuery = `
          UPDATE plots 
          SET status = 'Reserved', 
              reserved_at = NOW(),
              reserved_by = $1 
          WHERE id = $2
          RETURNING *;
        `;
        
        const plotResult = await client.query(updatePlotQuery, [subscription.id, data.plotId]);
        
        if (plotResult.rows.length === 0) {
          throw new Error('Plot not found');
        }
        
        console.log(`Plot ${data.plotId} status updated to Reserved`);
      }

      await client.query('COMMIT'); // Commit transaction
      
      res.json({ success: true, data: subscription });
    } catch (error) {
      await client.query('ROLLBACK'); // Rollback on error
      console.error("Error creating subscription:", error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release(); // Release client back to pool
    }
  }
);

// ✅ Get ALL subscriptions (for admin)
router.get("/all", async (req, res) => {
  try {
    const subscriptions = await Subscription.getAll();
    res.json({ success: true, data: subscriptions });
  } catch (error) {
    console.error("Error fetching all subscriptions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get subscriptions by email
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: "Email parameter is required" 
      });
    }
    
    const subscriptions = await Subscription.findByEmail(email);
    
    res.json({ 
      success: true, 
      data: subscriptions 
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Approve a subscription
router.put("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Subscription.updateStatus(id, "approved");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error approving subscription:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject a subscription
router.put("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Subscription.updateStatus(id, "rejected");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error rejecting subscription:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update plot status for a subscription
router.put('/:id/update-plot-status', async (req, res) => {
  const client = await pool.connect(); // Get client for transaction
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { status } = req.body;

    // First get the subscription to find the plot_id
    const subscriptionQuery = 'SELECT plot_id FROM subscriptions WHERE id = $1';
    const subscriptionResult = await client.query(subscriptionQuery, [id]);
    
    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }
    
    const plotId = subscriptionResult.rows[0].plot_id;
    
    if (!plotId) {
      return res.status(400).json({ success: false, message: "No plot associated with this subscription" });
    }

    // Update plot status
    const updatePlotQuery = `
      UPDATE plots 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await client.query(updatePlotQuery, [status, plotId]);
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Plot status updated to ${status}`,
      updatedPlot: result.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating plot status:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;