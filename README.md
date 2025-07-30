# Herbal Plant Middleware

Middleware layer untuk sistem manajemen tanaman herbal berbasis blockchain yang menghubungkan smart contract Ethereum dengan aplikasi client.

## 📋 Daftar Isi

- [Tentang Project](#tentang-project)
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Project](#struktur-project)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Penggunaan](#penggunaan)
- [API Endpoints](#api-endpoints)
- [Smart Contract](#smart-contract)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Kontribusi](#kontribusi)

## 🌿 Tentang Project

Herbal Plant Middleware adalah layer penghubung antara smart contract HerbalPlant di blockchain dan aplikasi frontend. Sistem ini memungkinkan pengguna untuk mengelola data tanaman herbal secara terdesentralisasi dengan fitur autentikasi, IPFS storage, dan transaction management.

## ✨ Fitur Utama

### Autentikasi & User Management

- ✅ Registrasi user dengan wallet address
- ✅ Login/logout berbasis blockchain
- ✅ JWT token management dengan auto-refresh
- ✅ Password hashing dengan bcrypt

### Manajemen Tanaman Herbal

- ✅ Tambah data tanaman herbal
- ✅ Edit data tanaman (hanya pemilik)
- ✅ Pencarian tanaman (nama, latin, komposisi, manfaat)
- ✅ Rating system (1-5 skala)
- ✅ Like/unlike system
- ✅ Sistem komentar/testimoni
- ✅ Pagination untuk data

### Blockchain Integration

- ✅ Smart contract interaction
- ✅ Transaction preparation (ABI encoding)
- ✅ Transaction history tracking
- ✅ Record management dengan timestamp

### IPFS Storage

- ✅ Upload gambar ke IPFS
- ✅ Retrieve gambar dari IPFS
- ✅ File type validation (hanya gambar)

## 🛠 Teknologi yang Digunakan

- **Backend**: Node.js, Express.js
- **Blockchain**: Web3.js, Truffle Framework
- **Database**: Smart Contract (Ethereum)
- **Storage**: IPFS (InterPlanetary File System)
- **Security**: JWT, bcrypt
- **Development**: Nodemon, Jest

## 📁 Struktur Project

herbal-plant-middleware/
├── contracts/
│ └── HerbalPlant.sol # Smart contract Solidity
├── controllers/
│ ├── authController.js # Logic autentikasi
│ └── plantController.js # Logic manajemen tanaman
├── routes/
│ ├── authRoutes.js # Route autentikasi
│ ├── plantRoutes.js # Route tanaman
│ ├── ipfsRoutes.js # Route IPFS
│ └── index.js # Route utama
├── utils/
│ └── blockchain.js # Utility blockchain connection
├── migrations/
│ └── 1740113486_deploy_herbal_plant.js
├── build/contracts/ # Compiled contracts
├── middleware/
│ ├── jwtMiddleware.js # JWT verification
│ └── optionalAuth.js # Optional authentication
├── .env # Environment variables
├── server.js # Entry point aplikasi
├── package.json # Dependencies
├── truffle-config.js # Truffle configuration
└── nodemon.json # Nodemon configuration

## 🚀 Instalasi

### Prerequisites

- Node.js (v16 atau lebih tinggi)
- npm atau yarn
- Truffle Suite
- IPFS node (local atau remote)
- Ethereum wallet dengan private key

### Langkah Instalasi

1. **Clone repository**
   git clone <repository-url>
   cd herbal-plant-middleware

2. **Install dependencies**
   npm install

3. **Setup environment variables**
   cp .env.example .env

4. **Compile smart contract**
   npm run compile

5. **Deploy smart contract** (jika belum)
   Untuk development (Ganache)
   npm run migrate

Untuk testnet/mainnet
npm run migrate-public

## ⚙️ Konfigurasi

### Environment Variables (.env)

Server Configuration
PORT=5000

Blockchain Configuration
SMART_CONTRACT_ADDRESS=0xYourContractAddress
BLOCKCHAIN_RPC_URL=https://your-rpc-url
ACCOUNT_PRIVATE_KEY=your-private-key

JWT Configuration
JWT_SECRET=your-jwt-secret-key

### IPFS Configuration

Pastikan IPFS node berjalan di `http://172.21.200.103:5001` atau sesuaikan URL di `ipfsRoutes.js`.

## 🎯 Penggunaan

### Menjalankan Development Server

npm run dev

### Menjalankan Production Server

npm start

### Testing

npm test
npm run test:watch

## 📡 API Endpoints

### Authentication

POST /api/auth/register # Registrasi user
POST /api/auth/login # Login user
POST /api/auth/logout # Logout user
GET /api/auth/user/:address # Get user data
GET /api/auth/isLoggedIn # Check login status

### Plant Management

POST /api/plants/add # Tambah tanaman (auth required)
PUT /api/plants/edit/:id # Edit tanaman (auth required)
GET /api/plants/all # Get semua tanaman
GET /api/plants/:id # Get tanaman by ID
GET /api/plants/search # Cari tanaman
POST /api/plants/rate # Rate tanaman (auth required)
POST /api/plants/like # Like tanaman (auth required)
POST /api/plants/comment # Comment tanaman (auth required)
GET /api/plants/:id/comments # Get comments
GET /api/plants/:id/ratings # Get ratings
GET /api/plants/averageRating/:id # Get average rating

### IPFS

POST /api/ipfs/upload # Upload file ke IPFS (auth required)
GET /api/ipfs/getFile/:cid # Download file dari IPFS

### Records & History

GET /api/plants/record/:id # Get plant record
GET /api/plants/records/all # Get all records
GET /api/plants/history/:id # Get transaction history
GET /api/plants/records/count # Get record count
POST /api/plants/record/update-hash # Update record hash

## 📜 Smart Contract

Smart contract `HerbalPlant.sol` menyediakan:

- **User Management**: Registrasi, login, logout
- **Plant Data**: CRUD operations untuk data tanaman
- **Social Features**: Rating, like, comment system
- **Record Keeping**: Transaction history dengan timestamp
- **Search Functionality**: Pencarian berdasarkan multiple criteria

### Key Functions

function registerUser(string memory fullName, string memory hashPass)
function addPlant(...)
function editPlant(...)
function ratePlant(uint plantId, uint rating)
function likePlant(uint plantId)
function commentPlant(uint plantId, string memory comment)
function searchPlants(...)

## 🧪 Testing

Jalankan test suite:
npm test

Test meliputi:

- Unit tests untuk controllers
- Integration tests untuk API endpoints
- Smart contract functionality tests

## 🚢 Deployment

### Deploy ke Production

1. **Setup environment production**
   Set NODE_ENV=production di .env
   NODE_ENV=production

2. **Deploy smart contract ke mainnet**
   npm run migrate-public

3. **Start production server**
   npm start

## 🔧 Troubleshooting

### Common Issues

**1. Smart Contract Connection Error**
Error: Contract not connected properly
**Solution**: Pastikan `SMART_CONTRACT_ADDRESS` dan `BLOCKCHAIN_RPC_URL` benar di `.env`

**2. IPFS Upload Failed**
Error: Failed to add file to IPFS
**Solution**: Pastikan IPFS node berjalan dan accessible

**3. JWT Token Issues**
Error: Token tidak valid
**Solution**: Pastikan `JWT_SECRET` konsisten dan token belum expired

**4. Transaction Preparation Failed**
Error: Gagal mempersiapkan data transaksi
**Solution**: Cek koneksi blockchain dan pastikan user sudah login

### Debugging Tips

1. **Enable detailed logging**
   console.time("Operation Time");
   // your code
   console.timeEnd("Operation Time");

2. **Check blockchain connection**
   curl -X POST -H "Content-Type: application/json"
   --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   YOUR_RPC_URL

3. **Verify contract deployment**
   const { contract } = await initialize();
   console.log("Contract address:", contract.options.address);

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👥 Tim Pengembang

**Kelompok 9**

- Smart Contract Development
- Backend API Development
- IPFS Integration
- Testing & Documentation

## 📞 Support

Jika Anda mengalami masalah atau memiliki pertanyaan:

1. Cek [Troubleshooting](#troubleshooting) section
2. Buka issue di repository
3. Hubungi tim development

---

**Dibuat dengan ❤️ oleh Kelompok TA-2024/2025-09**
