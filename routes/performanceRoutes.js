const express = require("express");
const {
  // Auth performance functions
  performanceRegisterUser,
  performanceLoginUser,
  performanceLogoutUser,

  // Plant performance functions
  performanceAddPlant,
  performanceEditPlant,
  performanceRatePlant,
  performanceLikePlant,
  performanceCommentPlant,

  // Read operations functions
  performanceSearchPlants,
  performanceGetAllPlants,
  performanceGetPlant,
  performanceGetPlantRatings,
  performanceGetComments,
  performanceGetAverageRating,
  performanceGetPlantRecord,
  performanceGetAllPlantRecord,
  performanceGetPlantTransactionHistory,
  performanceGetRecordCount,

  performanceAddFileToIPFS,
  performanceGetFileFromIPFS,
} = require("../controllers/performanceController.js");

const {
  verifyTransactionInBesu,
} = require("../controllers/performanceController.js");

const router = express.Router();

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Hanya file gambar yang diperbolehkan!"), false);
    }
    cb(null, true);
  },
});

// ==================== AUTH PERFORMANCE ROUTES ====================
// Performance testing untuk register user
router.post("/auth/register", performanceRegisterUser);

// Performance testing untuk login user
router.post("/auth/login", performanceLoginUser);

// Performance testing untuk logout user
router.post("/auth/logout", performanceLogoutUser);

// ==================== PLANT PERFORMANCE ROUTES ====================
// Performance testing untuk add plant
router.post("/plant/add", performanceAddPlant);

// Performance testing untuk edit plant
router.put("/plant/edit/:plantId", performanceEditPlant);

// Performance testing untuk rate plant
router.post("/plant/rate", performanceRatePlant);

// Performance testing untuk like plant
router.post("/plant/like", performanceLikePlant);

// Performance testing untuk comment plant
router.post("/plant/comment", performanceCommentPlant);

// Performance testing untuk add gambar ke IPFS
router.post("/ipfs/upload", upload.single("file"), performanceAddFileToIPFS);

// Performance testing untuk get gambar dari IPFS
router.post("/ipfs/getFile/:cid", performanceGetFileFromIPFS);

// ==================== READ OPERATIONS PERFORMANCE ROUTES ====================
// Performance testing untuk search plants
router.post("/plant/search", performanceSearchPlants);

// Performance testing untuk get all plants
router.post("/plant/getAll", performanceGetAllPlants);

// Performance testing untuk get average rating
router.post("/plant/averageRating/:plantId", performanceGetAverageRating);

// Performance testing untuk get plant ratings
router.post("/plant/ratings/:plantId", performanceGetPlantRatings);

// Performance testing untuk get comments
router.post("/plant/comments/:plantId", performanceGetComments);

// Performance testing untuk get single plant
router.post("/plant/:plantId", performanceGetPlant);

// Performance testing untuk get all plant records
router.post("/record/getAll", performanceGetAllPlantRecord);

// Performance testing untuk get record count
router.post("/record/count", performanceGetRecordCount);

// Performance testing untuk get plant transaction history
router.post("/record/history/:plantId", performanceGetPlantTransactionHistory);

// Performance testing untuk get plant record
router.post("/record/:recordIndex", performanceGetPlantRecord);

router.post("/hybrid/add-plant", async (req, res) => {
  try {
    req.body.testHybrid = true;
    await performanceAddPlant(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Hybrid add plant test failed: ${error.message}`,
    });
  }
});

router.put("/hybrid/edit-plant/:plantId", async (req, res) => {
  try {
    req.body.testHybrid = true;
    await performanceEditPlant(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Hybrid edit plant test failed: ${error.message}`,
    });
  }
});

router.post("/hybrid/verify/:txHash", async (req, res) => {
  try {
    const { txHash } = req.params;
    const { eventSignature } = req.body;

    if (!eventSignature) {
      return res.status(400).json({
        success: false,
        message: "eventSignature is required",
      });
    }

    const verification = await verifyTransactionInBesu(txHash, eventSignature);

    res.json({
      success: true,
      message: "Transaction verified successfully",
      verification: verification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== UTILITY ROUTES ====================
// Get test accounts info
router.get("/test-accounts", (req, res) => {
  const { TEST_ACCOUNTS } = require("../utils/testAccounts.js");
  const accounts = TEST_ACCOUNTS.map((acc) => ({
    id: acc.id,
    fullName: acc.fullName,
  }));

  res.json({
    success: true,
    message: "Available test accounts for performance testing",
    testAccounts: accounts,
  });
});

module.exports = router;
