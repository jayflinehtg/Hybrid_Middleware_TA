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
} = require("../controllers/plantController.js");

const { verifyToken } = require("../jwtMiddleware.js");

const optionalAuth = require("../optionalAuth.js");

const router = express.Router();

// 🔹 Rute untuk menambahkan tanaman (butuh autentikasi)
router.post("/add", verifyToken, addPlantData);

// 🔹 Rute untuk mengedit data tanaman herbal (butuh autentikasi)
router.put("/edit/:plantId", verifyToken, editPlant);

// 🔹 Rute untuk mencari tanaman berdasarkan parameter
router.get("/search", searchPlants);

// 🔹 Rute untuk memberi rating pada tanaman (butuh autentikasi)
router.post("/rate", verifyToken, ratePlant);

// 🔹 Rute untuk menyukai tanaman (butuh autentikasi)
router.post("/like", verifyToken, likePlant);

// 🔹 Rute untuk memberi komentar pada tanaman (butuh autentikasi)
router.post("/comment", verifyToken, commentPlant);

// 🔹 Rute untuk memberi menampilkan semua tanaman
router.get("/all", getAllPlants);

// 🔹 Rute untuk mengambil data tanaman berdasarkan ID
router.get("/:plantId", optionalAuth, getPlant);

// 🔹 Rute untuk mendapatkan rating tanaman
router.get("/:plantId/ratings", getPlantRatings);

// 🔹 Rute untuk mengambil komentar tanaman
router.get("/:plantId/comments", getComments);

// 🔹 Rute untuk mendapatkan rata-rata rating tanaman berdasarkan plantId
router.get("/plant/averageRating/:plantId", getAverageRating);

module.exports = router;
