// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicRecord {
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
