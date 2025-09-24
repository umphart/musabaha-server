const express = require("express");
const router = express.Router();
const Subscription = require("../models/Subscription");
const upload = require("../middleware/upload");

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
    try {
      const data = req.body;

      // attach file paths
      if (req.files["passportPhoto"]) {
        data.passportPhoto = req.files["passportPhoto"][0].path;
      }
      if (req.files["identificationFile"]) {
        data.identificationFile = req.files["identificationFile"][0].path;
      }
      if (req.files["utilityBillFile"]) {
        data.utilityBillFile = req.files["utilityBillFile"][0].path;
      }
      if (req.files["signatureFile"]) {
        data.signatureFile = req.files["signatureFile"][0].path;
      }
      console.log("Received subscription with plotId:", data.plotId);

      const subscription = await Subscription.create(data);

      res.json({ success: true, data: subscription });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ success: false, error: error.message });
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
    
    // Assuming you have a method to find by email in your Subscription model
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
// in routes/subscription.js
router.put("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Subscription.updateStatus(id, "rejected");

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error rejecting subscription:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;
