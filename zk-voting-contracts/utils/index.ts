import ethers from "ethers";
const fs = require("fs");
const snarkjs = require("snarkjs");
import keccak256 from "keccak256";

function hashString(str: string) {
  let arr = new TextEncoder().encode(str);
  return "0x" + keccak256(arr.toString()).toString("hex");
}

async function prove(addrBN: BigInt, secretBN: BigInt) {
  return await snarkjs.groth16.fullProve(
    {
      addr: addrBN.toString(),
      secret: secretBN.toString(),
    },
    "/Users/auralshin/artemis/zk-voting-contracts/circuits/artemis_js/artemis.wasm",
    "/Users/auralshin/artemis/zk-voting-contracts/circuits/artemis_js/artemis_0001.zkey"
  );
}

async function passcodeHash(addr: string, password: string) {
  let passcode = hashString(addr.toLowerCase() + password),
    passcodeBN = BigInt(passcode);

  let { proof, publicSignals } = await prove(BigInt(0), passcodeBN);

  // get out from public signals:
  let passcodeHashBN = BigInt(publicSignals[0]);
  return passcodeHashBN;
}

// let hash = await passcodeHash();

// TODO: write hash to contract when create a red packet
async function generateProof(addr: string, password: string, voterAddr: string) {
  let passcode = hashString(addr.toLowerCase() + password),
    passcodeBN = BigInt(passcode);

  let account = voterAddr, // receiver address
    accountBN = BigInt(account),
    secretBN = passcodeBN - accountBN; // passcode = address + secret

  // generate proof:
  let { proof, publicSignals } = await prove(accountBN, secretBN);
  let passcodeHashBN = BigInt(publicSignals[0]);

  // check if out from public signals equals to passcodeHash read from contract:
  // let passcodeHashBNFromContract = await readFromContract(...);
  // if (!passcodeHashBN.eq(passcodeHashBNFromContract)) {
  //     alert('bad password!');
  //     return;
  // }
  // prepare proof for contract call:
  let proofs = [
    proof.pi_a[0],
    proof.pi_a[1],
    // NOTE: the order of proof.pi_b is differ to pi_a and pi_c:
    proof.pi_b[0][1],
    proof.pi_b[0][0],
    proof.pi_b[1][1],
    proof.pi_b[1][0],
    proof.pi_c[0],
    proof.pi_c[1],
  ];
  // convert '12345678' to '0xbc614e':
  for (let i = 0; i < proofs.length; i++) {
    // string -> hex string:
    proofs[i] = "0x" + BigInt(proofs[i]).toString(16);
  }
  return proofs;

  // Optional: call verifyProof() to validate the proof:
  // let r = await contract.verifyProof(
  //         [proofs[0], proofs[1]], // a[2]
  //         [[proofs[2], proofs[3]], [proofs[4], proofs[5]]], // b[2][2]
  //         [proofs[6], proofs[7]], // c[2]
  //         [passcodeHashBN.toString(16), accountBN.toString(16)] // i[2]
  // );
  // if (!r) {
  //     alert('bad proof');
  //     return;
  // }

  // // call contract open():
  // let tx = await contract.open(redPacketId, proofs);
  // await tx.wait(1);
}

export { passcodeHash, generateProof };