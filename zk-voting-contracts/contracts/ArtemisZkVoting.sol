// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Verifier.sol";

contract ArtemisDAOVoting is Ownable, Groth16Verifier, Pausable {
    Groth16Verifier public verifier;

    struct Proposal {
        bytes32 merkleRoot;
        string proposalDescription;
        mapping(bool => uint256) votes; // true: support, false: against
        mapping(bytes32 => bool) voted; // leaf: hasVoted
        uint256 startTime;
        uint256 endTime;
        uint256 quorum; // Expressed as a percentage
        bool hasEnded;
        uint256 passcodeHash;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    // Events
    event ProposalAdded(uint256 proposalId, string description);
    event VoteReceived(uint256 proposalId, bool support);
    event ProposalEnded(
        uint256 proposalId,
        bool achievedQuorum,
        bool supported
    );

    // Custom errors
    error InvalidVote();
    error AlreadyVoted();
    error InvalidZkSnarkProof();
    error InvalidMerkleProof();
    error InvalidProposal();
    error VotingEnded();
    error NotYetStarted();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function addProposal(
        string memory description,
        bytes32 _merkleRoot,
        uint256 duration,
        uint256 _quorum,
        uint256 passcodeHash
    ) external onlyOwner {
        proposalCount += 1;
        proposals[proposalCount].merkleRoot = _merkleRoot;
        proposals[proposalCount].proposalDescription = description;
        proposals[proposalCount].startTime = block.timestamp;
        proposals[proposalCount].endTime = block.timestamp + duration;
        proposals[proposalCount].quorum = _quorum;
        proposals[proposalCount].passcodeHash = passcodeHash;
        emit ProposalAdded(proposalCount, description);
    }

    function getProposal(
        uint256 proposalId
    )
        external
        view
        returns (
            bytes32 merkleRoot,
            string memory proposalDescription,
            uint256 startTime,
            uint256 endTime,
            uint256 quorum,
            uint256 passcodeHash,
            bool hasEnded
        )
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.merkleRoot,
            proposal.proposalDescription,
            proposal.startTime,
            proposal.endTime,
            proposal.quorum,
            proposal.passcodeHash,
            proposal.hasEnded
        );
    }

    function voteForProposal(
        uint256 proposalId,
        bool support,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals,
        bytes32[] calldata merkleProof,
        bytes32 leaf,
        uint256[] memory proof
    ) external whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.merkleRoot != 0, "Invalid proposal.");
        require(!proposal.hasEnded, "Voting has ended for this proposal.");
        require(
            block.timestamp >= proposal.startTime,
            "Voting not yet started."
        );
        require(block.timestamp <= proposal.endTime, "Voting time has ended.");
        require(!proposal.voted[leaf], "Already voted.");

        if (!verifier.verifyProof(_pA, _pB, _pC, _pubSignals)) {
            revert InvalidZkSnarkProof();
        }
        if (!verifyMerkleProof(proposal, merkleProof, leaf)) {
            revert InvalidMerkleProof();
        }
        require(proof.length == 8, "Invalid proof");
        uint256[2] memory a = [proof[0], proof[1]];
        uint256[2][2] memory b = [[proof[2], proof[3]], [proof[4], proof[5]]];
        uint256[2] memory c = [proof[6], proof[7]];
        uint256[2] memory input = [
            proposal.passcodeHash,
            uint256(uint160(msg.sender))
        ];
        require(verifier.verifyProof(a, b, c, input), "Failed verify proof");
        proposal.votes[support] += 1;
        proposal.voted[leaf] = true;
        emit VoteReceived(proposalId, support);
    }

    function endVoting(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(
            block.timestamp > proposal.endTime,
            "Voting period is not yet over."
        );
        require(
            !proposal.hasEnded,
            "Voting has already ended for this proposal."
        );

        proposal.hasEnded = true;

        uint256 totalVotes = proposal.votes[true] + proposal.votes[false];
        bool achievedQuorum = (totalVotes * 100) /
            (proposal.votes[true] + proposal.votes[false] + totalVotes) >=
            proposal.quorum;
        bool isSupported = proposal.votes[true] > proposal.votes[false];

        emit ProposalEnded(proposalId, achievedQuorum, isSupported);
    }

    function verifyMerkleProof(
        Proposal storage proposal,
        bytes32[] memory proof,
        bytes32 leaf
    ) internal view returns (bool) {
        return MerkleProof.verify(proof, proposal.merkleRoot, leaf);
    }

    function pauseVoting() external onlyOwner {
        _pause();
    }

    function resumeVoting() external onlyOwner {
        _unpause();
    }

    function transferContractOwnership(address newOwner) external onlyOwner {
        transferOwnership(newOwner);
    }
}
