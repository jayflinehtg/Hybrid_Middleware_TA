// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicRecord {
    address public owner;

    struct PlantRecord {
        string privateTxHash;
        uint256 plantId;
        address userAddress; 
        uint256 timestamp; 
    }
    
    mapping(uint256 => PlantRecord) public plantRecords;
    uint256 public recordCount;
    
    event PlantRecordAdded(
        uint256 indexed recordId,
        string privateTxHash,
        uint256 plantId,
        address userAddress,
        uint256 timestamp
    );
    event PlantRecordUpdated(uint256 indexed recordId, string txHash);

    constructor() {
        owner = msg.sender;
    }
    
    function addPlantRecord(
        string memory privateTxHash,
        uint256 plantId,
        address userAddress
    ) public {
        plantRecords[recordCount] = PlantRecord({
            privateTxHash: privateTxHash,
            plantId: plantId,
            userAddress: userAddress,
            timestamp: block.timestamp
        });
        
        emit PlantRecordAdded(
            recordCount,
            privateTxHash,
            plantId,
            userAddress,
            block.timestamp
        );
        
        recordCount++;
    }

    // Update Transaction Hash
    function updatePlantRecordHash(uint256 recordId, string memory txHash) public {
        require(recordId < recordCount, "Record tidak ditemukan");
        require(
            plantRecords[recordId].userAddress == msg.sender || msg.sender == owner, 
            "Hanya pemilik record atau owner yang dapat update"
        );
        
        plantRecords[recordId].privateTxHash = txHash;
        emit PlantRecordUpdated(recordId, txHash);
    }
    
    function getPlantRecord(uint256 recordId) public view returns (
        string memory privateTxHash,
        uint256 plantId,
        address userAddress,
        uint256 timestamp
    ) {
        PlantRecord memory record = plantRecords[recordId];
        return (
            record.privateTxHash,
            record.plantId,
            record.userAddress,
            record.timestamp
        );
    }
}
