const express = require("express");
const {
  addPlantData,
  editPlant,
  ratePlant,
  likePlant,
  commentPlant,
  getPlant,
  getPlantRatings,
  searchPlants,
  getComments,
  getAllPlants,
  getAverageRating,
  confirmAddPlant,
  confirmEditPlant,
} = require("../controllers/plantController.js");

const { verifyToken, requireFreshToken } = require("../jwtMiddleware.js");

const optionalAuth = require("../optionalAuth.js");

const router = express.Router();

// 🔹 Rute untuk menambahkan tanaman
router.post("/add", verifyToken, requireFreshToken, addPlantData);

// 🔹 Rute untuk mengedit data tanaman herbal
router.put("/edit/:plantId", verifyToken, requireFreshToken, editPlant);

// 🔹 Rute untuk mencari tanaman berdasarkan parameter
router.get("/search", searchPlants);

// 🔹 Rute untuk memberi rating pada tanaman
router.post("/rate", verifyToken, requireFreshToken, ratePlant);

// 🔹 Rute untuk menyukai tanaman
router.post("/like", verifyToken, requireFreshToken, likePlant);

// 🔹 Rute untuk memberi komentar pada tanaman
router.post("/comment", verifyToken, requireFreshToken, commentPlant);

// 🔹 Rute untuk memberi menampilkan semua tanaman
router.get("/all", getAllPlants);

// 🔹 Rute untuk mengambil data tanaman berdasarkan ID
router.get("/:plantId", optionalAuth, getPlant);

// 🔹 Rute untuk mendapatkan rating tanaman
router.get("/:plantId/ratings", getPlantRatings);

// 🔹 Rute untuk mengambil komentar tanaman
router.get("/:plantId/comments", getComments);

// 🔹 Rute untuk mendapatkan rata-rata rating tanaman berdasarkan plantId
router.get("/averageRating/:plantId", getAverageRating);

// Route untuk testing - cek record di jaringan public
router.get("/public/record/:recordId", async (req, res) => {
  try {
    const {
      getPlantRecordFromPublic,
    } = require("../utils/publicBlockchain.js");
    const { recordId } = req.params;

    const record = await getPlantRecordFromPublic(recordId);
    res.json({
      success: true,
      record: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// 🔹 Rute untuk konfirmasi penambahan tanaman
router.post("/confirm-add", confirmAddPlant);

// 🔹 Rute untuk konfirmasi edit tanaman
router.post("/confirm-edit", confirmEditPlant);

// Route untuk mendapatkan semua record di jaringan public
router.get("/public/records", async (req, res) => {
  try {
    const { getAllPublicRecords } = require("../utils/publicBlockchain.js");
    const records = await getAllPublicRecords();
    res.json({
      success: true,
      total: records.length,
      records: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Route untuk mendapatkan transaction history berdasarkan plantId dengan pagination
router.get("/public/history/:plantId", async (req, res) => {
  try {
    console.log("🔍 [DEBUG] Route /public/history/:plantId called");
    console.log("🔍 [DEBUG] plantId:", req.params.plantId);
    console.log("🔍 [DEBUG] page:", req.query.page);
    console.log("🔍 [DEBUG] limit:", req.query.limit);

    const {
      getPlantTransactionHistory,
    } = require("../utils/publicBlockchain.js");
    
    const { plantId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!plantId || isNaN(parseInt(plantId))) {
      console.log("❌ [DEBUG] Invalid plantId");
      return res.status(400).json({
        success: false,
        message: "Plant ID tidak valid",
      });
    }

    console.log("🔍 [DEBUG] Calling getPlantTransactionHistory...");
    const result = await getPlantTransactionHistory(plantId, page, limit);
    console.log("🔍 [DEBUG] Result from getPlantTransactionHistory:", result);

    // Format timestamp menjadi readable format
    const formattedRecords = result.records.map((record) => {
      const date = new Date(parseInt(record.timestamp) * 1000);
      const formattedDate =
        date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
        ", " +
        date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

      return {
        ...record,
        formattedTimestamp: formattedDate,
      };
    });

    const response = {
      success: true,
      plantId: plantId,
      data: formattedRecords,
      pagination: result.pagination,
    };

    console.log("🔍 [DEBUG] Final response:", response);
    console.log("🔍 [DEBUG] Number of records returned:", formattedRecords.length);

    res.json(response);
  } catch (error) {
    console.error("❌ [DEBUG] Error in route:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Route untuk mendapatkan total record count di jaringan public
router.get("/public/count", async (req, res) => {
  try {
    const { getRecordCount } = require("../utils/publicBlockchain.js");

    const count = await getRecordCount();
    res.json({
      success: true,
      totalRecords: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
