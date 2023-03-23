// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/Oracle.sol";

contract FakeCreditOracle is Oracle {
    bytes32 public testRequestId = "testRequestId";
    event ChainlinkRequested(bytes32 indexed requestId);

    function requestCreditDataOf(
        address aPayee
    ) external returns (bytes32 requestId) {
        emit ChainlinkRequested(testRequestId);
        return testRequestId;
    }
}
