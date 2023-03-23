// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface WithdrawXscrow {
  function withdrawOf(address aPayee, bool canWithdraw) external;
}
