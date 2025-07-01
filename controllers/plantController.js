const { initialize } = require("../utils/blockchain.js");
const { isUserLoggedIn, getUserData } = require("./authController.js");
const {
  addPlantRecordToPublic,
  updatePlantRecordHash,
  initializePublic,
} = require("../utils/publicBlockchain.js");

async function addPlantData(req, res) {
  try {
    const userAddress = req.user.publicKey;

    console.log("Starting plant addition preparation for user:", userAddress);
    console.time("Prepare Add Plant TX Data Time");

    const {
      name,
      namaLatin,
      komposisi,
      manfaat,
      dosis,
      caraPengolahan,
      efekSamping,
      ipfsHash,
    } = req.body;

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk menambahkan tanaman",
      });
    }

    const { contract } = await initialize();

    // Buat data transaksi ABI-encoded untuk addPlant
    const addPlantTxObject = contract.methods.addPlant(
      name,
      namaLatin,
      komposisi,
      manfaat,
      dosis,
      caraPengolahan,
      efekSamping,
      ipfsHash
    );
    const addPlantTransactionDataHex = addPlantTxObject.encodeABI();

    console.timeEnd("Prepare Add Plant TX Data Time");
    console.log(
      `✅ TX data (ABI encoded) disiapkan untuk menambahkan tanaman ${name}`
    );

    res.json({
      success: true,
      message: "Data transaksi untuk menambahkan tanaman telah disiapkan",
      transactionData: addPlantTransactionDataHex,
      plantData: {
        name,
        namaLatin,
        komposisi,
        manfaat,
        dosis,
        caraPengolahan,
        efekSamping,
        ipfsHash,
      },
    });
  } catch (error) {
    console.error("❌ Error dalam persiapan TX data addPlantData:", error);
    res.status(500).json({
      success: false,
      message: `Gagal menyiapkan data transaksi: ${error.message}`,
    });
  }
}

async function confirmAddPlant(req, res) {
  try {
    console.time("Confirm Add Plant Time");
    const { privateTxHash, plantId, userAddress } = req.body;

    if (!privateTxHash || !plantId || !userAddress) {
      return res.status(400).json({
        success: false,
        message: "privateTxHash, plantId, dan userAddress diperlukan",
      });
    }

    try {
      // Dapatkan recordId yang benar sebelum membuat record
      const { contract: publicContract } = await initializePublic();
      const currentRecordCount = await publicContract.methods
        .recordCount()
        .call();
      const recordId = parseInt(currentRecordCount.toString());

      console.log(
        `📡 Membuat record awal di jaringan public dengan recordId: ${recordId}`
      );

      // Buat record awal di jaringan public
      const publicResult = await addPlantRecordToPublic(
        "pending",
        plantId,
        userAddress
      );

      console.log(
        `✅ Record awal berhasil dibuat dengan recordId: ${recordId}`
      );

      // Verifikasi transaksi di Hyperledger Besu dengan retry
      let transactionVerified = false;
      let retryCount = 0;
      const maxRetries = 10;
      const retryDelay = 2000;

      while (!transactionVerified && retryCount < maxRetries) {
        try {
          console.log(
            `🔍 Mencoba verifikasi transaksi (attempt ${
              retryCount + 1
            }/${maxRetries})`
          );

          const { contract, web3 } = await initialize();

          const receipt = await web3.eth.getTransactionReceipt(privateTxHash);

          if (receipt && receipt.status) {
            console.log("✅ Transaksi berhasil diverifikasi!");
            transactionVerified = true;

            // Update record dengan privateTxHash yang benar
            try {
              const updateResult = await updatePlantRecordHash(
                recordId,
                privateTxHash
              );

              console.log(
                "✅ Record berhasil diupdate dengan privateTxHash yang benar"
              );
              console.timeEnd("Confirm Add Plant Time");

              return res.json({
                success: true,
                message:
                  "Tanaman berhasil ditambahkan ke Hyperledger Besu dan record disimpan ke jaringan public",
                besu: {
                  txHash: privateTxHash,
                  plantId: plantId.toString(),
                },
                public: {
                  txHash: publicResult.publicTxHash,
                  updateTxHash: updateResult.updateTxHash,
                  recordId: recordId.toString(),
                  blockNumber: publicResult.blockNumber,
                  gasUsed: publicResult.gasUsed,
                },
              });
            } catch (updateError) {
              console.error("❌ Error updating record hash:", updateError);
              return res.json({
                success: true,
                message:
                  "Tanaman berhasil ditambahkan, record dibuat tapi gagal update hash",
                besu: {
                  txHash: privateTxHash,
                  plantId: plantId.toString(),
                },
                public: {
                  txHash: publicResult.publicTxHash,
                  recordId: recordId.toString(),
                  blockNumber: publicResult.blockNumber,
                  gasUsed: publicResult.gasUsed,
                },
                warning:
                  "Record hash belum diupdate dengan privateTxHash yang benar",
              });
            }
          } else if (receipt && !receipt.status) {
            return res.status(400).json({
              success: false,
              message: "Transaksi gagal dieksekusi di Hyperledger Besu",
            });
          } else {
            console.log(
              `⏳ Transaksi belum ter-mine, menunggu ${retryDelay / 1000} detik`
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            retryCount++;
          }
        } catch (verifyError) {
          console.log(
            `⚠️ Error verifying transaction (attempt ${retryCount + 1}): ${
              verifyError.message
            }`
          );
          retryCount++;

          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      // Jika verifikasi gagal setelah semua retry
      if (!transactionVerified) {
        return res.json({
          success: true,
          message:
            "Record dibuat di jaringan public, tapi verifikasi transaksi private gagal",
          besu: {
            txHash: privateTxHash,
            plantId: plantId.toString(),
          },
          public: {
            txHash: publicResult.publicTxHash,
            recordId: recordId.toString(),
            blockNumber: publicResult.blockNumber,
            gasUsed: publicResult.gasUsed,
          },
          warning:
            "Transaksi private tidak dapat diverifikasi, record hash mungkin tidak akurat",
        });
      }
    } catch (publicError) {
      console.error(
        "❌ Error creating record in public blockchain:",
        publicError
      );
      return res.status(500).json({
        success: false,
        message: `Gagal membuat record di jaringan public: ${publicError.message}`,
      });
    }
  } catch (error) {
    console.error("❌ Error dalam confirmAddPlant:", error);
    res.status(500).json({
      success: false,
      message: `Gagal mengkonfirmasi penambahan tanaman: ${error.message}`,
    });
  }
}

// Fungsi untuk mengedit data tanaman herbal
async function editPlant(req, res) {
  try {
    console.time("Prepare Edit Plant TX Data Time");
    const userAddress = req.user.publicKey;
    const plantIdFromParams = req.params.plantId;

    const {
      name,
      namaLatin,
      komposisi,
      manfaat,
      dosis,
      caraPengolahan,
      efekSamping,
      ipfsHash,
    } = req.body;

    const plantId = plantIdFromParams.toString();

    console.log("Preparing edit TX data for plant ID:", plantId);
    console.log("User address:", userAddress);

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk mengedit tanaman",
      });
    }

    // Inisialisasi kontrak
    const { contract } = await initialize();

    // Cek apakah tanaman yang ingin diedit milik pengguna
    try {
      const plant = await contract.methods.getPlant(plantId).call();

      if (plant.owner.toLowerCase() !== userAddress.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak memiliki hak untuk mengedit tanaman ini",
        });
      }
    } catch (getPlantError) {
      console.error("Error getting plant:", getPlantError);
      return res.status(404).json({
        success: false,
        message: "Tanaman tidak ditemukan atau plantId tidak valid",
      });
    }

    // Buat data transaksi ABI-encoded untuk editPlant
    const editPlantTxObject = contract.methods.editPlant(
      plantId,
      name,
      namaLatin,
      komposisi,
      manfaat,
      dosis,
      caraPengolahan,
      efekSamping,
      ipfsHash
    );
    const editPlantTransactionDataHex = editPlantTxObject.encodeABI();

    console.timeEnd("Prepare Edit Plant TX Data Time");
    console.log(
      `✅ TX data (ABI encoded) disiapkan untuk mengedit tanaman ID ${plantId}`
    );

    res.json({
      success: true,
      message: "Data transaksi untuk mengedit tanaman telah disiapkan",
      transactionData: editPlantTransactionDataHex,
      plantId: plantId,
      plantData: {
        name,
        namaLatin,
        komposisi,
        manfaat,
        dosis,
        caraPengolahan,
        efekSamping,
        ipfsHash,
      },
    });
  } catch (error) {
    console.error("❌ Error dalam persiapan TX data editPlant:", error);
    res.status(500).json({
      success: false,
      message: `Gagal menyiapkan data transaksi edit: ${error.message}`,
    });
  }
}

async function confirmEditPlant(req, res) {
  try {
    console.time("Confirm Edit Plant Time");
    const { privateTxHash, plantId, userAddress } = req.body;

    if (!privateTxHash || !plantId || !userAddress) {
      return res.status(400).json({
        success: false,
        message: "privateTxHash, plantId, dan userAddress diperlukan",
      });
    }

    try {
      // Dapatkan recordId yang benar sebelum membuat record
      const { contract: publicContract } = await initializePublic();
      const currentRecordCount = await publicContract.methods
        .recordCount()
        .call();
      const recordId = parseInt(currentRecordCount.toString());

      console.log(
        `📡 Membuat record edit di jaringan public dengan recordId: ${recordId}`
      );

      // Buat record awal di jaringan public
      const publicResult = await addPlantRecordToPublic(
        "pending",
        plantId,
        userAddress
      );

      console.log(
        `✅ Record edit berhasil dibuat dengan recordId: ${recordId}`
      );

      // Verifikasi transaksi di Hyperledger Besu dengan retry
      let transactionVerified = false;
      let retryCount = 0;
      const maxRetries = 10;
      const retryDelay = 2000;

      while (!transactionVerified && retryCount < maxRetries) {
        try {
          console.log(
            `🔍 Mencoba verifikasi transaksi edit (attempt ${
              retryCount + 1
            }/${maxRetries})`
          );

          const { contract, web3 } = await initialize();

          const receipt = await web3.eth.getTransactionReceipt(privateTxHash);

          if (receipt && receipt.status) {
            console.log("✅ Transaksi edit berhasil diverifikasi!");
            transactionVerified = true;

            // Update record dengan privateTxHash yang benar
            try {
              const updateResult = await updatePlantRecordHash(
                recordId,
                privateTxHash
              );

              console.log(
                "✅ Record edit berhasil diupdate dengan privateTxHash yang benar"
              );
              console.timeEnd("Confirm Edit Plant Time");

              return res.json({
                success: true,
                message:
                  "Tanaman berhasil diedit di Hyperledger Besu dan record disimpan ke jaringan public",
                besu: {
                  txHash: privateTxHash,
                  plantId: plantId.toString(),
                },
                public: {
                  txHash: publicResult.publicTxHash,
                  updateTxHash: updateResult.updateTxHash,
                  recordId: recordId.toString(),
                  blockNumber: publicResult.blockNumber,
                  gasUsed: publicResult.gasUsed,
                },
              });
            } catch (updateError) {
              console.error("❌ Error updating edit record hash:", updateError);
              return res.json({
                success: true,
                message:
                  "Tanaman berhasil diedit, record dibuat tapi gagal update hash",
                besu: {
                  txHash: privateTxHash,
                  plantId: plantId.toString(),
                },
                public: {
                  txHash: publicResult.publicTxHash,
                  recordId: recordId.toString(),
                  blockNumber: publicResult.blockNumber,
                  gasUsed: publicResult.gasUsed,
                },
                warning:
                  "Record hash belum diupdate dengan privateTxHash yang benar",
              });
            }
          } else if (receipt && !receipt.status) {
            return res.status(400).json({
              success: false,
              message: "Transaksi edit gagal dieksekusi di Hyperledger Besu",
            });
          } else {
            console.log(
              `⏳ Transaksi edit belum ter-mine, menunggu ${
                retryDelay / 1000
              } detik`
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            retryCount++;
          }
        } catch (verifyError) {
          console.log(
            `⚠️ Error verifying edit transaction (attempt ${retryCount + 1}): ${
              verifyError.message
            }`
          );
          retryCount++;

          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      // Jika verifikasi gagal setelah semua retry
      if (!transactionVerified) {
        return res.json({
          success: true,
          message:
            "Record edit dibuat di jaringan public, tapi verifikasi transaksi private gagal",
          besu: {
            txHash: privateTxHash,
            plantId: plantId.toString(),
          },
          public: {
            txHash: publicResult.publicTxHash,
            recordId: recordId.toString(),
            blockNumber: publicResult.blockNumber,
            gasUsed: publicResult.gasUsed,
          },
          warning:
            "Transaksi private tidak dapat diverifikasi, record hash mungkin tidak akurat",
        });
      }
    } catch (publicError) {
      console.error(
        "❌ Error creating edit record in public blockchain:",
        publicError
      );
      return res.status(500).json({
        success: false,
        message: `Gagal membuat record edit di jaringan public: ${publicError.message}`,
      });
    }
  } catch (error) {
    console.error("❌ Error dalam confirmEditPlant:", error);
    res.status(500).json({
      success: false,
      message: `Gagal mengkonfirmasi edit tanaman: ${error.message}`,
    });
  }
}

// Fungsi untuk mengambil data tanaman herbal
async function getPlant(req, res) {
  try {
    console.time("Get Plant Time");
    const { plantId } = req.params;

    // Ambil alamat publik user
    const userAddress = req.user?.publicKey;

    const { contract } = await initialize();

    // Mengambil data tanaman herbal dari smart contract
    const plant = await contract.methods.getPlant(plantId).call();

    let isLikedByUser = false;
    if (userAddress) {
      isLikedByUser = await contract.methods
        .isPlantLikedByUser(plantId, userAddress)
        .call();
    }

    // Mengonversi BigInt ke string
    const plantIdString = plantId.toString();
    const ratingTotalString = plant.ratingTotal.toString();
    const ratingCountString = plant.ratingCount.toString();
    const likeCountString = plant.likeCount.toString();

    res.json({
      success: true,
      plant: {
        name: plant.name,
        namaLatin: plant.namaLatin,
        komposisi: plant.komposisi,
        manfaat: plant.manfaat,
        dosis: plant.dosis,
        caraPengolahan: plant.caraPengolahan,
        efekSamping: plant.efekSamping,
        ipfsHash: plant.ipfsHash,
        ratingTotal: ratingTotalString,
        ratingCount: ratingCountString,
        likeCount: likeCountString,
        owner: plant.owner,
        plantId: plantIdString,
        isLikedByUser,
      },
    });
    console.timeEnd("Get Plant Time");
  } catch (error) {
    console.error("❌ Error in getPlant:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function ratePlant(req, res) {
  try {
    console.time("Prepare Rate Plant TX Data Time");
    const userAddress = req.user.publicKey;
    const { plantId, rating } = req.body;

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk memberi rating pada tanaman",
      });
    }

    // Inisialisasi kontrak
    const { contract } = await initialize();

    // Cek apakah pengguna sudah memberikan rating sebelumnya
    const previousRating = await contract.methods
      .plantRatings(plantId, userAddress)
      .call();

    if (previousRating != 0) {
      console.log(`Pengguna sebelumnya memberi rating ${previousRating}`);
    }

    // Buat data transaksi ABI-encoded untuk ratePlant
    const ratePlantTxObject = contract.methods.ratePlant(plantId, rating);
    const ratePlantTransactionDataHex = ratePlantTxObject.encodeABI();

    console.timeEnd("Prepare Rate Plant TX Data Time");
    console.log(
      `✅ TX data (ABI encoded) disiapkan untuk rating tanaman ID ${plantId}`
    );

    res.json({
      success: true,
      message: "Data transaksi untuk rating tanaman telah disiapkan",
      transactionData: ratePlantTransactionDataHex,
      plantId: plantId.toString(),
      rating: rating,
    });
  } catch (error) {
    console.error("❌ Error dalam persiapan TX data ratePlant:", error);
    res.status(500).json({
      success: false,
      message: `Gagal menyiapkan data transaksi rating: ${error.message}`,
    });
  }
}

// Function untuk mendapatkan rata-rata rating dari sebuah tanaman herbal
async function getAverageRating(req, res) {
  try {
    console.time("Get Average Rating Time");
    const { plantId } = req.params;
    const { contract } = await initialize();

    // Mengambil total rating dan jumlah rating yang diberikan pada tanaman
    const plant = await contract.methods.getPlant(plantId).call();

    // Menghitung rata-rata rating dan error handling
    const totalRating = plant.ratingTotal ? Number(plant.ratingTotal) : 0;
    const ratingCount = plant.ratingCount ? Number(plant.ratingCount) : 0;

    // Validasi data
    if (isNaN(totalRating) || isNaN(ratingCount)) {
      throw new Error("Invalid rating data from smart contract");
    }

    // Jika tidak ada rating yang diberikan, rata-rata adalah 0
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    // Pastikan rating dalam range yang valid (0-5)
    const validRating = Math.max(0, Math.min(5, averageRating));

    res.json({
      success: true,
      averageRating: Math.round(validRating * 10) / 10, // Mengonversi rata-rata rating menjadi string
    });
    console.timeEnd("Get Average Rating Time");
  } catch (error) {
    console.error("❌ Error in getAverageRating:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Fungsi untuk mendapatkan ratings tanaman berdasarkan plantId
async function getPlantRatings(req, res) {
  try {
    console.time("Get Plant Rating Time");
    const { plantId } = req.params;
    const { contract } = await initialize();

    // Mengambil data ratings dari smart contract berdasarkan plantId
    const ratings = await contract.methods.getPlantRatings(plantId).call();

    // Mengonversi ratings menjadi array angka
    const ratingsArray = ratings.map((rating) => Number(rating));

    res.json({
      success: true,
      ratings: ratingsArray, // Mengembalikan ratings dalam bentuk array
    });
    console.timeEnd("Get Plant Rating Time");
  } catch (error) {
    console.error("❌ Error in getPlantRatings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function likePlant(req, res) {
  try {
    console.time("Prepare Like Plant TX Data Time");
    const userAddress = req.user.publicKey;
    const { plantId } = req.body;

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk menyukai tanaman",
      });
    }

    const { contract } = await initialize();

    // Buat data transaksi ABI-encoded untuk likePlant
    const likePlantTxObject = contract.methods.likePlant(plantId);
    const likePlantTransactionDataHex = likePlantTxObject.encodeABI();

    console.timeEnd("Prepare Like Plant TX Data Time");
    console.log(
      `✅ TX data (ABI encoded) disiapkan untuk like tanaman ID ${plantId}`
    );

    res.json({
      success: true,
      message: "Data transaksi untuk like tanaman telah disiapkan",
      transactionData: likePlantTransactionDataHex,
      plantId: plantId.toString(),
    });
  } catch (error) {
    console.error("❌ Error dalam persiapan TX data likePlant:", error);
    res.status(500).json({
      success: false,
      message: `Gagal menyiapkan data transaksi like: ${error.message}`,
    });
  }
}

// Function untuk memberikan komentar pada sebuah data tanaman herbal
async function commentPlant(req, res) {
  try {
    console.time("Prepare Comment Plant TX Data Time");
    const userAddress = req.user.publicKey;
    const { plantId, comment } = req.body;

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk memberi komentar pada tanaman",
      });
    }

    const { contract } = await initialize();

    // Buat data transaksi ABI-encoded untuk commentPlant
    const commentPlantTxObject = contract.methods.commentPlant(
      plantId,
      comment
    );
    const commentPlantTransactionDataHex = commentPlantTxObject.encodeABI();

    console.timeEnd("Prepare Comment Plant TX Data Time");
    console.log(
      `✅ TX data (ABI encoded) disiapkan untuk komentar tanaman ID ${plantId}`
    );

    res.json({
      success: true,
      message: "Data transaksi untuk komentar tanaman telah disiapkan",
      transactionData: commentPlantTransactionDataHex,
      plantId: plantId.toString(),
      comment: comment,
    });
  } catch (error) {
    console.error("❌ Error dalam persiapan TX data commentPlant:", error);
    res.status(500).json({
      success: false,
      message: `Gagal menyiapkan data transaksi komentar: ${error.message}`,
    });
  }
}

// Fungsi untuk mengambil semua data tanaman dari smart contract
async function getAllPlants(req, res) {
  try {
    console.time("Get All Plants Time");
    const { contract } = await initialize();

    // Konversi BigInt ke Number dengan aman
    const totalPlantsBigInt = await contract.methods.plantCount().call();
    const totalPlants = parseInt(totalPlantsBigInt.toString());

    // Paginasi
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalPlants);

    // Ambil semua tanaman dengan filter paginasi
    const plants = [];
    for (let i = startIndex; i < endIndex; i++) {
      const plant = await contract.methods.getPlant(i).call();

      plants.push({
        plantId: i.toString(),
        name: plant.name || "Tidak Diketahui",
        namaLatin: plant.namaLatin || "Tidak Diketahui",
        komposisi: plant.komposisi || "Tidak Diketahui",
        manfaat: plant.manfaat || "Tidak Diketahui",
        dosis: plant.dosis || "Tidak Diketahui",
        caraPengolahan: plant.caraPengolahan || "Tidak Diketahui",
        efekSamping: plant.efekSamping || "Tidak Diketahui",
        ipfsHash: plant.ipfsHash || "Tidak Diketahui",
        ratingTotal: (plant.ratingTotal || 0n).toString(),
        ratingCount: (plant.ratingCount || 0n).toString(),
        likeCount: (plant.likeCount || 0n).toString(),
        owner: plant.owner || "Tidak Diketahui",
      });
    }

    res.json({
      success: true,
      total: totalPlants,
      currentPage: page,
      pageSize: limit,
      plants: plants,
    });

    console.timeEnd("Get All Plants Time");
  } catch (error) {
    console.error("❌ Error in getAllPlants:", error);
    res.status(500).json({
      success: false,
      message: error.message.includes("BigInt")
        ? "Invalid data format from blockchain"
        : error.message,
    });
  }
}

// Fungsi untuk mencari tanaman berdasarkan nama, nama latin, komposisi, atau manfaat
async function searchPlants(req, res) {
  try {
    console.time("Search Plant Time");
    const { name, namaLatin, komposisi, manfaat } = req.query;

    // Validasi parameter
    const validatedName = typeof name === "string" ? name : "";
    const validatedNamaLatin = typeof namaLatin === "string" ? namaLatin : "";
    const validatedKomposisi = typeof komposisi === "string" ? komposisi : "";
    const validatedmanfaat = typeof manfaat === "string" ? manfaat : "";

    const { contract } = await initialize();

    // Panggil fungsi searchPlants dari kontrak
    const result = await contract.methods
      .searchPlants(
        validatedName,
        validatedNamaLatin,
        validatedKomposisi,
        validatedmanfaat
      )
      .call();

    // Debug: Cek struktur hasil
    console.log("Raw result from contract:", result);

    // Ekstrak plantIds dan plants dari hasil
    const plantIds = result[0] || [];
    const plants = result[1] || [];

    // Format data untuk response
    const formattedPlants = plants.map((plant, index) => ({
      plantId: plantIds[index]?.toString() || "N/A",
      name: plant.name || "Tidak Diketahui",
      namaLatin: plant.namaLatin || "Tidak Diketahui",
      komposisi: plant.komposisi || "Tidak Diketahui",
      manfaat: plant.manfaat || "Tidak Diketahui",
      dosis: plant.dosis || "Tidak Diketahui",
      caraPengolahan: plant.caraPengolahan || "Tidak Diketahui",
      efekSamping: plant.efekSamping || "Tidak Diketahui",
      ipfsHash: plant.ipfsHash || "Tidak Diketahui",
      ratingTotal: (plant.ratingTotal || 0n)?.toString() || "0",
      ratingCount: (plant.ratingCount || 0n)?.toString() || "0",
      likeCount: (plant.likeCount || 0n)?.toString() || "0",
      owner: plant.owner || "Tidak Diketahui",
    }));

    res.json({ success: true, plants: formattedPlants });

    console.timeEnd("Search Plant Time");
    console.log("✅ Berhasil mencari tanaman");
  } catch (error) {
    console.error("❌ Error in searchPlants:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Function untuk mendapatkan komentar dari sebuah data tanaman herbal
async function getComments(req, res) {
  try {
    console.time("Get Comment Time");
    const { plantId } = req.params;
    const { contract } = await initialize();

    // Mengambil komentar dari smart contract berdasarkan plantId
    const comments = await contract.methods.getPlantComments(plantId).call();

    // Mengonversi BigInt menjadi string untuk setiap nilai yang relevan dalam komentar
    const commentsWithStringValues = await Promise.all(
      comments.map(async (comment) => {
        try {
          const userInfo = await getUserData(comment.user);
          return {
            publicKey: comment.user,
            fullName: userInfo.fullName || "Unknown User",
            comment: comment.comment,
            timestamp: comment.timestamp.toString(),
          };
        } catch (error) {
          // Kalau gagal ambil userInfo kalau user belum register, tetap jalan
          return {
            publicKey: comment.user,
            fullName: "Unknown User",
            comment: comment.comment,
            timestamp: comment.timestamp.toString(),
          };
        }
      })
    );

    res.json({
      success: true,
      comments: commentsWithStringValues,
    });
    console.timeEnd("Get Comment Time");
  } catch (error) {
    console.error("❌ Error in getComments:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  addPlantData,
  editPlant,
  ratePlant,
  getAverageRating,
  getPlantRatings,
  likePlant,
  commentPlant,
  getPlant,
  searchPlants,
  getComments,
  getAllPlants,
  confirmAddPlant,
  confirmEditPlant,
};
