// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyERC1155Token is ERC1155, Ownable {
    constructor(
        string memory uri,
        address initialOwner,
        uint256 initialTokenId,
        uint256 initialAmount
    ) ERC1155(uri) Ownable(msg.sender) {
        // Mint initial tokens
        _mint(initialOwner, initialTokenId, initialAmount, "");
    }

    function mint(address to, uint256 id, uint256 amount) public onlyOwner {
        _mint(to, id, amount, "");
    }
}
