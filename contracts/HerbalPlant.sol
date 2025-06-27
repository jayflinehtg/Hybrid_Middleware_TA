// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HerbalPlant {
    struct Plant {
        string name;
        string namaLatin;
        string komposisi;
        string manfaat;
        string dosis;
        string caraPengolahan;
        string efekSamping;
        string ipfsHash;
        uint ratingTotal;
        uint ratingCount;
        uint likeCount;
        address owner;
    }

    struct User {
        string fullName;
        string hashPass;
        bool isRegistered;
        bool isLoggedIn;
    }

    struct Comment {
        address user;
        string comment;
        uint timestamp;
    }

    mapping(uint => Plant) public plants;
    mapping(address => User) private usersByPublicKey;
    mapping(uint => Comment[]) public plantComments;
    mapping(uint => address[]) public plantRatingUsers;
    mapping(uint => mapping(address => uint)) public plantRatings;
    mapping(uint => mapping(address => bool)) public plantLikes;

    uint public plantCount;
    address[] private registeredUsers;

    event PlantAdded(uint plantId, string name, address owner);
    event PlantRated(uint plantId, address user, uint rating);
    event PlantLiked(uint plantId, address user);
    event UserRegistered(address indexed publicKey, string fullName);
    event UserLoggedIn(address indexed publicKey);
    event UserLoggedOut(address indexed publicKey);
    event PlantCommented(uint plantId, address user, string comment);

    modifier onlyActiveUser() {
        require(usersByPublicKey[msg.sender].isRegistered, "Anda harus terdaftar");
        require(usersByPublicKey[msg.sender].isLoggedIn, "Anda harus login");
        _;
    }

    // 🔹 Mendaftarkan user dengan menyimpan password hash di Blockchain
    function registerUser(
        string memory fullName,
        string memory hashPass
    ) public {
        require(bytes(fullName).length > 0, "Nama tidak boleh kosong");
        require(bytes(hashPass).length > 0, "Password hash tidak valid");
        require(!usersByPublicKey[msg.sender].isRegistered, "Akun sudah terdaftar");

        usersByPublicKey[msg.sender] = User({
            fullName: fullName,
            hashPass: hashPass,
            isRegistered: true,
            isLoggedIn: false
        });

        registeredUsers.push(msg.sender);

        emit UserRegistered(msg.sender, fullName);
    }

    // 🔹 Login menggunakan password hash
    function login() public {
        require(usersByPublicKey[msg.sender].isRegistered, "Pengguna tidak terdaftar");
        require(!usersByPublicKey[msg.sender].isLoggedIn, "Sudah login");

        usersByPublicKey[msg.sender].isLoggedIn = true;
        emit UserLoggedIn(msg.sender);
    }

    // 🔹 Getter untuk mengambil data user berdasarkan address
    function getUserInfo(address userAddress) public view returns (
        string memory fullName,
        string memory hashPass,
        bool isRegistered,
        bool isLoggedIn
    ) {
        User memory user = usersByPublicKey[userAddress];
        return (
            user.fullName,
            user.hashPass,
            user.isRegistered,
            user.isLoggedIn
        );
    }

    // 🔹 Logout user
    function logout() public {
        require(usersByPublicKey[msg.sender].isLoggedIn, "Belum login");
        
        usersByPublicKey[msg.sender].isLoggedIn = false;
        emit UserLoggedOut(msg.sender);
    }

    // 🔹 Menambahkan tanaman herbal
    function addPlant(
        string memory name,
        string memory namaLatin,
        string memory komposisi,
        string memory manfaat,
        string memory dosis,
        string memory caraPengolahan,
        string memory efekSamping,
        string memory ipfsHash
    ) public onlyActiveUser {
        require(bytes(name).length > 0, "Nama tanaman diperlukan");

        uint currentId = plantCount;

        plants[currentId] = Plant({
            name: name,
            namaLatin: namaLatin,
            komposisi: komposisi,
            manfaat: manfaat,
            dosis: dosis,
            caraPengolahan: caraPengolahan,
            efekSamping: efekSamping,
            ipfsHash: ipfsHash,
            ratingTotal: 0,
            ratingCount: 0,
            likeCount: 0,
            owner: msg.sender
        });

        emit PlantAdded(currentId, name, msg.sender);
        plantCount++;
    }

    // 🔹 Mengedit tanaman herbal
    function editPlant(
        uint plantId,
        string memory name,
        string memory namaLatin,
        string memory komposisi,
        string memory manfaat,
        string memory dosis,
        string memory caraPengolahan,
        string memory efekSamping,
        string memory ipfsHash
    ) public onlyActiveUser {
        // Pastikan yang mengedit adalah pemilik tanaman
        require(plants[plantId].owner == msg.sender, "Hanya pemilik tanaman yang dapat mengedit");

        // Memperbarui data tanaman
        plants[plantId].name = name;
        plants[plantId].namaLatin = namaLatin;
        plants[plantId].komposisi = komposisi;
        plants[plantId].manfaat = manfaat;
        plants[plantId].dosis = dosis;
        plants[plantId].caraPengolahan = caraPengolahan;
        plants[plantId].efekSamping = efekSamping;
        plants[plantId].ipfsHash = ipfsHash;

        emit PlantAdded(plantId, name, msg.sender);
    }

    // 🔹 Memberi rating tanaman herbal (1-5)
    function ratePlant(uint plantId, uint rating) public onlyActiveUser {
    require(plants[plantId].owner != address(0), "Tanaman tidak ditemukan");
    require(rating >= 1 && rating <= 5, "Rating harus antara 1 hingga 5");

    uint previousRating = plantRatings[plantId][msg.sender];

    if (previousRating == 0) {
        plants[plantId].ratingTotal += rating;
        plants[plantId].ratingCount++;
        plantRatingUsers[plantId].push(msg.sender);
    } else {
        plants[plantId].ratingTotal -= previousRating;
        plants[plantId].ratingTotal += rating;
    }

    plantRatings[plantId][msg.sender] = rating;

    emit PlantRated(plantId, msg.sender, rating);
    }

    // 🔹 Fungsi untuk mendapatkan rata-rata rating dari sebuah tanaman herbal
    function getAverageRating(uint plantId) public view returns (uint) {
        Plant storage plant = plants[plantId];
        require(plant.ratingCount > 0, "Tidak ada rating untuk tanaman ini");
        
        uint averageRating = plant.ratingTotal / plant.ratingCount;
        return averageRating;
    }

    // 🔹 Fungsi untuk mendapatkan semua rating dari tanaman
    function getPlantRatings(uint plantId) public view returns (uint[] memory) {
        uint ratingCount = plants[plantId].ratingCount;
        uint[] memory ratings = new uint[](ratingCount);

        for (uint i = 0; i < plantRatingUsers[plantId].length; i++) {
            address user = plantRatingUsers[plantId][i];
            ratings[i] = plantRatings[plantId][user];
        }

        return ratings;
    }

    // 🔹 Menyukai tanaman herbal
    function likePlant(uint plantId) public onlyActiveUser {
        require(plants[plantId].owner != address(0), "Tanaman tidak ditemukan");

        // Jika pengguna sudah memberi like sebelumnya
        if (plantLikes[plantId][msg.sender]) {
            plantLikes[plantId][msg.sender] = false;
            plants[plantId].likeCount--;
            emit PlantLiked(plantId, msg.sender);
        } else {
            // Jika belum memberi like
            plantLikes[plantId][msg.sender] = true;
            plants[plantId].likeCount++;
            emit PlantLiked(plantId, msg.sender);
        }
    }

    // 🔹 Mengecek apakah user sudah like tanaman tertentu
    function isPlantLikedByUser(uint plantId, address user) public view returns (bool) {
        return plantLikes[plantId][user];
    }

    // 🔹 Memberikan komentar/testimoni pada tanaman
    function commentPlant(uint plantId, string memory comment) public onlyActiveUser {
        require(plants[plantId].owner != address(0), "Tanaman tidak ditemukan");

        Comment memory newComment = Comment({
            user: msg.sender,
            comment: comment,
            timestamp: block.timestamp
        });

        plantComments[plantId].push(newComment);

        emit PlantCommented(plantId, msg.sender, comment);
    }

    // 🔹 Mengambil detail tanaman herbal (Semua informasi dalam satu fungsi)
    function getPlant(uint plantId) public view returns (
        string memory name,
        string memory namaLatin,
        string memory komposisi,
        string memory manfaat,
        string memory dosis,
        string memory caraPengolahan,
        string memory efekSamping,
        string memory ipfsHash,
        uint ratingTotal,
        uint ratingCount,
        uint likeCount,
        address owner
    ) {
        require(plants[plantId].owner != address(0), "Tanaman tidak ditemukan");
        Plant storage plant = plants[plantId];

        return (
            plant.name,
            plant.namaLatin,
            plant.komposisi,
            plant.manfaat,
            plant.dosis,
            plant.caraPengolahan,
            plant.efekSamping,
            plant.ipfsHash,
            plant.ratingTotal,
            plant.ratingCount,
            plant.likeCount,
            plant.owner
        );
    }

    // 🔹 Fungsi untuk mencari tanaman berdasarkan nama, nama latin, komposisi, atau manfaat
    function searchPlants(
    string memory name, 
    string memory namaLatin, 
    string memory komposisi, 
    string memory manfaat
    ) 
    public view
    returns (uint[] memory, Plant[] memory)
    {
    uint plantIndex = 0;
    uint[] memory idResults = new uint[](plantCount);
    Plant[] memory plantResults = new Plant[](plantCount);

    for (uint i = 0; i < plantCount; i++) {
        Plant storage currentPlant = plants[i];
        bool isMatch = false;

        if (bytes(name).length > 0 && contains(currentPlant.name, name)) isMatch = true;
        if (bytes(namaLatin).length > 0 && contains(currentPlant.namaLatin, namaLatin)) isMatch = true;
        if (bytes(komposisi).length > 0 && contains(currentPlant.komposisi, komposisi)) isMatch = true;
        if (bytes(manfaat).length > 0 && contains(currentPlant.manfaat, manfaat)) isMatch = true;

        if (isMatch) {
            idResults[plantIndex] = i;
            plantResults[plantIndex] = currentPlant;
            plantIndex++;
        }
    }

    uint[] memory finalIds = new uint[](plantIndex);
    Plant[] memory finalPlants = new Plant[](plantIndex);

    for (uint i = 0; i < plantIndex; i++) {
        finalIds[i] = idResults[i];
        finalPlants[i] = plantResults[i];
    }

    return (finalIds, finalPlants);
    }

    // 🔹 Fungsi untuk mengecek apakah sebuah string mengandung substring tertentu (case-insensitive)
    function contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory haystackBytes = bytes(haystack);
        bytes memory needleBytes = bytes(needle);
        
        // Handle kasus khusus: needle kosong selalu dianggap ada
        if (needleBytes.length == 0) return true;
        
        // Handle kasus dimana needle lebih panjang dari haystack
        if (needleBytes.length > haystackBytes.length) return false;

        // Konversi ke lowercase sekali saja di awal
        bytes memory haystackLower = bytes(toLowerCase(haystack));
        bytes memory needleLower = bytes(toLowerCase(needle));

        // Optimasi: Batasi jumlah iterasi yang diperlukan
        uint maxIterations = haystackLower.length - needleLower.length + 1;
        
        for (uint i = 0; i < maxIterations; i++) {
            bool isMatch = true;
            
            // Periksa karakter per karakter
            for (uint j = 0; j < needleLower.length; j++) {
                if (haystackLower[i + j] != needleLower[j]) {
                    isMatch = false;
                    break; // Berhenti jika ada ketidakcocokan
                }
            }
            
            if (isMatch) return true;
        }
        
        return false;
    }

    // 🔹 Fungsi untuk konversi string ke lowercase
    function toLowerCase(string memory str) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory lowerBytes = new bytes(strBytes.length);
        
        for (uint i = 0; i < strBytes.length; i++) {
            // Cek apakah karakter adalah A-Z (0x41-0x5A)
            if (strBytes[i] >= 0x41 && strBytes[i] <= 0x5A) {
                lowerBytes[i] = bytes1(uint8(strBytes[i]) + 32);
            } else {
                lowerBytes[i] = strBytes[i]; 
            }
        }
        
        return string(lowerBytes);
    }

    // 🔹 Mengambil komentar/testimoni tanaman herbal
    function getPlantComments(uint plantId) public view returns (Comment[] memory) {
        return plantComments[plantId];
    }

    // 🔹 Mengambil semua user yang terdaftar
    function getAllUsers() public view returns (address[] memory) {
        return registeredUsers;
    }
}