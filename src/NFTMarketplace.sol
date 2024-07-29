// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PaymentHandler.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

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

    struct ERC1155Item {
        uint256 tokenId;
        address owner;
        address tokenAddress;
        uint256 amount;
        uint256 price;
    }

    mapping(uint256 => NFTItem) public nftItems;
    mapping(uint256 => ERC1155Item) public erc1155Items;
    uint256[] public erc1155TokenIds;

    event NFTPurchased(uint256 indexed tokenId, address buyer, uint256 amount);
    event ERC1155Purchased(uint256 indexed tokenId, address buyer, uint256 amount);

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

    function listERC1155(address tokenAddress, uint256 tokenId, uint256 amount, uint256 price) public onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than zero");

        erc1155Items[tokenId] = ERC1155Item({
            tokenId: tokenId,
            owner: msg.sender,
            tokenAddress: tokenAddress,
            amount: amount,
            price: price
        });

        erc1155TokenIds.push(tokenId);
    }

    function fetchAllNFTs() public view returns (NFTItem[] memory, ERC1155Item[] memory) {
        NFTItem[] memory items = new NFTItem[](tokenCounter);
        for (uint256 i = 0; i < tokenCounter; i++) {
            items[i] = nftItems[i];
        }

        ERC1155Item[] memory erc1155ItemArray = new ERC1155Item[](erc1155TokenIds.length);
        for (uint256 i = 0; i < erc1155TokenIds.length; i++) {
            uint256 id = erc1155TokenIds[i];
            erc1155ItemArray[i] = erc1155Items[id];
        }

        return (items, erc1155ItemArray);
    }

    function purchaseNFT(uint256 tokenId) public {
        NFTItem memory item = nftItems[tokenId];
        require(item.owner != msg.sender, "Owner cannot purchase their own NFT");

        paymentHandler.processPayment(tokenId, msg.sender, item.owner);
        _transfer(item.owner, msg.sender, tokenId);

        item.owner = msg.sender;
        nftItems[tokenId] = item;

        emit NFTPurchased(tokenId, msg.sender, 1);
    }

    function purchaseERC1155(uint256 tokenId, uint256 amount) public payable {
        ERC1155Item memory item = erc1155Items[tokenId];
        require(item.owner != address(0), "Item does not exist");
        require(amount > 0 && amount <= item.amount, "Invalid amount");
        uint256 totalPrice = item.price * amount;
        require(msg.value >= totalPrice, "Insufficient ETH sent");

        IERC1155(item.tokenAddress).safeTransferFrom(item.owner, msg.sender, tokenId, amount, "");

        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        item.amount -= amount;
        if (item.amount == 0) {
            delete erc1155Items[tokenId];
        } else {
            erc1155Items[tokenId] = item;
        }

        emit ERC1155Purchased(tokenId, msg.sender, amount);
    }
}
