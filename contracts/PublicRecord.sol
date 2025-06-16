// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicRecord {
    struct PlantRecord {
        string ganacheTxHash;    // Transaction hash dari Ganache
        uint256 plantId;         // ID tanaman dari Ganache
        address userAddress;     // Address user yang menambahkan
        uint256 timestamp;       // Waktu penyimpanan
    }
    
    mapping(uint256 => PlantRecord) public plantRecords;
    uint256 public recordCount;
    
    event PlantRecordAdded(
        uint256 indexed recordId,
        string ganacheTxHash,
        uint256 plantId,
        address userAddress,
        uint256 timestamp
    );
    
    function addPlantRecord(
        string memory ganacheTxHash,
        uint256 plantId,
        address userAddress
    ) public {
        plantRecords[recordCount] = PlantRecord({
            ganacheTxHash: ganacheTxHash,
            plantId: plantId,
            userAddress: userAddress,
            timestamp: block.timestamp
        });
        
        emit PlantRecordAdded(
            recordCount,
            ganacheTxHash,
            plantId,
            userAddress,
            block.timestamp
        );
        
        recordCount++;
    }
    
    function getPlantRecord(uint256 recordId) public view returns (
        string memory ganacheTxHash,
        uint256 plantId,
        address userAddress,
        uint256 timestamp
    ) {
        PlantRecord memory record = plantRecords[recordId];
        return (
            record.ganacheTxHash,
            record.plantId,
            record.userAddress,
            record.timestamp
        );
    }
}
