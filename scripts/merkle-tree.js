const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { ethers } = require('hardhat');

const whitelistAddresses = [];

// TEST ONLY
ethers.getSigners().then(([owner, addr1]) => {
  console.log(owner.address, addr1.address);
  whitelistAddresses.push(owner.address, addr1.address);
  growMerkleTree();
});

function growMerkleTree() {
  // Hash addresses
  const leafNodes = whitelistAddresses.map((addr) => keccak256(addr));
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

  // // Get rootHash of the merkleTree
  const rootHash = merkleTree.getRoot().toString('hex');
  console.log('RootHash: ', rootHash);
}
growMerkleTree();
