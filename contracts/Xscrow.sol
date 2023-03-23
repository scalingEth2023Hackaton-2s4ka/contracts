// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./structures/Balance.sol";
import "./interfaces/Oracle.sol";

contract Xscrow is Ownable, Pausable {
    IERC20 private _token;
    address private _tokenAddress;
    address private _lenderTreasury;
    address private _vendorTreasury;
    address private _oracle;
    string private _identifier;
    uint256 private _depositFee;
    mapping(address => Balance) private _balances;
    event WithdrawSuccessful(address indexed aPayee);
    event WithdrawNotAllowed(address indexed aPayee);
    event Deposit(address indexed aPayee, uint256 anAmount);
    event DepositExecuted(address indexed aPayee, uint256 balance);

    constructor(
        address tokenAddress_,
        address lenderTreasury_,
        address vendorTreasury_,
        string memory identifier_,
        address oracle_
    ) {
        _tokenAddress = tokenAddress_;
        _token = IERC20(_tokenAddress);
        _lenderTreasury = lenderTreasury_;
        _vendorTreasury = vendorTreasury_;
        _identifier = identifier_;
        _oracle = oracle_;
    }

    modifier onlyOracle() {
        require(msg.sender == _oracle, "Caller is not the oracle");
        _;
    }

    function tokenAddress() external view returns (address) {
        return _tokenAddress;
    }

    function lenderTreasury() external view returns (address) {
        return _lenderTreasury;
    }

    function vendorTreasury() external view returns (address) {
        return _vendorTreasury;
    }

    function oracle() external view returns (address) {
        return _oracle;
    }

    function identifier() external view returns (string memory) {
        return _identifier;
    }

    function depositFee() external view returns (uint256) {
        return _depositFee;
    }

    function balanceOf(address aPayee) external view returns (uint256) {
        return _balanceOf(aPayee);
    }

    function deposit(uint256 anAmount) external whenNotPaused {
        uint256 fee = _depositFee * (anAmount / 100);
        uint256 amountToDeposit = anAmount - fee;

        _requireNonZeroAmount(amountToDeposit);
        _setBalanceTo(msg.sender, _balanceOf(msg.sender) + amountToDeposit);
        _transferFrom(msg.sender, address(this), amountToDeposit);
        _transferFrom(msg.sender, address(_vendorTreasury), fee);

        emit Deposit(msg.sender, amountToDeposit);
    }

    function executeDepositOf(address aPayee) external whenNotPaused onlyOwner {
        uint256 balance = _balanceOf(aPayee);
        _requireNonZeroAmount(balance);
        _resetBalanceOf(aPayee);
        _transfer(_lenderTreasury, balance);
        emit DepositExecuted(aPayee, balance);
    }

    function requestWithdraw() external whenNotPaused {
        _requireNonZeroAmount(_balanceOf(msg.sender));
        Oracle(_oracle).requestCreditDataOf(msg.sender);
    }

    function withdrawOf(
        address aPayee,
        bool canWithdraw
    ) public whenNotPaused onlyOracle {
        if (canWithdraw) {
            uint256 balance = _balanceOf(aPayee);
            _requireNonZeroAmount(balance);
            _resetBalanceOf(aPayee);
            _transfer(aPayee, balance);
            emit WithdrawSuccessful(aPayee);
        } else {
            emit WithdrawNotAllowed(aPayee);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _resetBalanceOf(address aPayee) internal {
        _setBalanceTo(aPayee, 0);
    }

    function _setBalanceTo(address aPayee, uint256 anAmount) internal {
        _balances[aPayee].amount = anAmount;
        _balances[aPayee].timestamp = block.timestamp;
    }

    function _balanceOf(address aPayee) internal view returns (uint256) {
        return _balances[aPayee].amount;
    }

    function _transfer(address to, uint256 anAmount) internal {
        SafeERC20.safeTransfer(_token, to, anAmount);
    }

    function _transferFrom(
        address from,
        address to,
        uint256 anAmount
    ) internal {
        SafeERC20.safeTransferFrom(_token, from, to, anAmount);
    }

    function _requireNonZeroAmount(uint256 anAmount) internal pure {
        require(anAmount > 0, "Deposit: amount must be > 0");
    }

    function updateLenderTreasury(address aTreasury) external onlyOwner {
        _lenderTreasury = aTreasury;
    }

    function updateVendorTreasury(address aTreasury) external onlyOwner {
        _vendorTreasury = aTreasury;
    }

    function updateOracle(address anOracle) external onlyOwner {
        _oracle = anOracle;
    }

    function updateDepositFee(uint256 depositFee_) external onlyOwner {
        require(depositFee_ <= 100, "Fee value out-of-bounds");
        _depositFee = depositFee_;
    }
}
