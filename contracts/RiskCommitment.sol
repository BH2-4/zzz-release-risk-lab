// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RiskCommitment
/// @notice Records a scenario hash and coarse risk band on Injective EVM Testnet.
/// @dev The bounded test-INJ value is a verification pulse and is refunded in the same transaction.
contract RiskCommitment {
    uint256 constant MIN_VERIFICATION_VALUE = 0.001 ether;
    uint256 constant MAX_VERIFICATION_VALUE = 0.1 ether;

    bool private refunding;

    error InvalidRiskBand();
    error InvalidScenarioHash();
    error InvalidVerificationValue();
    error RefundFailed();
    error ReentrantCall();

    event RiskCommitted(
        address indexed committer,
        bytes32 indexed scenarioHash,
        uint8 riskBand,
        uint256 verificationValue,
        uint256 timestamp
    );

    function commitRisk(bytes32 scenarioHash, uint8 riskBand) external payable {
        if (refunding) revert ReentrantCall();
        if (scenarioHash == bytes32(0)) revert InvalidScenarioHash();
        if (riskBand < 1 || riskBand > 5) revert InvalidRiskBand();
        if (msg.value < MIN_VERIFICATION_VALUE || msg.value > MAX_VERIFICATION_VALUE) {
            revert InvalidVerificationValue();
        }

        emit RiskCommitted(msg.sender, scenarioHash, riskBand, msg.value, block.timestamp);

        refunding = true;
        (bool refunded, ) = payable(msg.sender).call{value: msg.value}("");
        refunding = false;
        if (!refunded) revert RefundFailed();
    }
}
