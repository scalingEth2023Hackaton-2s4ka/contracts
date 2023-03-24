// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./Xscrow.sol";
import "./CreditOracle.sol";
import "./structures/XscrowProduct.sol";

contract XscrowFactory {
    address private _linkTokenAddress;
    address private _operator;
    bytes32 private _jobId;

    event Deployed(address indexed owner, uint id, XscrowProduct xscrowProduct_);

    mapping(address => XscrowProduct[]) _xscrowProducts;

    constructor(address linkTokenAddress_, address operator_, bytes32 jobId_) {
        _linkTokenAddress = linkTokenAddress_;
        _operator = operator_;
        _jobId = jobId_;
    }

    function create(
        string memory identifier_,
        address tokenAddress_,
        address lenderTreasury_,
        address vendorTreasury_,
        string memory apiUrl_
    ) public {
        CreditOracle oracle = new CreditOracle(_linkTokenAddress, _operator, _jobId, apiUrl_);
        Xscrow xscrow = new Xscrow(tokenAddress_, lenderTreasury_, vendorTreasury_, identifier_, address(oracle));

        oracle.updateXscrow(address(xscrow));
        oracle.transferOwnership(msg.sender);
        xscrow.transferOwnership(msg.sender);

        XscrowProduct[] storage xscrowProducts = _xscrowProducts[msg.sender];
        xscrowProducts.push(
          XscrowProduct(
            address(xscrow),
            address(oracle),
            block.timestamp
         )
        );
        uint256 id =  xscrowProducts.length - 1;

        emit Deployed(msg.sender, id, _xscrowProducts[msg.sender][id]);
    }

    function xscrowProduct(address owner_, uint index_) view public returns (XscrowProduct memory) {
      return _xscrowProducts[owner_][index_];
    }
}
