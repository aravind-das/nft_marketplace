// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PaymentHandler {
    struct PaymentInfo {
        address paymentToken; // ERC20 token address for payment
        uint256 price;        // Price in ERC20 tokens
    }

    mapping(uint256 => PaymentInfo) public paymentInfos; // { tokenId: paymentToken, price }

    constructor() {}

    function setPaymentInfo(uint256 tokenId, address paymentToken, uint256 price) external {
        paymentInfos[tokenId] = PaymentInfo({
            paymentToken: paymentToken,
            price: price
        });
    }

    function processPayment(uint256 tokenId, address buyer, address recipient) external {
        PaymentInfo memory paymentInfo = paymentInfos[tokenId];
        IERC20 paymentToken = IERC20(paymentInfo.paymentToken);

        // Check sufficient balance to transfer
        require(paymentToken.balanceOf(buyer) >= paymentInfo.price, "Insufficient balance");

        // Check sufficient allowance is configured to transfer
        require(paymentToken.allowance(buyer, address(this)) >= paymentInfo.price, "Insufficient allowance");

        require(paymentToken.transferFrom(buyer, recipient, paymentInfo.price), "Payment failed");
    }
}
