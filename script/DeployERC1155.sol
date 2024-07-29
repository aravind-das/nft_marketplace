// script/DeployERC1155.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/MyERC1155Token.sol";

contract DeployERC1155 is Script {
    function run() external {
        vm.startBroadcast();

        // Pass the URI for the metadata, initial owner, token ID, and amount
        MyERC1155Token erc1155 = new MyERC1155Token(
            "https://my-json-server.typicode.com/api/{id}.json",
            msg.sender,
            1, // Initial token ID
            100 // Initial amount of tokens
        );
        console.log("ERC1155 Token deployed to:", address(erc1155));

        vm.stopBroadcast();
    }
}
