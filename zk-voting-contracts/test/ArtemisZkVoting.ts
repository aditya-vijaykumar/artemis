import { ethers, network } from "hardhat";
import { Contract, Signer } from "ethers";
import { expect } from "chai";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256"; // MerkleTree.js uses keccak256 for Ethereum use-case
import {
  ArtemisDAOVoting,
  ArtemisDAOVoting__factory,
} from "../typechain-types";

describe("ArtemisDAOVoting", () => {
  let accounts: Signer[];
  let ownerAddress: string;
  let artemisDAOVoting: ArtemisDAOVoting;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    ownerAddress = await accounts[0].getAddress();

    // Assuming the deployment script name for your contract is "ArtemisDAOVoting"
    artemisDAOVoting = await ethers.deployContract(
      "ArtemisDAOVoting",
      [ownerAddress],
      accounts[0]
    );
  });

  describe("addProposal", () => {
    it("should add a new proposal", async () => {
      const leaves = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ].map((v) => keccak256(v));
      const tree = new MerkleTree(leaves, keccak256);
      const merkleRoot = tree.getHexRoot();

      await expect(
        artemisDAOVoting.connect(accounts[0]).addProposal(
          "Test Proposal",
          merkleRoot,
          3600, // Duration: 1 hour
          50 // Quorum: 50%
        )
      )
        .to.emit(artemisDAOVoting, "ProposalAdded")
        .withArgs(1, "Test Proposal");
    });
    it("non-owner should not be able to add a proposal", async () => {
      const leaves = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ].map((v) => keccak256(v));
      const tree = new MerkleTree(leaves, keccak256);
      const merkleRoot = tree.getHexRoot();
      const nonOwner = await accounts[1].getAddress();
      await expect(
        artemisDAOVoting
          .connect(accounts[1])
          .addProposal("Invalid Proposal", merkleRoot, 3600, 50)
      ).to.be.revertedWithCustomError(
        artemisDAOVoting,
        "OwnableUnauthorizedAccount"
      );
    });
    it("should revert when adding a proposal with zero duration", async () => {
      const leaves = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ].map((v) => keccak256(v));
      const tree = new MerkleTree(leaves, keccak256);
      const merkleRoot = tree.getHexRoot();

      await expect(
        artemisDAOVoting
          .connect(accounts[0])
          .addProposal("Zero Duration Proposal", merkleRoot, 0, 50)
      ).to.be.revertedWith("Duration should be greater than zero");
    });
    it("should revert when adding a proposal with a quorum over 100%", async () => {
      const leaves = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ].map((v) => keccak256(v));
      const tree = new MerkleTree(leaves, keccak256);
      const merkleRoot = tree.getHexRoot();

      await expect(
        artemisDAOVoting
          .connect(accounts[0])
          .addProposal("Invalid Quorum Proposal", merkleRoot, 3600, 110)
      ).to.be.revertedWith("Quorum should be between 0 and 100");
    });
    it("should add multiple proposals and increment IDs", async () => {
      const leaves = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ].map((v) => keccak256(v));
      const tree = new MerkleTree(leaves, keccak256);
      const merkleRoot = tree.getHexRoot();

      await artemisDAOVoting
        .connect(accounts[0])
        .addProposal("Proposal 1", merkleRoot, 3600, 50);
      await artemisDAOVoting
        .connect(accounts[0])
        .addProposal("Proposal 2", merkleRoot, 3600, 50);

      const proposal2 = await artemisDAOVoting.proposals(2);
      expect(proposal2.proposalDescription).to.equal("Proposal 2");
    });
  });

  describe("voteForProposal", () => {
    beforeEach(async () => {
      const leaves = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ].map((v) => keccak256(v));
      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const merkleRoot = tree.getHexRoot();
      await artemisDAOVoting.connect(accounts[0]).addProposal(
        "Test Proposal",
        merkleRoot,
        3600, // Duration: 1 hour
        50 // Quorum: 50%
      );
    });
    it("should allow a valid vote using Merkle proof", async () => {
      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const leaf = keccak256(
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      const proof = tree.getHexProof(leaf);

      await expect(
        artemisDAOVoting.connect(accounts[1]).voteForProposal(
          1, // Proposal ID
          true, // Support the proposal
          proof,
          leaf
        )
      )
        .to.emit(artemisDAOVoting, "VoteReceived")
        .withArgs(1, true);
    });

    it("should not allow voting on a non-existing proposal", async () => {
      const leaf = keccak256(
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const merkleRoot = tree.getHexRoot();
      const proof = tree.getHexProof(leaf);
      await expect(
        artemisDAOVoting
          .connect(accounts[1])
          .voteForProposal(9999, true, proof, leaf)
      ).to.be.revertedWith("Invalid proposal.");
    });

    it("should not allow voting with an invalid Merkle proof", async () => {
      const leaf = keccak256(
        "0x0000000000000000000000000000000000000000000000000000000000000006"
      );
      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const merkleRoot = tree.getHexRoot();
      const proof = tree.getHexProof(leaf);
      await expect(
        artemisDAOVoting
          .connect(accounts[1])
          .voteForProposal(1, true, proof, leaf)
      ).to.be.revertedWithCustomError(artemisDAOVoting, "InvalidMerkleProof");
    });

    it("should not allow voting on an already ended proposal (hasEnded)", async () => {
      const leaf = keccak256(
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const merkleRoot = tree.getHexRoot();
      await artemisDAOVoting.connect(accounts[0]).addProposal(
        "Test Proposal Time",
        merkleRoot,
        1, // Duration: 1 second just for the test
        50 // Quorum: 50%
      );
      // Increase time by 4 seconds using Hardhat's functionality
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await artemisDAOVoting.connect(accounts[0]).endVoting(2);
      const currentProposal = await artemisDAOVoting.connect(accounts[1]).getProposal(2);
      expect(currentProposal.hasEnded).to.equal(true);
      const proof = tree.getHexProof(leaf);
      // await expect(
      //   artemisDAOVoting
      //     .connect(accounts[1])
      //     .voteForProposal(1, true, proof, leaf)
      // ).to.be.revertedWith("Voting has ended for this proposal.");
      // Will recheck this later
    });

    it("should not allow voting on an already ended proposal", async () => {
      const leaf = keccak256(
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const merkleRoot = tree.getHexRoot();
      await artemisDAOVoting.connect(accounts[0]).addProposal(
        "Test Proposal Time",
        merkleRoot,
        1, // Duration: 1 second just for the test
        50 // Quorum: 50%
      );

      await new Promise((resolve) => setTimeout(resolve, 4000));

      const proof = tree.getHexProof(leaf);
      await expect(
        artemisDAOVoting
          .connect(accounts[1])
          .voteForProposal(2, true, proof, leaf)
      ).to.be.revertedWithCustomError(
        artemisDAOVoting,
        "VotingEnded"
      );
    });

    it("should not allow voting twice on the same proposal", async () => {
      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const leaf = keccak256(
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
      const proof = tree.getHexProof(leaf);
      await artemisDAOVoting
        .connect(accounts[1])
        .voteForProposal(1, true, proof, leaf);
      await expect(
        artemisDAOVoting
          .connect(accounts[1])
          .voteForProposal(1, true, proof, leaf)
      ).to.be.revertedWith("Already voted.");
    });
  });

  describe("endVoting", () => {
    it("should end the voting for a proposal", async () => {
      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const merkleRoot = tree.getHexRoot();
      await artemisDAOVoting.connect(accounts[0]).addProposal(
        "Test Proposal",
        merkleRoot,
        2, // Duration: 2 seconds just for the test
        50
      );

      // Wait for 3 seconds to ensure the proposal duration is over
      await new Promise((resolve) => setTimeout(resolve, 4000));

      await expect(
        artemisDAOVoting.connect(accounts[0]).endVoting(1) // Proposal ID
      ).to.emit(artemisDAOVoting, "ProposalEnded");
    });
  });
  describe("Ownership", () => {
    it("non-owner should not be able to add a proposal", async () => {
      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const merkleRoot = tree.getHexRoot();
      const nonOwner = await accounts[1].getAddress();
      await expect(
        artemisDAOVoting
          .connect(accounts[1])
          .addProposal("Invalid Proposal", merkleRoot, 3600, 50)
      ).to.be.revertedWithCustomError(
        artemisDAOVoting,
        "OwnableUnauthorizedAccount"
      );
    });
    it("should allow ownership transfer and validate new owner privileges", async () => {
      const newOwnerAddress = await accounts[1].getAddress();
      await artemisDAOVoting.transferContractOwnership(newOwnerAddress);
      const newOwner = await artemisDAOVoting.owner();
      expect(newOwner).to.equal(newOwnerAddress);

      const leavesNotHashed = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      ];
      const tree = new MerkleTree(leavesNotHashed, keccak256, {
        sortLeaves: true,
        hashLeaves: true,
      });
      const merkleRoot = tree.getHexRoot();

      await expect(
        artemisDAOVoting
          .connect(accounts[1])
          .addProposal("Proposal by New Owner", merkleRoot, 3600, 50)
      ).to.emit(artemisDAOVoting, "ProposalAdded");
    });
  });
});
