// src/NFTMarketplace.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    constructor() ERC721("NFTMarketplace", "NFTM") Ownable(msg.sender) {}

    function createNFT(string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 newItemId = _tokenIds;
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
        _tokenIds += 1;
        return newItemId;
    }
}
