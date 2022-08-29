// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

// Import this file to use console.log
import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 amount) external;

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external; // returns (bool);

    /**
     * @dev Moves `amount` tokens from `from` to `to` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external; //returns (bool);
}

contract Lending is Ownable, Pausable, ReentrancyGuard {
    //currency
    IERC20 public currency;

    //track users' data
    mapping(address => uint256) public debt;

    //events
    event Withdraw(address owner, uint256 balance);
    event Borrow(address borrower, uint256 amount);
    event Repay(address repayer, uint256 repayment);

    constructor(address _usdtContract) {
        currency = IERC20(_usdtContract);
    }

    ////
    //main functions
    ////
    function withdraw(uint256 _amount) public onlyOwner {
        require(
            currency.balanceOf(address(this)) >= _amount,
            "not enough balance to withdraw"
        );
        currency.transfer(msg.sender, _amount);
        emit Withdraw(msg.sender, _amount);
    }

    function borrow(uint256 amount) public nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(
            currency.balanceOf(address(this)) >= amount,
            "borrow amoun exceeds contract balance"
        );
        // require(blacklist[msg.sender] != true, "You are blacklisted");
        require(debt[msg.sender] == 0, "You already have borrowed");
        debt[msg.sender] += amount;
        currency.transfer(msg.sender, amount);
        emit Borrow(msg.sender, amount);
    }

    function repay() public nonReentrant whenNotPaused {
        // require(blacklist[msg.sender] != true, "You are blacklisted");
        require(debt[msg.sender] > 0, "You haven't borrowed");
        uint256 repayment = debtAmount(msg.sender);
        require(
            currency.allowance(msg.sender, address(this)) >= repayment,
            "repayment exceeds allowance"
        );
        currency.transferFrom(msg.sender, address(this), repayment);
        debt[msg.sender] = 0;
        emit Repay(msg.sender, repayment);
    }

    ////
    //getter functions
    ////
    function debtAmount(address _borrower) public view returns (uint256) {
        uint256 repayment = debt[_borrower] + (debt[_borrower] / 10);
        return repayment;
    }

    function borrowAmount(address _borrower) public view returns (uint256) {
        return debt[_borrower];
    }

    function interest(address _borrower) public view returns (uint256) {
        uint256 interestAmount = (debt[_borrower] / 10);
        return interestAmount;
    }

    ////
    // Pausable
    ////
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}
