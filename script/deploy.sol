// script/DeployContracts.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/NFTFactory.sol";
import "../src/PaymentHandler.sol";

contract DeployContracts is Script {
    function run() external {
        vm.startBroadcast();

        PaymentHandler paymentHandler = new PaymentHandler();
        console.log("PaymentHandler deployed to:", address(paymentHandler));


        NFTFactory nftFactory = new NFTFactory();
        console.log("NFTFactory deployed to:", address(nftFactory));

        vm.stopBroadcast();
    }
}
