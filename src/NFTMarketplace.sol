// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PaymentHandler.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;
    PaymentHandler public paymentHandler;

    struct NFTItem {
        uint256 tokenId;
        address owner;
        string tokenURI;
        address paymentToken;
        uint256 price;
    }

    mapping(uint256 => NFTItem) public nftItems;

    constructor(string memory name, string memory symbol, address owner, address paymentHandlerAddress)
        ERC721(name, symbol)
        Ownable(owner)
    {
        tokenCounter = 0;
        paymentHandler = PaymentHandler(paymentHandlerAddress);
    }

    function createNFT(string memory tokenURI, address paymentToken, uint256 price) public onlyOwner returns (uint256) {
        uint256 newItemId = tokenCounter;
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);

        NFTItem memory newItem = NFTItem({
            tokenId: newItemId,
            owner: msg.sender,
            tokenURI: tokenURI,
            paymentToken: paymentToken,
            price: price
        });

        nftItems[newItemId] = newItem;
        paymentHandler.setPaymentInfo(newItemId, paymentToken, price);

        tokenCounter += 1;
        return newItemId;
    }

    function fetchAllNFTs() public view returns (NFTItem[] memory) {
        NFTItem[] memory items = new NFTItem[](tokenCounter);
        for (uint256 i = 0; i < tokenCounter; i++) {
            items[i] = nftItems[i];
        }
        return items;
    }

    function purchaseNFT(uint256 tokenId) public {
        NFTItem memory item = nftItems[tokenId];
        // Commenting out the line to allow owner to purchase their own NFT for testing
        // require(msg.sender != item.owner, "Owner cannot purchase their own NFT");

        // Pass the creator's address (owner of the NFT) as the recipient of the payment
        paymentHandler.processPayment(tokenId, msg.sender, item.owner);
        _transfer(item.owner, msg.sender, tokenId);

        // Update the owner of the NFT
        item.owner = msg.sender;
        nftItems[tokenId] = item;
    }
}
