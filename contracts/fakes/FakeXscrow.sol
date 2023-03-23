// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/Oracle.sol";
import "../interfaces/WithdrawXscrow.sol";

contract FakeXscrow is WithdrawXscrow {
    address private _oracle;
    event WithdrawSuccessful(address aPayee);

    constructor(address oracle_) {
        _oracle = oracle_;
    }

    function requestWithdraw() external {
        Oracle(_oracle).requestCreditDataOf(msg.sender);
    }

    function withdrawOf(address aPayee, bool canWithdraw) public {
        emit WithdrawSuccessful(aPayee);
    }
}
