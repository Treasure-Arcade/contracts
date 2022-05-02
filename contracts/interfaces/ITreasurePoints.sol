// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface ITreasurePoints {
    /// @notice Takes a snapshot of current state.
    function snapshot() external;

    /// @notice grants MINTER_ROLE to an address.
    function grantRole(address _to) external;

    /// @notice Allows sender with MINTER_ROLE to mint an amount to an address.
    function mint(address _to, uint256 _amount) external;
}
