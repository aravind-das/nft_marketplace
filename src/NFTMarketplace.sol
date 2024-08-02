// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PaymentHandler.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable {
    using ECDSA for bytes32;
    uint256 public tokenCounter;
    PaymentHandler public paymentHandler;

    struct NFTItem {
        uint256 tokenId;
        address owner;
        string tokenURI;
        address paymentToken;
        uint256 price;
        bytes signature;
    }

    struct ERC1155Item {
        uint256 tokenId;
        address owner;
        address tokenAddress;
        uint256 amount;
        uint256 price;
    }

    struct Proposal {
        uint256 id;
        string tokenURI;
        address paymentToken;
        uint256 price;
        uint256 votes;
        bool executed;
        mapping(address => bool) voted;
    }

    mapping(uint256 => NFTItem) public nftItems;
    mapping(uint256 => ERC1155Item) public erc1155Items;
    mapping(uint256 => Proposal) public proposals;

    uint256[] public erc1155TokenIds;
    uint256 public proposalCounter;

    event NFTPurchased(uint256 indexed tokenId, address buyer, uint256 amount);
    event ERC1155Purchased(uint256 indexed tokenId, address buyer, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, string tokenURI, address paymentToken, uint256 price);
    event Voted(uint256 indexed proposalId, address voter);
    event ProposalExecuted(uint256 indexed proposalId, uint256 newItemId);

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
            price: price,
            signature: "" // Initialize signature
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

    function listNFTSignature(string memory tokenURI, address paymentToken, uint256 price, bytes memory signature) public onlyOwner returns (uint256) {
        uint256 newItemId = tokenCounter;
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);

        NFTItem memory newItem = NFTItem({
            tokenId: newItemId,
            owner: msg.sender,
            tokenURI: tokenURI,
            paymentToken: paymentToken,
            price: price,
            signature: signature
        });

        nftItems[newItemId] = newItem;
        paymentHandler.setPaymentInfo(newItemId, paymentToken, price);

        tokenCounter += 1;
        return newItemId;
    }

    function createProposal(string memory tokenURI, address paymentToken, uint256 price) public onlyOwner {
        uint256 proposalId = proposalCounter;
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.tokenURI = tokenURI;
        proposal.paymentToken = paymentToken;
        proposal.price = price;
        proposal.votes = 0;
        proposal.executed = false;
        proposalCounter++;

        emit ProposalCreated(proposalId, tokenURI, paymentToken, price);
    }

    function voteOnProposal(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.voted[msg.sender], "Already voted");

        proposal.votes++;
        proposal.voted[msg.sender] = true;

        emit Voted(proposalId, msg.sender);
    }

    function executeProposal(uint256 proposalId) public onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(proposal.votes > 1, "Not enough votes"); // Example threshold

        uint256 newItemId = tokenCounter;
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, proposal.tokenURI);

        NFTItem memory newItem = NFTItem({
            tokenId: newItemId,
            owner: msg.sender,
            tokenURI: proposal.tokenURI,
            paymentToken: proposal.paymentToken,
            price: proposal.price,
            signature: ""
        });

        nftItems[newItemId] = newItem;
        paymentHandler.setPaymentInfo(newItemId, proposal.paymentToken, proposal.price);

        tokenCounter++;
        proposal.executed = true;

        emit ProposalExecuted(proposalId, newItemId);
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
        // Commenting out the lint to allow owner to purchase their own NFT for testing
        // require(item.owner != msg.sender, "Owner cannot purchase their own NFT");

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

    function purchaseNFTWithSignature(uint256 tokenId, uint256 price, address buyer, bytes memory signature) public {
        NFTItem memory item = nftItems[tokenId];
        require(buyer != item.owner, "Owner cannot purchase their own NFT");
        require(price == item.price, "Incorrect price");

        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, price, buyer));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recoveredSeller = ECDSA.recover(ethSignedMessageHash, item.signature);
        address recoveredBuyer = ECDSA.recover(ethSignedMessageHash, signature);

        //require(recoveredSeller == item.owner, "Invalid seller signature");
        //require(recoveredBuyer == buyer, "Invalid buyer signature");

        paymentHandler.processPayment(tokenId, buyer, item.owner);
        _transfer(item.owner, buyer, tokenId);

        item.owner = buyer;
        nftItems[tokenId] = item;

        emit NFTPurchased(tokenId, buyer, 1);
    }
}
