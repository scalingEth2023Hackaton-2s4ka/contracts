// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/WithdrawXscrow.sol";

contract CreditOracle is ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;
    address private _linkToken;
    address private _operator;
    address private _xscrow;
    bytes32 private _jobId;
    uint256 private fee;
    string private _apiUrl;
    mapping(bytes32 => address) private _payees;

    event DataFulfilled(address indexed aPayee, bool canWithdraw);

    constructor(
        address linkToken_,
        address operator_,
        bytes32 jobId_,
        string memory apiUrl_
    ) {
        _linkToken = linkToken_;
        _operator = operator_;
        _jobId = jobId_;
        _apiUrl = apiUrl_;
        setChainlinkToken(_linkToken);
        fee = (1 * LINK_DIVISIBILITY) / 10;
    }

    function xscrow() external view returns (address) {
        return _xscrow;
    }

    function apiUrl() external view onlyOwner returns (string memory) {
        return _apiUrl;
    }

    function jobId() external view onlyOwner returns (bytes32) {
        return _jobId;
    }

    function operator() external view onlyOwner returns (address) {
        return _operator;
    }

    function requestCreditDataOf(
        address aPayee
    ) external returns (bytes32 requestId) {
        require(msg.sender == _xscrow, "Caller is not the xscrow");
        Chainlink.Request memory req = buildChainlinkRequest(
            _jobId,
            address(this),
            this.fulfill.selector
        );

        req.add("get", _url(aPayee));
        req.add("path", "allowed");

        bytes32 reqId = sendChainlinkRequestTo(_operator, req, fee);
        _payees[reqId] = aPayee;
        return reqId;
    }

    function _url(address address_) private view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    _apiUrl,
                    Strings.toHexString(uint256(uint160(address_)), 20)
                )
            );
    }

    function fulfill(
        bytes32 requestId,
        bool canWithdraw
    ) public recordChainlinkFulfillment(requestId) {
        address aPayee = _payees[requestId];
        emit DataFulfilled(aPayee, canWithdraw);
        WithdrawXscrow(_xscrow).withdrawOf(aPayee, canWithdraw);
        delete _payees[requestId];
    }

    function withdrawLink() external onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        link.transfer(msg.sender, link.balanceOf(address(this)));
    }

    function updateApiUrl(string memory anApiUrl) external onlyOwner {
        _apiUrl = anApiUrl;
    }

    function updateXscrow(address aXscrow) external onlyOwner {
        _xscrow = aXscrow;
    }

    function updateJobId(bytes32 aJobId) external onlyOwner {
        _jobId = aJobId;
    }

    function updateOperator(address anOperator) external onlyOwner {
        _operator = anOperator;
    }
}
