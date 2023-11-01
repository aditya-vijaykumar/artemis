#!/usr/bin/env bash

echo 'generate witness ONLY for command line test...'
cd circuits/artemis_js

echo -n 'address: '
read addr

echo -n 'secret: '
read secret

echo 'generating witness...'

echo "{ \"addr\": \"$addr\", \"secret\": \"$secret\" }" > input.json

node generate_witness.js artemis.wasm input.json witness.wtns

echo 'generating a proof...'
snarkjs groth16 prove artemis_0001.zkey witness.wtns proof.json public.json

echo 'verify proof...'
snarkjs groth16 verify verification_key.json public.json proof.json

echo 'generate call...'
snarkjs generatecall