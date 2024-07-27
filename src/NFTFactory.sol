// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./NFTMarketplace.sol";

contract NFTFactory is Ownable {
    address[] public nftCollections;

    event CollectionCreated(address indexed owner, address collection);

    constructor() Ownable(msg.sender) {}

    function createCollection(string memory name, string memory symbol, address paymentHandlerAddress) external onlyOwner {
        NFTMarketplace collection = new NFTMarketplace(name, symbol, msg.sender, paymentHandlerAddress);
        nftCollections.push(address(collection));
        emit CollectionCreated(msg.sender, address(collection));
    }

    function getCollections() external view returns (address[] memory) {
        return nftCollections;
    }
}
