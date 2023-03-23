// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface Oracle {
    function requestCreditDataOf(
        address aPayee
    ) external returns (bytes32 requestId);
}
